# SDKs & Support

## SDKs & Libraries

No official SDK exists. AinzPromptAPI is plain HTTP/JSON, callable from any language:

| Language | Recommended Client |
|----------|-------------------|
| **JavaScript / TypeScript** | Native `fetch` API |
| **Python** | `requests` (blocking), `httpx` (streaming) |
| **Any language** | Any HTTP client — `curl`, Postman, Insomnia |

## Resources

| Resource | URL |
|----------|-----|
| **GitHub** | [github.com/JCFcodex/AinzPromptAPI](https://github.com/JCFcodex/AinzPromptAPI) |
| **Groq Status** | [status.groq.com](https://status.groq.com) |
| **Groq Docs** | [console.groq.com/docs](https://console.groq.com/docs) |
| **Render Dashboard** | Monitor deployment health and logs |

## Self-Hosting

Clone and run locally:

```bash
git clone https://github.com/JCFcodex/AinzPromptAPI.git
cd AinzPromptAPI
npm install
cp .env.example .env  # Add your GROQ_API_KEYS
npm run dev
```

## Docker

```bash
docker build -t ainzprompt-api .
docker run -p 3000:3000 --env-file .env ainzprompt-api
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEYS` | Yes | Comma-separated Groq API keys |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |
| `CORS_ORIGIN` | No | Allowed CORS origin |
| `RATE_LIMIT_RPM` | No | Requests per minute (default: 60) |
| `SESSION_TTL_MIN` | No | Session TTL in minutes (default: 30) |
