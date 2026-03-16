# JavaScript / TypeScript Examples

## Blocking Chat

```javascript
const SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const BASE_URL = "https://ainzpromptapi.onrender.com";

const res = await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "My name is Alex. What can you help me with?",
    sessionId: SESSION_ID,
  }),
});

const data = await res.json();
console.log(data.reply);
```

## Multi-turn Conversation

```javascript
// Turn 1
await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "My name is Alex.",
    sessionId: SESSION_ID,
  }),
});

// Turn 2 — model remembers "Alex"
const res2 = await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What is my name?",
    sessionId: SESSION_ID,
  }),
});

const data2 = await res2.json();
console.log(data2.reply); // "Your name is Alex."
```

## SSE Streaming

```javascript
const response = await fetch(`${BASE_URL}/api/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Explain recursion step by step",
    sessionId: SESSION_ID,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

  for (const line of lines) {
    const token = line.slice(6);
    if (token === "[DONE]") break;
    if (token.startsWith("[ERROR]")) {
      console.error("Stream error:", token);
      break;
    }
    process.stdout.write(token);
  }
}
```

## Vision — Image URL

```javascript
const res = await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: SESSION_ID,
    content: [
      { type: "text", text: "Describe what you see." },
      {
        type: "image_url",
        image_url: { url: "https://example.com/photo.jpg" },
      },
    ],
  }),
});

console.log((await res.json()).reply);
```

## File Upload — Browser

```javascript
async function analyzeImage() {
  const file = document.getElementById("fileInput").files[0];
  const message = document.getElementById("promptInput").value;

  const formData = new FormData();
  formData.append("image", file);
  formData.append("message", message);
  formData.append("sessionId", SESSION_ID);

  // Do NOT set Content-Type — browser adds multipart boundary
  const res = await fetch(`${BASE_URL}/api/chat/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  console.log(data.reply);
}
```

## Base64 Image

```javascript
import fs from "fs";

const imageBuffer = fs.readFileSync("./photo.jpg");
const base64Image = imageBuffer.toString("base64");

const res = await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: SESSION_ID,
    content: [
      { type: "text", text: "Extract text from this image." },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${base64Image}` },
      },
    ],
  }),
});
```
