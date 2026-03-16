# AinzPromptAPI — API Documentation

## API Overview

AinzPromptAPI is a production-grade, intelligent LLM proxy gateway built on Node.js/Express and deployed on Render. It wraps the Groq API behind two clean HTTP endpoints, handles intelligent multi-key rotation across multiple Groq API keys, provides both blocking and real-time SSE-streaming chat completions, and maintains server-side conversation memory via session IDs — all without requiring any authentication from the caller.

Instead of managing Groq keys, building memory state, or handling rate-limit recovery yourself, you point your application at AinzPromptAPI and start chatting. It is designed for developers building chatbots, AI assistants, customer-support agents, and any application that needs fast, multi-turn LLM access with zero infrastructure overhead.

### Purpose

AinzPromptAPI solves four critical problems for developers integrating with large language models:

1. **Abstracts Groq API key management and rotation** — Callers never see, store, or rotate raw Groq keys. The gateway loads multiple keys from the `GROQ_API_KEYS` environment variable and handles round-robin cycling and automatic failover on `429` rate-limit responses.

2. **Provides built-in conversation memory** — Multi-turn chats work out of the box. Pass a `sessionId` with your request and the server stores, injects, and manages the full message history for you.

3. **Exposes two clean endpoints** — `POST /api/chat` for blocking JSON responses and `POST /api/stream` for real-time SSE token streaming, covering both synchronous and progressive-rendering use cases.

4. **Production-deployed and fully public** — Deployed on Render with no authentication layer. Any HTTP client can call the API immediately — no sign-up, no API key provisioning, no Bearer tokens.

**Primary consumers:** Frontend developers, bot builders, integration developers, and anyone who wants fast LLM access without managing infrastructure.

### Architecture

**Available Groq Models (2025):**

### Core Capabilities

- **Blocking Chat Completion** (`POST /api/chat`): Send a message and receive the assistant's full response as a single JSON object. Ideal for server-to-server calls and simple integrations.

- **Real-Time SSE Streaming** (`POST /api/stream`): Stream tokens as server-sent events the moment Groq generates them. Delivers dramatically lower perceived latency for end users.

- **Conversation Memory**: Pass a `sessionId` to maintain multi-turn context automatically. The server stores all prior messages and injects them into every upstream Groq request.

- **Intelligent API Key Rotation**: Multiple Groq keys loaded from `GROQ_API_KEYS` are cycled to spread load. When one key hits its rate limit, the gateway transparently rotates to the next.

- **Model Selection**: Specify which Groq model to use per request via the `model` field. Defaults to `llama-3.3-70b-versatile` when omitted.

---

## Authentication

### Methods

**AinzPromptAPI requires NO authentication.** There are no API keys, Bearer tokens, OAuth flows, or headers needed from the caller. Every endpoint is fully public.

- **Method**: None — public access

- **Setup**: No credentials to obtain. Simply send HTTP requests.

- **Usage**: No `Authorization` header required. Omit it entirely.

Groq API keys are managed exclusively server-side via the `GROQ_API_KEYS` environment variable on Render and are never exposed to consumers.

> **Security Consideration:** Because AinzPromptAPI has no authentication layer, it is open to potential abuse. If you self-host this gateway for production at scale, consider adding `express-rate-limit` middleware, IP allowlisting, or an API key layer to protect against misuse.

### Quick Start

Get a response in under 30 seconds — copy and paste directly into your terminal:

**Blocking chat completion:**

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What is the capital of France?",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "model": "llama-3.3-70b-versatile"
  }'

```

**SSE streaming:**

```bash
curl -N -X POST https://ainzpromptapi.onrender.com/api/stream \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Explain quantum computing in simple terms",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'

```

### Token Management

Since AinzPromptAPI itself has no token-based auth, token management refers to **Groq's upstream limits**. Groq enforces tokens-per-minute (TPM) and tokens-per-day (TPD) limits on each API key.

AinzPromptAPI's key rotation aggregates these limits across all keys in `GROQ_API_KEYS`. For example, with 2 keys each rated at 12K TPM for `llama-3.3-70b-versatile`, the gateway effectively achieves \~24K TPM combined.

When a key hits its limit (Groq returns `429`), the gateway rotates to the next key transparently. Conversation memory accumulates tokens over time — very long sessions consume more tokens per request. Plan for session TTL or manual session clearing to manage token consumption.

### Common Issues

- `429` **from gateway (ALL_KEYS_EXHAUSTED):** All Groq keys hit their rate limits simultaneously. **Fix:** Add more keys to `GROQ_API_KEYS` or wait for the Groq reset window (typically 60 seconds).

- **Empty or stale response:** Session memory has grown too long, approaching the model's context window limit. **Fix:** Start a new `sessionId` or switch to a model with a larger context window (`llama-3.1-8b-instant` supports 131K tokens).

- **SSE stream cuts off prematurely:** Render free-tier enforces a 30-second idle timeout on HTTP connections. **Fix:** Implement keep-alive pings or upgrade your Render plan.

- **CORS errors from browser:** The Express server must have CORS middleware enabled for your frontend's origin. **Fix:** Ensure `cors()` middleware is configured in the server, or set `Access-Control-Allow-Origin` appropriately.

---

## Endpoints

### Chat Completions

POST /api/chat

Blocking chat completion — returns the assistant's full response in a single JSON payload.

**Auth:** None (public)

**Request Body (JSON):**

**Response** `200` **(JSON):**

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

**Error Responses:**

- `400` — Missing `message` field or invalid model ID

- `429` — All Groq API keys rate-limited

- `500` — Groq upstream error or server fault

---

POST /api/stream

Real-time SSE streaming — streams tokens as server-sent events as Groq generates them.

**Auth:** None (public)

**Request Body (JSON):** Same shape as `/api/chat` — `{ message, sessionId, model, system }`

## Vision & Image Understanding

AinzPromptAPI supports multimodal image understanding powered by Groq's vision-capable model. You can send images alongside text in any request to `POST /api/chat` or `POST /api/stream`, and the model will analyze, describe, or reason about the visual content.

### Supported Vision Model

> **Important:** You must explicitly set `"model": "meta-llama/llama-4-scout-17b-16e-instruct"` in your request body to enable vision. Text-only models (`llama-3.3-70b-versatile`, etc.) will return an error if you include image inputs.

### Image Input Limits

Groq enforces the following hard limits on image inputs. Requests that exceed these will be rejected before the model is invoked.

Supported image formats: JPEG, PNG, GIF, WebP.

### How to Send Images

Images are passed inside the `content` field of the user message. Instead of a plain string, `content` becomes an array of content objects — each either a `"text"` block or an `"image_url"` block.

There are two ways to provide an image:

**Method 1 — Image URL (recommended):** Pass a publicly accessible URL to the image.

**Method 2 — Base64 Encoded (local images):** Encode the image as a base64 string and pass it as a data URI.

### POST /api/chat — Vision Request

**Auth:** None (public)

**Request Body (JSON) — with image URL:**

```
{
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "content": \[
    {
      "type": "text",
      "text": "What is in this image?"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
      }
    }
  \]
}

```

**Request Body (JSON) — with base64 encoded image:**

```
{
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "content": \[
    {
      "type": "text",
      "text": "Describe this image in detail."
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."
      }
    }
  \]
}

```

Request Body Fields for Vision:

**Response** `200` **(JSON):**

```
{
  "reply": "The image shows a microprocessor die photograph revealing the intricate circuit layout and transistor arrays on a silicon wafer.",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "usage": {
    "prompt_tokens": 1042,
    "completion_tokens": 48,
    "total_tokens": 1090
  }
}

```

### Multi-Image Requests

You can include up to **5 images** in a single request. Add multiple `image_url` blocks to the `content` array:

```
{
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "content": \[
    { "type": "text", "text": "Compare these two images and describe the differences." },
    { "type": "image_url", "image_url": { "url": "https://example.com/image1.jpg" } },
    { "type": "image_url", "image_url": { "url": "https://example.com/image2.jpg" } }
  \]
}

```

### Vision Code Examples

cURL — Image from URL

```
curl -X POST https://ainzpromptapi.onrender.com/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "content": \[
      { "type": "text", "text": "What is in this image?" },
      { "type": "image_url", "image_url": { "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg" } }
    \]
  }'

```

JavaScript / TypeScript — Image from URL

```
const response = await fetch("https://ainzpromptapi.onrender.com/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    sessionId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    content: \[
      { type: "text", text: "Describe what you see in this image." },
      {
        type: "image_url",
        image_url: {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg",
        },
      },
    \],
  }),
});

const data = await response.json();
console.log(data.reply);

```

JavaScript / TypeScript — Base64 Local Image

```
const fs = require("fs");

// Read and encode image to base64
const imageBuffer = fs.readFileSync("./photo.jpg");
const base64Image = imageBuffer.toString("base64");

const response = await fetch("https://ainzpromptapi.onrender.com/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    sessionId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    content: \[
      { type: "text", text: "Extract all text visible in this image (OCR)." },
      {
        type: "image_url",
        image_url: {
          url: \`data:image/jpeg;base64,${base64Image}\`,
        },
      },
    \],
  }),
});

const data = await response.json();
console.log(data.reply);

```

Python — Image from URL

```
import requests

response = requests.post(
    "https://ainzpromptapi.onrender.com/api/chat",
    json={
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "content": \[
            {"type": "text", "text": "What objects are in this image?"},
            {
                "type": "image_url",
                "image_url": {
                    "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg"
                },
            },
        \],
    },
)
data = response.json()
print(data\["reply"\])

```

Python — Base64 Local Image

```
import requests
import base64

# Encode local image
with open("invoice.jpg", "rb") as f:
    base64_image = base64.b64encode(f.read()).decode("utf-8")

response = requests.post(
    "https://ainzpromptapi.onrender.com/api/chat",
    json={
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "content": \[
            {"type": "text", "text": "Extract the invoice total, date, and vendor name from this image."},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_image}"
                },
            },
        \],
    },
)
print(response.json()\["reply"\])

```

### Vision + Conversation Memory

Vision requests participate in conversation memory exactly like text turns. The `content` array (including image references) is stored in the session history under the user's turn. On subsequent requests with the same `sessionId`, the model retains the full context of what was previously discussed about the image.

```
const SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const BASE_URL = "https://ainzpromptapi.onrender.com";

// Turn 1 — send image
await fetch(\`${BASE_URL}/api/chat\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    sessionId: SESSION_ID,
    content: \[
      { type: "text", text: "What city is shown in this photo?" },
      { type: "image_url", image_url: { url: "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg" } },
    \],
  }),
});

// Turn 2 — follow-up text only, model still remembers the image
const followUp = await fetch(\`${BASE_URL}/api/chat\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    sessionId: SESSION_ID,
    message: "What is that city known for?",
  }),
});
const data = await followUp.json();
console.log(data.reply); // Responds with context from the image

```

### Vision Error Codes

### Vision Use Cases

The `meta-llama/llama-4-scout-17b-16e-instruct` model is well-suited for:

- **OCR / text extraction** — Extract text from receipts, invoices, screenshots, and scanned documents

- **Visual Q&A** — Answer questions about what appears in a photo

- **Image captioning** — Generate descriptive captions for product photos, accessibility alt text, or content moderation

- **Chart and diagram analysis** — Interpret data visualizations, graphs, and infographics

- **Multi-turn visual conversations** — Have extended back-and-forth discussions about an image using `sessionId`

- **Multilingual image analysis** — Describe images in 12 supported languages

## File Upload (Multipart)

In addition to passing images as URLs or base64 strings in a JSON body, AinzPromptAPI supports direct image file uploads via `multipart/form-data`. This is the most practical method for browser file inputs, mobile apps, and any client that has a local file but no public URL.

The upload pipeline works as follows:

1. Client sends a `multipart/form-data` POST with the image file and a text `message` field

2. Multer parses the request and holds the image in memory as a `Buffer` — no disk writes

3. Sharp optionally compresses the image if it is close to Groq's 4MB base64 limit

4. The buffer is converted to a base64 data URI and injected into the vision content array

5. The request is forwarded to Groq exactly as if the caller had sent base64 manually

### Server Dependencies

Install the required packages:

```
npm install multer sharp
```

- **multer** — parses `multipart/form-data` and exposes uploaded files as in-memory buffers

- **sharp** — high-performance image processing; used here for compression before the base64 limit is hit

### Step 1 — Multer Configuration (`middleware/upload.js`)

Use `memoryStorage` so files live in RAM as buffers. Never use disk storage on Render — the filesystem is ephemeral and writes add unnecessary latency.

```
import multer from "multer";

const ALLOWED_MIME_TYPES = \[
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
\];

// 4MB raw — after base64 encoding (\~33% overhead) this approaches Groq's 4MB base64 limit.
// Sharp compression runs before encoding, so we allow up to 4MB raw here.
const MAX_FILE_SIZE = 4 \* 1024 \* 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        \`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, GIF, WebP.\`
      ),
      false
    );
  }
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("image"); // field name: "image"

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Groq's hard limit: 5 images per request
  },
}).array("images", 5); // field name: "images", max 5 files
```

### Step 2 — Sharp Compression Middleware (`middleware/compress.js`)

Base64 encoding inflates file size by \~33%. A 3MB JPEG becomes \~4MB after encoding — right at Groq's limit. Sharp compresses the buffer before encoding to keep the request safely under the wire.

```
import sharp from "sharp";

const BASE64_SAFE_LIMIT = 2.8 \* 1024 \* 1024; // 2.8MB raw = \~3.7MB base64 — safely under 4MB

// Compress a single file buffer if it exceeds the safe limit
export async function compressIfNeeded(file) {
  if (file.buffer.length <= BASE64_SAFE_LIMIT) {
    return file; // already small enough, skip compression
  }

  const compressed = await sharp(file.buffer)
    .resize({ width: 1920, withoutEnlargement: true }) // cap width at 1920px
    .jpeg({ quality: 75 }) // convert to JPEG at 75% quality
    .toBuffer();

  return {
    ...file,
    buffer: compressed,
    mimetype: "image/jpeg",
  };
}

// Compress all files in an array
export async function compressAll(files) {
  return Promise.all(files.map(compressIfNeeded));
}
```

### Step 3 — Single Image Upload Endpoint (`POST /api/chat/upload`)

Accepts one image file and a text message. Returns the same JSON shape as `POST /api/chat`.

**Auth:** None (public)

**Content-Type:** `multipart/form-data`

**Form Fields:**

```
import express from "express";
import crypto from "crypto";
import { uploadSingle } from "../middleware/upload.js";
import { compressIfNeeded } from "../middleware/compress.js";

const router = express.Router();

router.post("/api/chat/upload", (req, res, next) => {
  uploadSingle(req, res, async (err) => {
    // Handle Multer errors inline so we can return structured JSON
    if (err) return handleUploadError(err, res);

    if (!req.file) {
      return res.status(400).json({
        error: {
          code: "MISSING_FILE",
          message: "Include an image in the 'image' form field.",
        },
      });
    }

    const { message, sessionId, system } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: {
          code: "MISSING_MESSAGE",
          message: "Include a 'message' field describing what to do with the image.",
        },
      });
    }

    try {
      // Compress if needed, then encode to base64 data URI
      const processed = await compressIfNeeded(req.file);
      const base64 = processed.buffer.toString("base64");
      const dataUri = \`data:${processed.mimetype};base64,${base64}\`;

      // Build vision content array
      const userContent = \[
        { type: "text", text: message },
        { type: "image_url", image_url: { url: dataUri } },
      \];

      // Session memory
      const sid = sessionId || crypto.randomUUID();
      if (!sessions.has(sid)) sessions.set(sid, \[\]);
      const history = sessions.get(sid);
      history.push({ role: "user", content: userContent });

      const messages = \[
        ...(system ? \[{ role: "system", content: system }\] : \[\]),
        ...history,
      \];

      // Call Groq — vision model always required for image input
      const apiKey = getNextKey();
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: \`Bearer ${apiKey}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages,
          }),
        }
      );

      const data = await groqRes.json();
      if (!groqRes.ok) return res.status(groqRes.status).json({ error: data.error });

      const reply = data.choices\[0\].message.content;
      history.push({ role: "assistant", content: reply });

      return res.json({
        reply,
        sessionId: sid,
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        usage: data.usage,
      });
    } catch (err) {
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: err.message },
      });
    }
  });
});
```

### Step 4 — Multiple Image Upload Endpoint (`POST /api/chat/upload/multiple`)

Accepts up to **5 image files** in one request. All images are compressed if needed, then combined into a single multi-image content array sent to Groq.

**Auth:** None (public)

**Content-Type:** `multipart/form-data`

**Form Fields:**

```
router.post("/api/chat/upload/multiple", (req, res, next) => {
  uploadMultiple(req, res, async (err) => {
    if (err) return handleUploadError(err, res);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: {
          code: "MISSING_FILES",
          message: "Include at least one image in the 'images' form field.",
        },
      });
    }

    const { message, sessionId, system } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: {
          code: "MISSING_MESSAGE",
          message: "Include a 'message' field.",
        },
      });
    }

    try {
      // Compress all files in parallel, then encode
      const { compressAll } = await import("../middleware/compress.js");
      const processed = await compressAll(req.files);

      const imageBlocks = processed.map((file) => {
        const base64 = file.buffer.toString("base64");
        const dataUri = \`data:${file.mimetype};base64,${base64}\`;
        return { type: "image_url", image_url: { url: dataUri } };
      });

      // Text block first, then all image blocks
      const userContent = \[
        { type: "text", text: message },
        ...imageBlocks,
      \];

      const sid = sessionId || crypto.randomUUID();
      if (!sessions.has(sid)) sessions.set(sid, \[\]);
      const history = sessions.get(sid);
      history.push({ role: "user", content: userContent });

      const messages = \[
        ...(system ? \[{ role: "system", content: system }\] : \[\]),
        ...history,
      \];

      const apiKey = getNextKey();
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: \`Bearer ${apiKey}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages,
          }),
        }
      );

      const data = await groqRes.json();
      if (!groqRes.ok) return res.status(groqRes.status).json({ error: data.error });

      const reply = data.choices\[0\].message.content;
      history.push({ role: "assistant", content: reply });

      return res.json({
        reply,
        sessionId: sid,
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        imagesProcessed: processed.length,
        usage: data.usage,
      });
    } catch (err) {
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: err.message },
      });
    }
  });
});
```

### Step 5 — Multer Error Handler

Add this **after all route definitions** in your `app.js`. Multer throws its own error class — you must handle it separately from your general error handler or clients get raw 500s with no useful message.

```
function handleUploadError(err, res) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: {
        code: "REQUEST_TOO_LARGE",
        message: "Image exceeds the 4MB limit. Compress it or use an image URL instead.",
      },
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      error: {
        code: "TOO_MANY_FILES",
        message: "Maximum 5 images per request.",
      },
    });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: {
        code: "UNEXPECTED_FIELD",
        message: \`Unexpected field name. Use 'image' for single upload or 'images' for multiple.\`,
      },
    });
  }
  if (err.message?.startsWith("Unsupported file type")) {
    return res.status(400).json({
      error: { code: "INVALID_FILE_TYPE", message: err.message },
    });
  }
  return res.status(500).json({
    error: { code: "UPLOAD_ERROR", message: err.message },
  });
}
```

### File Upload — Client Examples

cURL — Single Image Upload

```
curl -X POST https://ainzpromptapi.onrender.com/api/chat/upload \\
  -F "image=@./receipt.jpg" \\
  -F "message=Extract the total amount, date, and vendor name from this receipt" \\
  -F "sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

cURL — Multiple Image Upload

```
curl -X POST https://ainzpromptapi.onrender.com/api/chat/upload/multiple \\
  -F "images=@./before.jpg" \\
  -F "images=@./after.jpg" \\
  -F "message=Compare these two images and describe what changed" \\
  -F "sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

JavaScript — Single Image (Browser File Input)

```
// Triggered from <input type="file" id="fileInput"> + <input type="text" id="promptInput">
async function analyzeImage() {
  const file = document.getElementById("fileInput").files\[0\];
  const message = document.getElementById("promptInput").value;

  const formData = new FormData();
  formData.append("image", file);        // must match field name "image"
  formData.append("message", message);
  formData.append("sessionId", "f47ac10b-58cc-4372-a567-0e02b2c3d479");

  // Do NOT set Content-Type manually — the browser adds the multipart boundary automatically
  const res = await fetch("https://ainzpromptapi.onrender.com/api/chat/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  console.log(data.reply);
}

```

JavaScript — Multiple Images (Browser File Input)

```
async function analyzeMultipleImages() {
  const files = document.getElementById("multiFileInput").files; // multiple attribute
  const message = document.getElementById("promptInput").value;

  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file); // same field name repeated for each file
  }
  formData.append("message", message);
  formData.append("sessionId", "f47ac10b-58cc-4372-a567-0e02b2c3d479");

  const res = await fetch(
    "https://ainzpromptapi.onrender.com/api/chat/upload/multiple",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();
  console.log(\`Processed ${data.imagesProcessed} images\`);
  console.log(data.reply);
}

```

Python — Single Image Upload

```
import requests

with open("diagram.png", "rb") as f:
    response = requests.post(
        "https://ainzpromptapi.onrender.com/api/chat/upload",
        files={"image": ("diagram.png", f, "image/png")},
        data={
            "message": "Explain what this architecture diagram shows",
            "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        },
    )

print(response.json()\["reply"\])
```

Python — Multiple Image Upload

```
import requests

files = \[
    ("images", ("chart1.png", open("chart1.png", "rb"), "image/png")),
    ("images", ("chart2.png", open("chart2.png", "rb"), "image/png")),
\]

response = requests.post(
    "https://ainzpromptapi.onrender.com/api/chat/upload/multiple",
    files=files,
    data={
        "message": "Compare these two charts and summarize the key differences",
        "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    },
)

data = response.json()
print(f"Processed {data\['imagesProcessed'\]} images")
print(data\["reply"\])
```

### File Upload — Error Codes

### Key Implementation Notes

Three things that will cause silent failures if you miss them:

- **Never set** `Content-Type: application/json` **when sending FormData.** Let the browser or `requests` library set it automatically — they include the multipart boundary string that Multer requires to parse the body. Setting it manually will strip the boundary and Multer will receive nothing.

- **The** `sharp` **compression step is not optional for production.** A 3MB JPEG becomes \~4MB after base64 encoding due to the 33% overhead. Without compression, any image over \~3MB will hit Groq's 4MB base64 request limit and return a `413` error. Sharp handles this transparently.

- `upload.single("image")` **and** `upload.array("images", 5)` **are separate middleware instances.** The field name in your form must exactly match the name passed to Multer (`"image"` vs `"images"`). A mismatch triggers `LIMIT_UNEXPECTED_FILE` with a confusing error — the `handleUploadError` function maps this to a clear message for the client.

**Response:** `Content-Type: text/event-stream`

```
data: The
data:  capital
data:  of
data:  France
data:  is
data:  Paris
data: .
data: \[DONE\]

```

- Each `data:` line contains a raw token chunk.

- `data: [DONE]` signals completion.

- `data: [ERROR] {message}` signals a mid-stream error before the connection closes.

Conversation memory is updated server-side after the full response is assembled from the stream.

**Error Responses:** `400` (bad input), `429` (upstream rate limit), `500` (server error)

### Conversation Memory

AinzPromptAPI maintains a `Map<sessionId, messages[]>` in memory where `messages` is an array of `{ role, content }` objects matching the OpenAI chat format.

**Request lifecycle:**

1. The incoming user message is appended to the session's history as `{ role: "user", content: "..." }`

2. The full history array is sent to Groq as the `messages` parameter

3. The assistant's reply is appended to the session history as `{ role: "assistant", content: "..." }`

This enables true multi-turn conversation with full context awareness.

**Critical caveats:**

- Memory is **in-memory only** — it does **not** persist across server restarts or Render re-deployments

- Render free-tier instances sleep after inactivity, **wiping all session data**

- To start a fresh conversation, use a new `sessionId` or omit it entirely

- For durable memory, implement your own persistence layer (Redis, PostgreSQL, etc.)

### Pagination

AinzPromptAPI does not implement pagination. Each endpoint returns a single response (or stream) per request. Conversation history is managed server-side and does not require client-side pagination.

---

## Error Handling

### Error Response Format

All error responses follow a consistent JSON structure:

```json
{
  "error": {
    "code": "MISSING_MESSAGE",
    "message": "The 'message' field is required in the request body.",
    "details": null
  }
}
```

### Error Code Reference

### Retry Strategy

- **Retryable errors:** `429`, `500`, `502`, `503`

- **Backoff strategy:** Exponential backoff with jitter — start at **2 seconds**, double on each retry

- **Maximum retries:** 3 attempts for `429`; 1 attempt for `500`/`502`

- **Non-retryable errors:** `400` (fix the request before retrying)

---

## Code Examples

### cURL — Blocking Chat

```bash
curl -X POST https://ainzpromptapi.onrender.com/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What are the benefits of TypeScript over JavaScript?",
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "model": "llama-3.3-70b-versatile"
  }'

```

### cURL — SSE Streaming

```bash
curl -N -X POST https://ainzpromptapi.onrender.com/api/stream \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Write a haiku about programming",
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'

```

### JavaScript / TypeScript — Blocking Chat

```javascript
const SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const BASE_URL = "https://ainzpromptapi.onrender.com";

// First message
const res1 = await fetch(\`${BASE_URL}/api/chat\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "My name is Alex. What can you help me with?",
    sessionId: SESSION_ID,
  }),
});
const data1 = await res1.json();
console.log("Turn 1:", data1.reply);

// Second message — the server remembers the name "Alex"
const res2 = await fetch(\`${BASE_URL}/api/chat\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What is my name?",
    sessionId: SESSION_ID,
  }),
});
const data2 = await res2.json();
console.log("Turn 2:", data2.reply); // Should reference "Alex"

```

### JavaScript / TypeScript — SSE Streaming

```javascript
const response = await fetch("https://ainzpromptapi.onrender.com/api/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Explain recursion step by step",
    sessionId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split("\\n").filter((line) => line.startsWith("data: "));

  for (const line of lines) {
    const token = line.slice(6); // Remove "data: " prefix
    if (token === "\[DONE\]") break;
    if (token.startsWith("\[ERROR\]")) {
      console.error("Stream error:", token);
      break;
    }
    process.stdout.write(token); // Render token in real time
  }
}
```

### Python — Blocking Chat

```python
import requests

BASE_URL = "https://ainzpromptapi.onrender.com"
SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"

# First turn
response = requests.post(
    f"{BASE_URL}/api/chat",
    json={
        "message": "Summarize the theory of relativity",
        "sessionId": SESSION_ID,
        "model": "llama-3.3-70b-versatile",
    },
)
data = response.json()
print("Reply:", data\["reply"\])
print("Tokens used:", data\["usage"\]\["total_tokens"\])

```

### Python — SSE Streaming

```python
import httpx

with httpx.stream(
    "POST",
    "https://ainzpromptapi.onrender.com/api/stream",
    json={
        "message": "Write a Python quicksort implementation",
        "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    },
) as response:
    for line in response.iter_lines():
        if line.startswith("data: "):
            token = line\[6:\]
            if token == "\[DONE\]":
                break
            if token.startswith("\[ERROR\]"):
                print(f"\\nError: {token}")
                break
            print(token, end="", flush=True)

```

---

## Webhooks & Events

AinzPromptAPI **does not support webhooks or outbound event subscriptions**. It is a synchronous request/response gateway.

### SSE Event Format (Streaming Alternative)

For real-time output, use `POST /api/stream`. The SSE event format is:

Events are unnamed (plain `data:` lines with no `event:` field). Clients should listen for `message` events on `EventSource` or read the raw byte stream directly.

### Polling Alternative

If SSE is not feasible in your environment (e.g., serverless platforms or proxies that block long-lived HTTP connections), use `POST /api/chat` instead. It buffers the full response before returning, at the cost of higher perceived latency.

---

## SDKs, Rate Limits & Support

### SDKs & Libraries

No official SDK exists. AinzPromptAPI is plain HTTP/JSON, callable from any language:

- **JavaScript / TypeScript:** Native `fetch` API (no dependencies needed)

- **Python:** `requests` for blocking calls, `httpx` for streaming

- **Any HTTP client:** `curl`, Postman, Insomnia, or your framework's HTTP module

### Rate Limits

AinzPromptAPI itself enforces **no rate limits**. However, Groq's upstream limits apply per API key. With **N** keys in `GROQ_API_KEYS`, multiply the per-key limits by N for effective gateway throughput.

_Example:_ With `GROQ_API_KEYS=gsk_key1,gsk_key2` (2 keys), your effective limit for `llama-3.3-70b-versatile` is **60 RPM**, **2K RPD**, **24K TPM**, and **200K TPD**.

### Support & Resources

- **Groq Service Status:** [status.groq.com](https://status.groq.com)

- **Render Dashboard:** Monitor deployment health and logs via your Render account

- **Issues & Contributions:** File issues on the AinzPromptAPI GitHub repository

- **Groq Documentation:** [console.groq.com/docs](https://console.groq.com/docs) for upstream model details and limits

---

### \`src/middleware/upload.ts\`

```
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";

const ALLOWED_MIME = \["image/jpeg", "image/png", "image/gif", "image/webp"\];
const MAX_SIZE     = 4 \* 1024 \* 1024; // 4MB

const fileFilter = (\_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  ALLOWED_MIME.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error(\`Unsupported type: ${file.mimetype}. Use JPEG, PNG, GIF, or WebP.\`));
};

const storage = multer.memoryStorage();
const opts     = { storage, fileFilter, limits: { fileSize: MAX_SIZE } };

export const uploadSingle   = multer(opts).single("image");
export const uploadMultiple = multer({ ...opts, limits: { ...opts.limits, files: 5 } }).array("images", 5);

```

### \`src/middleware/compress.ts\`

```
import sharp from "sharp";

const SAFE_RAW_LIMIT = 2.8 \* 1024 \* 1024; // \~3.7MB after base64 — under Groq's 4MB cap

export async function compressIfNeeded(file: Express.Multer.File): Promise {
  if (file.buffer.length <= SAFE_RAW_LIMIT) return file;
  const buffer = await sharp(file.buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  return { ...file, buffer, mimetype: "image/jpeg" };
}

export async function compressAll(files: Express.Multer.File\[\]): Promise {
  return Promise.all(files.map(compressIfNeeded));
}

```

### \`src/middleware/validate.ts\`

```
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }
    req.body = result.data as T;
    next();
  };
}

```

### \`src/middleware/errorHandler.ts\`

```
import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const MULTER_MAP: Record = {
  LIMIT_FILE_SIZE:       \[413, "Image exceeds 4MB limit. Compress it or use a URL."\],
  LIMIT_FILE_COUNT:      \[400, "Maximum 5 images per request."\],
  LIMIT_UNEXPECTED_FILE: \[400, "Wrong field name. Use 'image' or 'images'."\],
};

export function errorHandler(err: unknown, \_req: Request, res: Response, \_next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    const \[status, message\] = MULTER_MAP\[err.code\] ?? \[400, err.message\];
    res.status(status).json({ error: { code: err.code, message } });
    return;
  }
  if (err instanceof Error && err.message.startsWith("Unsupported type")) {
    res.status(400).json({ error: { code: "INVALID_FILE_TYPE", message: err.message } });
    return;
  }
  const status  = (err as { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: { code: "INTERNAL_ERROR", message } });
}

```

### \`src/middleware/index.ts\`

```
export { uploadSingle, uploadMultiple } from "./upload";
export { compressIfNeeded, compressAll } from "./compress";
export { validate }       from "./validate";
export { errorHandler }   from "./errorHandler";

```

### \`src/services/chat.service.ts\`

```
import crypto from "crypto";
import { callGroq, appendToSession, getSession } from "@lib";
import type { ChatBody, ChatResponseBody, ContentBlock, SessionMessage } from "@types";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct";

function resolveModel(body: ChatBody): string {
  return body.content?.some((b) => b.type === "image_url")
    ? VISION_MODEL
    : (body.model ?? DEFAULT_MODEL);
}

function buildUserContent(body: ChatBody): string | ContentBlock\[\] {
  if (body.content) return body.content;
  if (body.message) return body.message;
  throw new Error("No message or content provided");
}

export async function processChatRequest(body: ChatBody): Promise {
  const sid    = body.sessionId ?? crypto.randomUUID();
  const model  = resolveModel(body);
  const userMsg: SessionMessage = { role: "user", content: buildUserContent(body) };

  appendToSession(sid, userMsg);
  const history  = getSession(sid);
  const messages: SessionMessage\[\] = \[
    ...(body.system ? \[{ role: "system" as const, content: body.system }\] : \[\]),
    ...history,
  \];

  const groqData = await callGroq(model, messages);
  const reply    = groqData.choices\[0\]?.message.content ?? "";
  appendToSession(sid, { role: "assistant", content: reply });
  return { reply, sessionId: sid, model, usage: groqData.usage };
}

```

### \`src/services/stream.service.ts\`

```
import crypto from "crypto";
import { streamGroq, appendToSession, getSession } from "@lib";
import type { ChatBody, SessionMessage, GroqStreamChunk } from "@types";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function\* processStreamRequest(body: ChatBody): AsyncGenerator {
  const sid   = body.sessionId ?? crypto.randomUUID();
  const model = body.content?.some((b) => b.type === "image_url")
    ? VISION_MODEL : (body.model ?? DEFAULT_MODEL);
  const userMsg: SessionMessage = { role: "user", content: body.content ?? body.message ?? "" };

  appendToSession(sid, userMsg);
  const messages: SessionMessage\[\] = \[
    ...(body.system ? \[{ role: "system" as const, content: body.system }\] : \[\]),
    ...getSession(sid),
  \];

  const stream  = await streamGroq(model, messages);
  const reader  = stream.getReader();
  const decoder = new TextDecoder();
  let fullReply = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split("\\n").filter(Boolean)) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        if (raw === "\[DONE\]") { appendToSession(sid, { role: "assistant", content: fullReply }); return; }
        const token = (JSON.parse(raw) as GroqStreamChunk).choices\[0\]?.delta.content ?? "";
        if (token) { fullReply += token; yield token; }
      }
    }
  } finally { reader.releaseLock(); }
}

```

### \`src/services/index.ts\`

```
export { processChatRequest }  from "./chat.service";
export { processStreamRequest } from "./stream.service";

```

### \`src/controllers/chat.controller.ts\`

```
import type { Request, Response, NextFunction } from "express";
import { processChatRequest } from "@services";
import type { ChatBody } from "@schemas";

export async function chatController(
  req: Request<{}, {}, ChatBody>, res: Response, next: NextFunction
): Promise {
  try   { res.json(await processChatRequest(req.body)); }
  catch (err) { next(err); }
}

```

### \`src/controllers/stream.controller.ts\`

```
import type { Request, Response, NextFunction } from "express";
import { processStreamRequest } from "@services";
import type { ChatBody } from "@schemas";

export async function streamController(
  req: Request<{}, {}, ChatBody>, res: Response, \_next: NextFunction
): Promise {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  try {
    for await (const token of processStreamRequest(req.body)) res.write(\`data: ${token}\\n\\n\`);
    res.write("data: \[DONE\]\\n\\n");
    res.end();
  } catch (err) {
    res.write(\`data: \[ERROR\] ${err instanceof Error ? err.message : "Unknown error"}\\n\\n\`);
    res.end();
  }
}

```

### \`src/controllers/upload.controller.ts\`

```
import type { Request, Response, NextFunction } from "express";
import { compressIfNeeded, compressAll } from "@middleware";
import { processChatRequest } from "@services";
import type { UploadBody } from "@schemas";
import type { ContentBlock } from "@types";

const VISION = "meta-llama/llama-4-scout-17b-16e-instruct";
const toUri  = (f: Express.Multer.File) => \`data:${f.mimetype};base64,${f.buffer.toString("base64")}\`;

export async function uploadSingleController(req: Request, res: Response, next: NextFunction): Promise {
  try {
    if (!req.file) { res.status(400).json({ error: { code: "MISSING_FILE", message: "Attach an image to the 'image' field." } }); return; }
    const body = req.body as UploadBody;
    const f    = await compressIfNeeded(req.file);
    const content: ContentBlock\[\] = \[
      { type: "text", text: body.message },
      { type: "image_url", image_url: { url: toUri(f) } },
    \];
    res.json(await processChatRequest({ ...body, content, model: VISION }));
  } catch (err) { next(err); }
}

export async function uploadMultipleController(req: Request, res: Response, next: NextFunction): Promise {
  try {
    const files = req.files as Express.Multer.File\[\] | undefined;
    if (!files?.length) { res.status(400).json({ error: { code: "MISSING_FILES", message: "Attach images to the 'images' field." } }); return; }
    const body      = req.body as UploadBody;
    const processed = await compressAll(files);
    const content: ContentBlock\[\] = \[
      { type: "text", text: body.message },
      ...processed.map((f) => ({ type: "image_url" as const, image_url: { url: toUri(f) } })),
    \];
    const result = await processChatRequest({ ...body, content, model: VISION });
    res.json({ ...result, imagesProcessed: processed.length });
  } catch (err) { next(err); }
}

```

### \`src/controllers/index.ts\`

```
export { chatController }                               from "./chat.controller";
export { streamController }                             from "./stream.controller";
export { uploadSingleController, uploadMultipleController } from "./upload.controller";

```

### \`src/routes/chat.routes.ts\`

```
import { Router } from "express";
import { chatController, streamController, uploadSingleController, uploadMultipleController } from "@controllers";
import { validate, uploadSingle, uploadMultiple } from "@middleware";
import { ChatBodySchema, UploadBodySchema } from "@schemas";

const router = Router();

router.post("/chat",                 validate(ChatBodySchema),  chatController);
router.post("/stream",               validate(ChatBodySchema),  streamController);
router.post("/chat/upload",          uploadSingle,              validate(UploadBodySchema), uploadSingleController);
router.post("/chat/upload/multiple", uploadMultiple,            validate(UploadBodySchema), uploadMultipleController);

export default router;

```

### \`src/routes/index.ts\`

```
import { Router }   from "express";
import chatRoutes   from "./chat.routes";

const router = Router();
router.use("/api", chatRoutes);
export default router;

```

### \`src/app.ts\`

```
import express    from "express";
import cors       from "cors";
import helmet     from "helmet";
import router     from "@routes";
import { errorHandler } from "@middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(router);
app.get("/health", (\_req, res) => res.json({ status: "ok" }));
app.use(errorHandler); // must be last

export default app;

```

### \`src/server.ts\`

```
import app       from "./app";
import { env }   from "@config";

const server = app.listen(env.PORT, () => {
  console.log(\`🚀 AinzPromptAPI running on port ${env.PORT}\`);
  console.log(\`🔑 Loaded ${env.GROQ_API_KEYS.length} Groq API key(s)\`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("❌ Server error:", err.message);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received — shutting down gracefully");
  server.close(() => process.exit(0));
});

```

### Layer Responsibilities (Quick Reference)

### Key Design Decisions

**1. Zod is the single source of truth for types.** `ChatBody` and `UploadBody` are inferred directly from their Zod schemas via `z.infer<typeof Schema>`. There is no separate TypeScript interface that can drift out of sync with validation rules. One change to the schema updates both validation and types simultaneously.

**2.** `sessionStore.ts` **is the only file that touches the session Map.** If you replace in-memory storage with Redis, you rewrite one \~20-line file and nothing else changes. The service layer calls `getSession()` and `appendToSession()` — it never knows what's underneath.

**3.** `server.ts` **and** `app.ts` **are deliberately separate.** `app.ts` exports a plain Express instance. Tests import `app` directly and call `supertest(app)` without binding a port. `server.ts` is the only file that ever calls `.listen()` and is never imported by tests.
