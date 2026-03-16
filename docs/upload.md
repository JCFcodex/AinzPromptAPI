# File Upload

Direct image file uploads via `multipart/form-data` — the most practical method for browser file inputs and mobile apps.

## Upload Pipeline

1. Client sends `multipart/form-data` POST with image + text message
2. Multer parses the request and holds the image in memory
3. Sharp compresses the image if it exceeds the safe base64 limit
4. Buffer is converted to a base64 data URI and sent to Groq

## `POST /api/chat/upload`

Single image upload.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Image file (JPEG, PNG, GIF, WebP) |
| `message` | string | Yes | Text prompt for the image |
| `sessionId` | string | No | UUID for conversation memory |
| `system` | string | No | System prompt |

### cURL Example

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat/upload \
  -F "image=@./receipt.jpg" \
  -F "message=Extract the total amount from this receipt" \
  -F "sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

## `POST /api/chat/upload/multiple`

Up to **5 images** in one request.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | file[] | Yes | Up to 5 image files |
| `message` | string | Yes | Text prompt |
| `sessionId` | string | No | Session UUID |

### cURL Example

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat/upload/multiple \
  -F "images=@./before.jpg" \
  -F "images=@./after.jpg" \
  -F "message=Compare these two images" \
  -F "sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

## Upload Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_FILE` | 400 | No image attached |
| `MISSING_MESSAGE` | 400 | No text prompt provided |
| `REQUEST_TOO_LARGE` | 413 | Image exceeds 4MB limit |
| `TOO_MANY_FILES` | 400 | More than 5 images |
| `INVALID_FILE_TYPE` | 400 | Unsupported image format |

> [!TIP]
> **Never set** `Content-Type: application/json` when sending FormData. Let the browser set it automatically — it includes the multipart boundary that Multer requires.
