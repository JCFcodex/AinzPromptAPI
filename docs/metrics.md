# Metrics API

## `GET /api/metrics`

Real-time observability endpoint exposing request statistics, cache status, queue info, and circuit breaker health.

**Auth:** None (public)

### Response

```json
{
  "requests": {
    "total": 142,
    "errors": 3,
    "cacheHits": 28,
    "totalTokens": 45230,
    "avgLatencyMs": 1250
  },
  "cache": {
    "size": 45,
    "maxSize": 200
  },
  "queue": {
    "size": 0,
    "maxSize": 50,
    "totalQueued": 5,
    "totalTimedOut": 0
  },
  "keys": [
    {
      "key": "gsk_***ab12",
      "state": "CLOSED",
      "failures": 0,
      "lastFailure": null
    }
  ],
  "recentRequests": [
    {
      "timestamp": "2025-03-16T12:30:00.000Z",
      "latencyMs": 980,
      "tokens": 156,
      "status": 200,
      "cached": false,
      "key": "gsk_***ab12"
    }
  ]
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `requests.total` | Total requests processed |
| `requests.errors` | Total error responses |
| `requests.cacheHits` | Responses served from cache |
| `requests.totalTokens` | Total tokens consumed |
| `requests.avgLatencyMs` | Average response latency |
| `cache.size` | Current cached responses |
| `queue.size` | Currently queued requests |
| `keys[].state` | Circuit breaker state per key |
| `keys[].key` | Masked API key (`gsk_***last4`) |

> [!TIP]
> Use this endpoint to monitor your gateway's health — track error rates, cache hit ratios, and identify unhealthy API keys.
