# Vision & Image Understanding

AinzPromptAPI supports multimodal image understanding powered by Groq's vision model.

## Supported Vision Model

| Model | Context | Notes |
|-------|---------|-------|
| `meta-llama/llama-4-scout-17b-16e-instruct` | 128K tokens | Auto-selected when images detected |

> [!IMPORTANT]
> The vision model is **automatically selected** when your request contains images (via `content[]` blocks) or when your session history includes images from a previous turn.

## Image Input Limits

- **Max images per request:** 5
- **Max file size:** 4MB (base64 encoded)
- **Supported formats:** JPEG, PNG, GIF, WebP

## How to Send Images

Instead of a plain `message` string, use the `content` array with `text` and `image_url` blocks:

### Image URL (recommended)

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "content": [
    { "type": "text", "text": "What is in this image?" },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg"
      }
    }
  ]
}
```

### Base64 Encoded

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "content": [
    { "type": "text", "text": "Describe this image." },
    {
      "type": "image_url",
      "image_url": { "url": "data:image/jpeg;base64,/9j/4AAQSkZ..." }
    }
  ]
}
```

## Multi-Image Requests

Include up to **5 images** in a single request:

```json
{
  "content": [
    { "type": "text", "text": "Compare these two images." },
    { "type": "image_url", "image_url": { "url": "https://example.com/image1.jpg" } },
    { "type": "image_url", "image_url": { "url": "https://example.com/image2.jpg" } }
  ]
}
```

## Vision + Conversation Memory

Vision requests participate in session memory. The model remembers images from previous turns:

```javascript
// Turn 1 — send image
await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: SESSION_ID,
    content: [
      { type: "text", text: "What city is shown?" },
      { type: "image_url", image_url: { url: "https://example.com/city.jpg" } },
    ],
  }),
});

// Turn 2 — text only, model still remembers the image
const res = await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: SESSION_ID,
    message: "What is that city known for?",
  }),
});
```

## Vision Use Cases

- **OCR / text extraction** — Receipts, invoices, screenshots
- **Visual Q&A** — Answer questions about photos
- **Image captioning** — Accessibility alt text, product descriptions
- **Chart analysis** — Data visualizations and infographics
- **Multi-turn discussions** — Extended conversations about an image
