import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GROQ_API_KEYS: z
    .string({ message: "GROQ_API_KEYS environment variable is required" })
    .transform((val) =>
      val
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().startsWith("gsk_")).min(1, "At least one valid Groq API key required")),
  SESSION_TTL_MINUTES: z.coerce.number().default(30),
  RATE_LIMIT_RPM: z.coerce.number().default(60),
  RATE_LIMIT_UPLOAD_RPM: z.coerce.number().default(20),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse(process.env);
