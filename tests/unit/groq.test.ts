import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @config
vi.mock("@config", () => ({
  env: {
    PORT: 3000,
    NODE_ENV: "test",
    GROQ_API_KEYS: ["gsk_test_key_1", "gsk_test_key_2"],
    SESSION_TTL_MINUTES: 30,
    RATE_LIMIT_RPM: 60,
    RATE_LIMIT_UPLOAD_RPM: 20,
    CORS_ORIGIN: "*",
    LOG_LEVEL: "info",
  },
}));

import { callGroq, streamGroq } from "../../src/lib/groq.js";
import { resetAll as resetCircuitBreakers } from "../../src/lib/circuitBreaker.js";
import { resetMetrics } from "../../src/lib/metrics.js";
import { clearCache } from "../../src/lib/responseCache.js";
import { clearQueue } from "../../src/lib/requestQueue.js";

/** Helper to build a mock Response with headers */
function mockResponse(overrides: {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  body?: ReadableStream | null;
  headers?: Record<string, string>;
}) {
  const headers = new Map(Object.entries(overrides.headers ?? {}));
  return {
    ok: overrides.ok,
    status: overrides.status ?? (overrides.ok ? 200 : 500),
    json: overrides.json ?? (() => Promise.resolve({})),
    body: overrides.body ?? null,
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
  };
}

const mockGroqResponse = {
  id: "chatcmpl-test",
  object: "chat.completion",
  created: 1234567890,
  model: "llama-3.3-70b-versatile",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Hello from Groq!" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

describe("groq.ts - callGroq", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetCircuitBreakers();
    resetMetrics();
    clearCache();
    try { clearQueue(); } catch { /* ignore */ }
  });

  it("returns a parsed GroqResponse on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          ok: true,
          json: () => Promise.resolve(mockGroqResponse),
        }),
      ),
    );

    const result = await callGroq("llama-3.3-70b-versatile", [
      { role: "user", content: "Hi" },
    ]);

    expect(result.choices[0].message.content).toBe("Hello from Groq!");
    expect(result.usage.total_tokens).toBe(15);
  });

  it("retries on 429 with backoff and succeeds with next attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: { message: "Rate limited" } }),
          headers: { "retry-after": "0" }, // instant retry for testing
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: () => Promise.resolve(mockGroqResponse),
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await callGroq("llama-3.3-70b-versatile", [
      { role: "user", content: "Hi" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.choices[0].message.content).toBe("Hello from Groq!");
  });

  it("retries on 500/502/503 (transient server errors)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 502,
          json: () => Promise.resolve({ error: { message: "Bad Gateway" } }),
          headers: { "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: () => Promise.resolve(mockGroqResponse),
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await callGroq("llama-3.3-70b-versatile", [
      { role: "user", content: "Hi" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.choices[0].message.content).toBe("Hello from Groq!");
  });

  it("throws immediately on non-retryable errors (400)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Invalid model" } }),
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callGroq("invalid-model", [{ role: "user", content: "Hi" }]),
    ).rejects.toThrow("Invalid model");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns cached response on second identical call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        json: () => Promise.resolve(mockGroqResponse),
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const messages = [{ role: "user" as const, content: "cached test" }];
    await callGroq("llama-3.3-70b-versatile", messages);
    const second = await callGroq("llama-3.3-70b-versatile", messages);

    // Only 1 fetch — second call should be cached
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.choices[0].message.content).toBe("Hello from Groq!");
  });
});

describe("groq.ts - streamGroq", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetCircuitBreakers();
    resetMetrics();
    clearCache();
    try { clearQueue(); } catch { /* ignore */ }
  });

  it("returns a ReadableStream on success", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          ok: true,
          body: mockStream,
        }),
      ),
    );

    const stream = await streamGroq("llama-3.3-70b-versatile", [
      { role: "user", content: "Hi" },
    ]);

    expect(stream).toBeInstanceOf(ReadableStream);
  });
});
