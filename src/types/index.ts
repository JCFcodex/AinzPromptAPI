// ── Content Blocks (vision) ──────────────────────────────────────────────────

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// ── Session ──────────────────────────────────────────────────────────────────

export interface SessionMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentBlock[];
}

// ── Groq API Response Shapes ─────────────────────────────────────────────────

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GroqChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
  usage: GroqUsage;
}

export interface GroqStreamDelta {
  role?: string;
  content?: string;
}

export interface GroqStreamChoice {
  index: number;
  delta: GroqStreamDelta;
  finish_reason: string | null;
}

export interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqStreamChoice[];
}

// ── API Response ─────────────────────────────────────────────────────────────

export interface ChatResponseBody {
  reply: string;
  sessionId: string;
  model: string;
  usage: GroqUsage;
}

// ── Re-export schema-inferred types for convenience ──────────────────────────

export type { ChatBody, UploadBody } from "../schemas/index.js";
