/**
 * Observability — Per-request metrics and aggregate counters.
 */

export interface RequestMetric {
  timestamp: number;
  key: string; // masked
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  status: "ok" | "cached" | "queued" | number; // HTTP status on error
  cached: boolean;
}

interface AggregateMetrics {
  totalRequests: number;
  totalErrors: number;
  totalCacheHits: number;
  totalTokensUsed: number;
  avgLatencyMs: number;
  recentRequests: RequestMetric[];
}

const MAX_RECENT = 100;
const recentMetrics: RequestMetric[] = [];

let totalRequests = 0;
let totalErrors = 0;
let totalCacheHits = 0;
let totalTokensUsed = 0;
let totalLatency = 0;

/** Mask an API key for safe logging: gsk_***last4 */
export function maskKey(key: string): string {
  if (key.length <= 8) return "gsk_***";
  return `gsk_***${key.slice(-4)}`;
}

/** Record a completed request metric. */
export function recordMetric(metric: RequestMetric): void {
  totalRequests++;
  totalLatency += metric.latencyMs;
  if (metric.totalTokens) totalTokensUsed += metric.totalTokens;
  if (metric.cached) totalCacheHits++;
  if (typeof metric.status === "number" && metric.status >= 400) totalErrors++;

  recentMetrics.push(metric);
  if (recentMetrics.length > MAX_RECENT) recentMetrics.shift();
}

/** Get aggregate metrics snapshot. */
export function getMetrics(): AggregateMetrics {
  return {
    totalRequests,
    totalErrors,
    totalCacheHits,
    totalTokensUsed,
    avgLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
    recentRequests: [...recentMetrics].reverse().slice(0, 20),
  };
}

/** Reset all metrics (for testing). */
export function resetMetrics(): void {
  totalRequests = 0;
  totalErrors = 0;
  totalCacheHits = 0;
  totalTokensUsed = 0;
  totalLatency = 0;
  recentMetrics.length = 0;
}
