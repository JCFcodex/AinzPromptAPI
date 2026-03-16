# Authentication

## No Authentication Required

**AinzPromptAPI requires NO authentication.** There are no API keys, Bearer tokens, OAuth flows, or headers needed from the caller.

- **Method:** None — public access
- **Setup:** No credentials to obtain. Simply send HTTP requests.
- **Usage:** No `Authorization` header required. Omit it entirely.

Groq API keys are managed exclusively server-side via the `GROQ_API_KEYS` environment variable and are never exposed to consumers.

> [!WARNING]
> Because AinzPromptAPI has no authentication layer, it is open to potential abuse. If you self-host this gateway for production at scale, consider adding `express-rate-limit` middleware, IP allowlisting, or an API key layer to protect against misuse.

## Token Management

Since AinzPromptAPI itself has no token-based auth, token management refers to **Groq's upstream limits**. Groq enforces tokens-per-minute (TPM) and tokens-per-day (TPD) limits on each API key.

AinzPromptAPI's key rotation aggregates these limits across all keys in `GROQ_API_KEYS`. For example, with 2 keys each rated at 12K TPM, the gateway effectively achieves ~24K TPM combined.

When a key hits its limit (Groq returns `429`), the gateway rotates to the next key transparently.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `429 ALL_KEYS_EXHAUSTED` | All Groq keys rate-limited | Add more keys or wait ~60s |
| Empty/stale response | Session too long, approaching context limit | Start new `sessionId` |
| SSE stream cuts off | Render 30s idle timeout | Implement keep-alive pings |
| CORS errors from browser | Missing CORS origin config | Configure `cors()` middleware |
