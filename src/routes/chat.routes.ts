import { Router } from "express";
import {
  chatController,
  streamController,
  uploadSingleController,
  uploadMultipleController,
} from "@controllers";
import { validate, uploadSingle, uploadMultiple, chatLimiter, uploadLimiter, tokenRateLimiter } from "@middleware";
import { ChatBodySchema, UploadBodySchema } from "@schemas";
import { getMetrics, getCacheStats, getQueueStats, getHealthSnapshot, maskKey } from "@lib";

const router = Router();

// Chat + Stream: RPM limiter → token limiter → validate → controller
router.post("/chat", chatLimiter, tokenRateLimiter, validate(ChatBodySchema), chatController);
router.post("/stream", chatLimiter, tokenRateLimiter, validate(ChatBodySchema), streamController);
router.post(
  "/chat/upload",
  uploadLimiter,
  uploadSingle,
  validate(UploadBodySchema),
  uploadSingleController,
);
router.post(
  "/chat/upload/multiple",
  uploadLimiter,
  uploadMultiple,
  validate(UploadBodySchema),
  uploadMultipleController,
);

// ── Observability endpoint ───────────────────────────────────────────────────

router.get("/metrics", (_req, res) => {
  const metrics = getMetrics();
  const cache = getCacheStats();
  const queue = getQueueStats();

  // Map circuit breaker health with masked keys
  const keys: Record<string, unknown> = {};
  for (const [key, health] of getHealthSnapshot()) {
    keys[maskKey(key)] = {
      state: health.state,
      failures: health.failures,
      totalRequests: health.totalRequests,
      totalFailures: health.totalFailures,
    };
  }

  res.json({
    requests: {
      total: metrics.totalRequests,
      errors: metrics.totalErrors,
      cacheHits: metrics.totalCacheHits,
      avgLatencyMs: metrics.avgLatencyMs,
    },
    tokens: {
      totalUsed: metrics.totalTokensUsed,
    },
    cache,
    queue,
    keys,
    recentRequests: metrics.recentRequests,
  });
});

export default router;
