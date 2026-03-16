import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @config
vi.mock("@config", () => ({
  env: {
    PORT: 3000,
    NODE_ENV: "test",
    GROQ_API_KEYS: ["gsk_test_key_1"],
    SESSION_TTL_MINUTES: 30,
    RATE_LIMIT_RPM: 1000,
    RATE_LIMIT_UPLOAD_RPM: 1000,
    CORS_ORIGIN: "*",
    LOG_LEVEL: "info",
  },
}));

// Mock the groq module — factory must NOT reference outer variables (hoisting)
vi.mock("../../src/lib/groq.js", () => ({
  callGroq: vi.fn().mockResolvedValue({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1234567890,
    model: "llama-3.3-70b-versatile",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "Test reply" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }),
  streamGroq: vi.fn(),
}));

import { processChatRequest } from "../../src/services/chat.service.js";

describe("chat.service.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reply, sessionId, model, and usage", async () => {
    const result = await processChatRequest({
      message: "Hello",
      sessionId: `test-chat-${Date.now()}`,
    });

    expect(result).toHaveProperty("reply", "Test reply");
    expect(result).toHaveProperty("sessionId");
    expect(result).toHaveProperty("model", "llama-3.3-70b-versatile");
    expect(result).toHaveProperty("usage");
    expect(result.usage.total_tokens).toBe(15);
  });

  it("auto-generates sessionId when not provided", async () => {
    const result = await processChatRequest({ message: "Hello" });
    expect(result.sessionId).toBeTruthy();
    expect(typeof result.sessionId).toBe("string");
    expect(result.sessionId.length).toBeGreaterThan(0);
  });

  it("uses specified model when provided", async () => {
    const result = await processChatRequest({
      message: "Hello",
      model: "llama-3.1-8b-instant",
    });

    expect(result.model).toBe("llama-3.1-8b-instant");
  });

  it("resolves to vision model when content includes image_url", async () => {
    const result = await processChatRequest({
      content: [
        { type: "text", text: "What is this?" },
        { type: "image_url", image_url: { url: "https://example.com/img.jpg" } },
      ],
    });

    expect(result.model).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
  });

  it("throws when neither message nor content is provided", async () => {
    await expect(
      processChatRequest({} as any),
    ).rejects.toThrow("No message or content provided");
  });
});
