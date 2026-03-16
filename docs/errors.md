# Error Handling

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "MISSING_MESSAGE",
    "message": "The 'message' field is required in the request body.",
    "details": null
  }
}
```

## Error Code Reference

| Code | Status | Description | Retryable? |
|------|--------|-------------|------------|
| `VALIDATION_ERROR` | 400 | Invalid request body | ❌ Fix request |
| `MISSING_MESSAGE` | 400 | No `message` or `content` provided | ❌ |
| `MISSING_FILE` | 400 | No image in upload request | ❌ |
| `INVALID_FILE_TYPE` | 400 | Unsupported image format | ❌ |
| `TOO_MANY_FILES` | 400 | More than 5 images | ❌ |
| `REQUEST_TOO_LARGE` | 413 | Image exceeds 4MB | ❌ |
| `RATE_LIMITED` | 429 | RPM limit exceeded | ✅ After `Retry-After` |
| `TOKEN_RATE_LIMITED` | 429 | Token budget exceeded | ✅ After `Retry-After` |
| `ALL_KEYS_EXHAUSTED` | 429 | All Groq keys rate-limited | ✅ Wait ~60s |
| `INTERNAL_ERROR` | 500 | Groq upstream error or server fault | ✅ With backoff |

## Retry Strategy

- **Retryable errors:** `429`, `500`, `502`, `503`
- **Backoff:** Exponential with jitter — `2^attempt × 1000ms + random(500ms)`
- **Max retries:** 3 attempts
- **Non-retryable:** `400` errors — fix the request first

## Rate Limit Headers

When rate-limited, responses include helpful headers:

| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds until you can retry |
| `X-Token-Budget-Remaining` | Remaining token budget for your IP |
| `X-Token-Budget-Limit` | Total token budget per minute |

## Webhooks & Events

AinzPromptAPI **does not support webhooks**. For real-time output, use `POST /api/stream` with SSE.
