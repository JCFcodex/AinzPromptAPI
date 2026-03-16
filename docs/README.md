# AinzPromptAPI

> A production-grade, intelligent LLM proxy gateway wrapping Groq API with key rotation, SSE streaming, and conversation memory.

<span class="hero-badge">⚡ Powered by Groq</span> <span class="hero-badge">🔄 Multi-Key Rotation</span> <span class="hero-badge">🧠 Session Memory</span>

---

## What is AinzPromptAPI?

AinzPromptAPI is an intelligent LLM proxy gateway that wraps the Groq API behind clean HTTP endpoints. It handles multi-key rotation, provides both blocking and real-time SSE streaming, and maintains server-side conversation memory — all without requiring authentication from the caller.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Blocking Chat** | `POST /api/chat` — Full JSON response |
| **SSE Streaming** | `POST /api/stream` — Real-time token streaming |
| **Vision** | `POST /api/chat` with `content[]` — Image understanding |
| **File Upload** | `POST /api/chat/upload` — Multipart image upload |
| **Session Memory** | Server-side multi-turn conversation context |
| **Key Rotation** | Automatic round-robin across multiple Groq keys |
| **Circuit Breaker** | Per-key health tracking with automatic failover |
| **Metrics** | `GET /api/metrics` — Real-time observability |

### Why Use It?

1. **Zero key management** — Callers never see or store Groq keys
2. **Built-in memory** — Multi-turn chats work out of the box with `sessionId`
3. **Two clean endpoints** — Blocking and streaming for any use case
4. **Fully public** — No sign-up, no API key, no Bearer tokens
5. **Production-hardened** — Circuit breakers, exponential backoff, token-aware rate limiting

**Primary consumers:** Frontend developers, bot builders, and anyone who wants fast LLM access without infrastructure overhead.
