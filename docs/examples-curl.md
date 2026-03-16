# cURL Examples

## Blocking Chat

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the benefits of TypeScript over JavaScript?",
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "model": "llama-3.3-70b-versatile"
  }'
```

## SSE Streaming

```bash
curl -N -X POST https://ainzpromptapi.onrender.com/api/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Write a haiku about programming",
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

## Vision — Image URL

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": [
      { "type": "text", "text": "What is in this image?" },
      { "type": "image_url", "image_url": { "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg" } }
    ],
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

## Single Image Upload

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat/upload \
  -F "image=@./receipt.jpg" \
  -F "message=Extract the total amount" \
  -F "sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

## Multiple Image Upload

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat/upload/multiple \
  -F "images=@./before.jpg" \
  -F "images=@./after.jpg" \
  -F "message=Compare these images" \
  -F "sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

## Health Check

```bash
curl https://ainzpromptapi.onrender.com/health
```

## Metrics

```bash
curl https://ainzpromptapi.onrender.com/api/metrics
```
