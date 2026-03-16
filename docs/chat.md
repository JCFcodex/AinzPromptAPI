# Chat Completions

## `POST /api/chat`

Blocking chat completion — returns the assistant's full response in a single JSON payload.

**Auth:** None (public)

### Request Body

```json
{
  "message": "What are the benefits of TypeScript?",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "model": "llama-3.3-70b-versatile",
  "system": "You are a helpful coding assistant"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes* | The user's text message |
| `content` | ContentBlock[] | Yes* | Array of content blocks (for vision) |
| `sessionId` | string | No | UUID for conversation continuity |
| `model` | string | No | Groq model ID |
| `system` | string | No | System prompt |

> *Either `message` or `content` is required.

### Response `200`

```json
{
  "reply": "TypeScript adds static type checking to JavaScript...",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "model": "llama-3.3-70b-versatile",
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 142,
    "total_tokens": 166
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing `message` field or invalid body |
| `429` | `ALL_KEYS_EXHAUSTED` | All Groq API keys rate-limited |
| `429` | `TOKEN_RATE_LIMITED` | Per-IP token budget exceeded |
| `500` | `INTERNAL_ERROR` | Groq upstream error or server fault |

### Available Models

| Model | Context Window | Best For |
|-------|---------------|----------|
| `llama-3.3-70b-versatile` | 128K tokens | General purpose (default) |
| `llama-3.1-8b-instant` | 131K tokens | Fast responses |
| `meta-llama/llama-4-scout-17b-16e-instruct` | 128K tokens | Vision / image understanding |
