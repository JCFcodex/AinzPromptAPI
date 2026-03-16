import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { env } from "@config";

const standardMessage = {
  error: {
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
    details: null,
  },
};

/** Rate limiter for chat and stream endpoints (RPM-based). */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_RPM,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardMessage,
});

/** Stricter rate limiter for upload endpoints. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_UPLOAD_RPM,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardMessage,
});

// ── Token-Aware Rate Limiting ────────────────────────────────────────────────

const TOKEN_BUDGET_PER_MINUTE = 100_000; // 100K tokens per IP per minute
const tokenUsage = new Map<string, { tokens: number; resetAt: number }>();

/**
 * Estimate the number of tokens in a message payload.
 * Uses the ~4 chars per token heuristic.
 */
function estimateTokens(body: Record<string, unknown>): number {
  const message = body.message as string | undefined;
  const content = body.content as unknown[] | undefined;
  const system = body.system as string | undefined;

  let charCount = 0;
  if (message) charCount += message.length;
  if (system) charCount += system.length;
  if (content) charCount += JSON.stringify(content).length;

  return Math.ceil(charCount / 4);
}

/**
 * Token-aware rate limiter middleware.
 * Tracks estimated token usage per IP with a sliding 1-minute window.
 */
export function tokenRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? "unknown";
  const now = Date.now();

  let usage = tokenUsage.get(ip);

  // Reset if window expired
  if (!usage || now >= usage.resetAt) {
    usage = { tokens: 0, resetAt: now + 60_000 };
    tokenUsage.set(ip, usage);
  }

  const estimated = estimateTokens(req.body ?? {});
  const remaining = TOKEN_BUDGET_PER_MINUTE - usage.tokens;

  // Set informational headers
  res.setHeader("X-Token-Budget-Remaining", Math.max(0, remaining - estimated));
  res.setHeader("X-Token-Budget-Limit", TOKEN_BUDGET_PER_MINUTE);

  if (usage.tokens + estimated > TOKEN_BUDGET_PER_MINUTE) {
    const retryAfterMs = usage.resetAt - now;
    res.setHeader("Retry-After", Math.ceil(retryAfterMs / 1000));

    res.status(429).json({
      error: {
        code: "TOKEN_RATE_LIMITED",
        message: `Token budget exceeded. Estimated ${estimated} tokens, but only ${Math.max(0, remaining)} remain. Resets in ${Math.ceil(retryAfterMs / 1000)}s.`,
        details: {
          estimatedTokens: estimated,
          budgetRemaining: Math.max(0, remaining),
          budgetLimit: TOKEN_BUDGET_PER_MINUTE,
          resetsInSeconds: Math.ceil(retryAfterMs / 1000),
        },
      },
    });
    return;
  }

  usage.tokens += estimated;
  next();
}

// Clean up expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, usage] of tokenUsage) {
    if (now >= usage.resetAt) tokenUsage.delete(ip);
  }
}, 120_000).unref();
