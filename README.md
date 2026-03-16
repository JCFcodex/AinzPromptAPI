# AinzPromptAPI

> Production-grade LLM proxy gateway wrapping the Groq API with intelligent key rotation, SSE streaming, vision support, and conversation memory.

## Features

- **Blocking Chat** (`POST /api/chat`) — Full response in a single JSON payload
- **SSE Streaming** (`POST /api/stream`) — Real-time token streaming via server-sent events
- **Vision / Image Understanding** — Analyze images via URL, base64, or direct file upload
- **File Upload** — Single (`POST /api/chat/upload`) and multi-image (`POST /api/chat/upload/multiple`) support
- **Conversation Memory** — Automatic multi-turn context via `sessionId` with TTL-based cleanup
- **Key Rotation** — Round-robin cycling across multiple Groq API keys with automatic 429 failover
- **Rate Limiting** — Configurable per-IP rate limits for chat and upload endpoints
- **Request Logging** — Structured JSON logs in production, pretty-printed in development

## Quick Start

```bash
# Clone and install
git clone <repo-url> && cd ainzprompt-api
npm install

# Configure
cp .env.example .env
# Edit .env — add your Groq API key(s)

# Run
npm run dev
```

Open `http://localhost:3000` for the interactive Chat Playground.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `GROQ_API_KEYS` | *required* | Comma-separated Groq API keys (`gsk_...`) |
| `NODE_ENV` | `development` | `development`, `production`, or `test` |
| `SESSION_TTL_MINUTES` | `30` | Session inactivity timeout before cleanup |
| `RATE_LIMIT_RPM` | `60` | Max requests/min per IP (chat/stream) |
| `RATE_LIMIT_UPLOAD_RPM` | `20` | Max requests/min per IP (uploads) |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `LOG_LEVEL` | `info` | Log verbosity |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Blocking chat completion |
| `POST` | `/api/stream` | SSE streaming completion |
| `POST` | `/api/chat/upload` | Single image upload + vision |
| `POST` | `/api/chat/upload/multiple` | Multi-image upload + vision |
| `GET` | `/health` | Health check |

### Request Body (JSON)

```json
{
  "message": "Hello!",
  "sessionId": "optional-uuid",
  "model": "llama-3.3-70b-versatile",
  "system": "Optional system prompt"
}
```

### Response

```json
{
  "reply": "Hi there!",
  "sessionId": "a1b2c3d4-...",
  "model": "llama-3.3-70b-versatile",
  "usage": { "prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15 }
}
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (TSX) |
| `npm start` | Start with TSX (no watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled production build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Architecture

```
src/
├── config/       # Zod-validated environment config
├── types/        # TypeScript type definitions
├── schemas/      # Zod request body schemas (single source of truth)
├── lib/          # Core utilities (Groq client, session store)
├── middleware/    # Express middleware (upload, compress, validate, errorHandler, logger, rateLimit)
├── services/     # Business logic (chat, stream)
├── controllers/  # Request handlers
├── routes/       # Route definitions
├── app.ts        # Express app setup
└── server.ts     # Server entry point
```

## Deployment

### Render

A `render.yaml` blueprint is included. Connect your repo to Render and it will auto-deploy.

### Docker

```bash
docker build -t ainzprompt-api .
docker run -p 3000:3000 -e GROQ_API_KEYS=gsk_your_key ainzprompt-api
```

## License

MIT
