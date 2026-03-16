# Conversation Memory

AinzPromptAPI maintains a `Map<sessionId, messages[]>` in memory for automatic multi-turn conversation context.

## How It Works

1. Incoming user message is appended as `{ role: "user", content: "..." }`
2. Full history is sent to Groq as the `messages` parameter
3. The assistant's reply is appended as `{ role: "assistant", content: "..." }`

## Usage

Pass the same `sessionId` across requests to maintain context:

```javascript
const SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

// Turn 1
const res1 = await fetch(`${BASE_URL}/api/chat`, {
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
// → "Your name is Alex."
```

## Important Caveats

| Caveat | Details |
|--------|---------|
| **In-memory only** | Does not persist across server restarts |
| **Render sleep** | Free-tier instances sleep after inactivity, wiping sessions |
| **Token growth** | Longer sessions consume more tokens per request |
| **Session TTL** | Sessions expire after 30 minutes of inactivity |

## Starting Fresh

To start a new conversation:
- Use a new `sessionId`
- Or omit `sessionId` entirely (a new UUID is generated automatically)

## Pagination

AinzPromptAPI does not implement pagination. Each endpoint returns a single response per request. History is managed server-side.
