# Advanced Patterns

AinzPromptAPI implements 7 production-grade resilience patterns used by industry leaders like Portkey, Bifrost, and LiteLLM.

## Circuit Breaker

Per-API-key health tracking with three states:

| State | Behavior |
|-------|----------|
| **CLOSED** | Normal operation, requests flow through |
| **OPEN** | Key disabled after 3 consecutive failures, 30s cooldown |
| **HALF_OPEN** | After cooldown, allows one probe request |

- Failure threshold: 3 consecutive errors
- Cooldown period: 30 seconds
- Sliding window: 60 seconds for failure counting

## Exponential Backoff with Jitter

Transient errors (`429`, `500`, `502`, `503`) trigger automatic retries:

```
delay = min(2^attempt × 1000ms + random(0-500ms), 30000ms)
```

- Max retries: 3
- Respects `Retry-After` header when present (takes priority over backoff)
- Max delay cap: 30 seconds

## Semantic Response Cache

In-memory LRU cache for non-streaming responses:

| Setting | Value |
|---------|-------|
| Max entries | 200 |
| TTL | 5 minutes |
| Cache key | SHA-256 of `model + messages` |
| Skip conditions | Images, `temperature > 0`, streaming |

## Request Queuing

When all API keys are unavailable, requests are buffered instead of immediately rejected:

| Setting | Value |
|---------|-------|
| Max queue size | 50 requests |
| Max wait time | 30 seconds |
| Drain trigger | Key becomes HALF_OPEN or CLOSED |
| Full queue response | `503 Service Unavailable` |

## Token-Aware Rate Limiting

Beyond simple RPM counting, limits are enforced by estimated token usage:

- Token estimation: `characters / 4`
- Budget: 100,000 tokens/minute per IP
- Informational headers: `X-Token-Budget-Remaining`, `X-Token-Budget-Limit`

## Observability & Metrics

See the [Metrics API](metrics.md) page for details on the `GET /api/metrics` endpoint.
