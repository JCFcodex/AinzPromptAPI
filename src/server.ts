import app from "./app.js";
import { env } from "@config";
import { getSessionCount } from "@lib";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 AinzPromptAPI running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`🔑 Loaded ${env.GROQ_API_KEYS.length} Groq API key(s)`);
  console.log(`⏱️  Session TTL: ${env.SESSION_TTL_MINUTES} min | Rate limit: ${env.RATE_LIMIT_RPM} RPM`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("❌ Server error:", err.message);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log(`🛑 SIGTERM received — ${getSessionCount()} active session(s). Shutting down gracefully.`);
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log(`\n🛑 SIGINT received — ${getSessionCount()} active session(s). Shutting down.`);
  server.close(() => process.exit(0));
});
