import crypto from "crypto";
import { streamGroq, appendToSession, getSession } from "@lib";
import type { ChatBody, SessionMessage, GroqStreamChunk } from "@types";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/** Metadata emitted as the first yield before tokens begin. */
export interface StreamMeta {
  sessionId: string;
  model: string;
}

/** Check if a message contains image content blocks. */
function hasImages(msg: SessionMessage): boolean {
  return Array.isArray(msg.content) && msg.content.some((b) => b.type === "image_url");
}

/**
 * Sanitize messages for non-vision models.
 * Converts ContentBlock[] to a plain string by extracting text blocks.
 */
function sanitizeForTextModel(messages: SessionMessage[]): SessionMessage[] {
  return messages.map((msg) => {
    if (Array.isArray(msg.content)) {
      const text = msg.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { ...msg, content: text || "[image]" };
    }
    return msg;
  });
}

export async function* processStreamRequest(
  body: ChatBody,
): AsyncGenerator<string | StreamMeta, void, unknown> {
  const sid = body.sessionId ?? crypto.randomUUID();

  const userMsg: SessionMessage = {
    role: "user",
    content: body.content ?? body.message ?? "",
  };

  appendToSession(sid, userMsg);
  const history = getSession(sid);

  // Auto-detect vision model from current request OR session history
  const currentHasImage = body.content?.some((b) => b.type === "image_url");
  const historyHasImage = history.some(hasImages);
  const model = currentHasImage || historyHasImage
    ? VISION_MODEL
    : (body.model ?? DEFAULT_MODEL);

  let messages: SessionMessage[] = [
    ...(body.system
      ? [{ role: "system" as const, content: body.system }]
      : []),
    ...history,
  ];

  // Safety net: if using a non-vision model, ensure all content is strings
  if (model !== VISION_MODEL) {
    messages = sanitizeForTextModel(messages);
  }

  // Emit metadata as first yield so the controller can send it to the client
  yield { sessionId: sid, model } as StreamMeta;

  const stream = await streamGroq(model, messages);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullReply = "";
  let buffer = ""; // accumulate partial lines across TCP chunks

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Only process complete lines (terminated by \n)
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? ""; // last element may be incomplete — keep buffered

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const raw = trimmed.slice(6);

        if (raw === "[DONE]") {
          appendToSession(sid, { role: "assistant", content: fullReply });
          return;
        }

        try {
          const token =
            (JSON.parse(raw) as GroqStreamChunk).choices[0]?.delta.content ?? "";
          if (token) {
            fullReply += token;
            yield token;
          }
        } catch {
          // skip malformed chunks (e.g. keep-alive pings)
        }
      }
    }

    // Stream ended without [DONE] — save whatever was accumulated
    if (fullReply) {
      appendToSession(sid, { role: "assistant", content: fullReply });
    }
  } finally {
    reader.releaseLock();
  }
}
