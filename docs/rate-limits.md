# Rate Limits

## Gateway-Level Limits

| Limiter | Limit | Scope | Header |
|---------|-------|-------|--------|
| **RPM** | 60 req/min | Per-IP | `Retry-After` |
| **Token Budget** | 100,000 tokens/min | Per-IP | `X-Token-Budget-Remaining` |

## Groq Upstream Limits

Groq enforces per-key limits that vary by model:

| Model | RPM | RPD | TPM | TPD |
|-------|-----|-----|-----|-----|
| `llama-3.3-70b-versatile` | 30 | 1,000 | 12,000 | 100,000 |
| `llama-3.1-8b-instant` | 30 | 1,000 | 20,000 | 200,000 |

With **N** keys in `GROQ_API_KEYS`, multiply limits by N. Example: 2 keys = ~60 RPM, ~24K TPM.

## How Rate Limiting Works

1. **RPM limiter** counts requests per IP per minute
2. **Token limiter** estimates tokens from payload size (`chars / 4`)
3. If either limit is exceeded → `429` with `Retry-After` header
4. The circuit breaker tracks per-key health separately

## When You Hit Limits

```
HTTP 429 Too Many Requests
Retry-After: 15
X-Token-Budget-Remaining: 0
X-Token-Budget-Limit: 100000
```

**What to do:**
1. Read the `Retry-After` header
2. Wait that many seconds
3. Retry the request
