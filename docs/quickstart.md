# Quick Start

Get a response in under 30 seconds — copy and paste directly into your terminal.

## Blocking Chat Completion

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the capital of France?",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "model": "llama-3.3-70b-versatile"
  }'
```

**Response:**

```json
{
  "reply": "The capital of France is Paris.",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "model": "llama-3.3-70b-versatile",
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 9,
    "total_tokens": 33
  }
}
```

## SSE Streaming

```bash
curl -N -X POST https://ainzpromptapi.onrender.com/api/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing in simple terms",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://ainzpromptapi.onrender.com` |
| Local | `http://localhost:3000` |
| Playground | `https://ainzpromptapi.onrender.com` (serves the UI) |

## Request Format

All endpoints accept `application/json` (except file upload which uses `multipart/form-data`).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes* | The user's text message |
| `content` | array | Yes* | Content blocks for vision (replaces `message`) |
| `sessionId` | string | No | UUID for conversation memory |
| `model` | string | No | Groq model ID (default: `llama-3.3-70b-versatile`) |
| `system` | string | No | System prompt override |

> **Note:** Either `message` or `content` is required, not both.
