# Architecture

## System Overview

```
Client Request
     │
     ▼
┌─────────────────────────┐
│  Express Gateway        │
│  ├─ Helmet (security)   │
│  ├─ CORS                │
│  ├─ Logger              │
│  └─ JSON Parser         │
└──────────┬──────────────┘
           │
     ┌─────▼─────┐
     │  Router    │
     │  /api/*    │
     └─────┬─────┘
           │
  ┌────────┼─────────┐
  │        │         │
  ▼        ▼         ▼
Validate  RPM     Token
(Zod)    Limiter  Limiter
  │        │         │
  └────────┼─────────┘
           │
     ┌─────▼──────┐
     │ Controller │
     │ chat/stream│
     └─────┬──────┘
           │
     ┌─────▼──────┐
     │  Service   │
     │ + Session  │
     └─────┬──────┘
           │
     ┌─────▼──────┐
     │  Groq Lib  │
     │ + Cache    │
     │ + Breaker  │
     │ + Queue    │
     │ + Metrics  │
     └─────┬──────┘
           │
     ┌─────▼──────┐
     │  Groq API  │
     └────────────┘
```

## Layer Responsibilities

| Layer | Files | Purpose |
|-------|-------|---------|
| **Config** | `config/env.ts` | Zod-validated environment variables |
| **Types** | `types/index.ts` | TypeScript interfaces for all shapes |
| **Schemas** | `schemas/` | Zod request body validation |
| **Middleware** | `middleware/` | Upload, validate, rate limit, error handler |
| **Controllers** | `controllers/` | HTTP request/response handling |
| **Services** | `services/` | Business logic, session management |
| **Lib** | `lib/` | Groq client, circuit breaker, cache, queue, metrics |
| **Routes** | `routes/` | Express router definitions |

## Key Design Decisions

1. **Zod is the single source of truth** — Types are inferred from schemas via `z.infer<typeof Schema>`
2. **`sessionStore.ts` is the only file touching sessions** — Swap for Redis by rewriting one ~20-line file
3. **`server.ts` and `app.ts` are separate** — Tests import `app` directly without binding a port
