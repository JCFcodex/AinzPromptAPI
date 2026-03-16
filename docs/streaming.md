# SSE Streaming

## `POST /api/stream`

Real-time SSE streaming — streams tokens as server-sent events as Groq generates them. Delivers dramatically lower perceived latency.

**Auth:** None (public)

### Request Body

Same shape as `/api/chat`:

```json
{
  "message": "Explain recursion step by step",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "model": "llama-3.3-70b-versatile"
}
```

### Response

**Content-Type:** `text/event-stream`

```
data: The
data:  capital
data:  of
data:  France
data:  is
data:  Paris
data: .
data: [DONE]
```

### SSE Event Format

| Event | Description |
|-------|-------------|
| `data: <token>` | A token chunk from the model |
| `data: [DONE]` | Stream completed successfully |
| `data: [ERROR] <message>` | Error during streaming |

- Events are unnamed (plain `data:` lines with no `event:` field)
- Clients should listen for `message` events or read the raw byte stream
- Conversation memory is updated server-side after the full response is assembled

### Metadata Headers

The first SSE frame includes session metadata:

```
data: {"type":"meta","sessionId":"f47ac10b-...","model":"llama-3.3-70b-versatile"}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400` | Invalid request body |
| `429` | Rate limited |
| `500` | Server error |

### Polling Alternative

If SSE is not feasible (e.g., serverless platforms or proxies that block long-lived connections), use `POST /api/chat` instead. It buffers the full response before returning, at the cost of higher perceived latency.
