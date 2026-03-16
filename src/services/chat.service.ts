import crypto from "crypto";
import { callGroq, appendToSession, getSession } from "@lib";
import type { ChatBody, ChatResponseBody, ContentBlock, SessionMessage } from "@types";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/** Check if a message contains image content blocks. */
function hasImages(msg: SessionMessage): boolean {
  return Array.isArray(msg.content) && msg.content.some((b) => b.type === "image_url");
}

/**
 * Resolve the model — use vision model if the current request OR
 * any message in session history contains images.
 */
function resolveModel(body: ChatBody, history: SessionMessage[]): string {
  const currentHasImage = body.content?.some((b) => b.type === "image_url");
  const historyHasImage = history.some(hasImages);

  return currentHasImage || historyHasImage
    ? VISION_MODEL
    : (body.model ?? DEFAULT_MODEL);
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

function buildUserContent(body: ChatBody): string | ContentBlock[] {
  if (body.content) return body.content;
  if (body.message) return body.message;
  throw new Error("No message or content provided");
}

export async function processChatRequest(
  body: ChatBody,
): Promise<ChatResponseBody> {
  const sid = body.sessionId ?? crypto.randomUUID();
  const userMsg: SessionMessage = {
    role: "user",
    content: buildUserContent(body),
  };

  appendToSession(sid, userMsg);
  const history = getSession(sid);
  const model = resolveModel(body, history);

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

  const groqData = await callGroq(model, messages);
  const reply = groqData.choices[0]?.message.content ?? "";
  appendToSession(sid, { role: "assistant", content: reply });

  return { reply, sessionId: sid, model, usage: groqData.usage };
}
