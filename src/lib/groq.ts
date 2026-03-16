import { env } from "@config";
import type { SessionMessage, GroqResponse } from "@types";
import {
  getHealthyKey,
  reportSuccess,
  reportFailure,
} from "./circuitBreaker.js";
import { makeCacheKey, getCachedResponse, setCachedResponse, isCacheable } from "./responseCache.js";
import { recordMetric, maskKey } from "./metrics.js";
import { enqueue, drainOne } from "./requestQueue.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Retry config ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);

/**
 * Calculate backoff delay with jitter, or use Retry-After header if available.
 */
function getBackoffDelay(attempt: number, res: Response): number {
  const retryAfter = res.headers.get("Retry-After");

  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return Math.min(seconds * 1000, MAX_DELAY_MS);
  }

  // Exponential backoff with jitter
  const exponential = Math.pow(2, attempt) * BASE_DELAY_MS;
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, MAX_DELAY_MS);
}

/**
 * Shared retry logic for both blocking and streaming requests.
 */
async function fetchWithResilience(
  body: Record<string, unknown>,
): Promise<Response> {
  const keys = env.GROQ_API_KEYS;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const apiKey = getHealthyKey(keys);

    // All keys are circuit-broken — enqueue and wait
    if (!apiKey) {
      await enqueue();
      // After dequeue, try again from the top
      return fetchWithResilience(body);
    }

    const start = Date.now();
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (res.ok) {
      reportSuccess(apiKey);
      // Drain one queued request since we have a healthy key
      drainOne();
      return res;
    }

    // Record failure metric
    recordMetric({
      timestamp: Date.now(),
      key: maskKey(apiKey),
      model: body.model as string,
      latencyMs,
      status: res.status,
      cached: false,
    });

    // Report failure to circuit breaker
    reportFailure(apiKey);

    // Retryable errors — backoff and try again
    if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES - 1) {
      const delay = getBackoffDelay(attempt, res);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    // Non-retryable or final attempt — throw
    const errBody = await res
      .json()
      .catch(() => ({ error: { message: res.statusText } }));

    if (res.status === 429) {
      const error = new Error(
        "ALL_KEYS_EXHAUSTED: All Groq API keys are rate-limited. Try again later.",
      );
      (error as any).status = 429;
      throw error;
    }

    const error = new Error(
      errBody.error?.message ?? `Groq returned ${res.status}`,
    );
    (error as any).status = res.status;
    throw error;
  }

  const error = new Error("MAX_RETRIES_EXCEEDED");
  (error as any).status = 502;
  throw error;
}

// ── Blocking completion ──────────────────────────────────────────────────────

export async function callGroq(
  model: string,
  messages: SessionMessage[],
): Promise<GroqResponse> {
  // Check cache first
  const cacheable = isCacheable(messages);
  if (cacheable) {
    const cacheKey = makeCacheKey(model, messages);
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      recordMetric({
        timestamp: Date.now(),
        key: "cache",
        model,
        latencyMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: "cached",
        cached: true,
      });
      return cached;
    }
  }

  const start = Date.now();
  const res = await fetchWithResilience({ model, messages });
  const data = (await res.json()) as GroqResponse;
  const latencyMs = Date.now() - start;

  // Record success metric
  recordMetric({
    timestamp: Date.now(),
    key: maskKey(res.headers.get("x-request-id") ?? "unknown"),
    model,
    latencyMs,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
    status: "ok",
    cached: false,
  });

  // Cache the response
  if (cacheable) {
    const cacheKey = makeCacheKey(model, messages);
    setCachedResponse(cacheKey, data);
  }

  return data;
}

// ── Streaming completion ─────────────────────────────────────────────────────

export async function streamGroq(
  model: string,
  messages: SessionMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const start = Date.now();
  const res = await fetchWithResilience({ model, messages, stream: true });
  const latencyMs = Date.now() - start;

  recordMetric({
    timestamp: Date.now(),
    key: maskKey(res.headers.get("x-request-id") ?? "unknown"),
    model,
    latencyMs,
    status: "ok",
    cached: false,
  });

  return res.body!;
}
