import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

// Mock @config
vi.mock("@config", () => ({
  env: {
    PORT: 3000,
    NODE_ENV: "test",
    GROQ_API_KEYS: ["gsk_test_key_1"],
    SESSION_TTL_MINUTES: 30,
    RATE_LIMIT_RPM: 1000, // high limit for integration tests
    RATE_LIMIT_UPLOAD_RPM: 1000,
    CORS_ORIGIN: "*",
    LOG_LEVEL: "error", // suppress logs during tests
  },
}));

// Mock groq to avoid real API calls
const mockGroqResponse = {
  id: "chatcmpl-test",
  object: "chat.completion",
  created: 1234567890,
  model: "llama-3.3-70b-versatile",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Integration test reply" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(mockGroqResponse),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"streamed"}}]}\n\ndata: [DONE]\n\n',
          ),
        );
        controller.close();
      },
    }),
    headers: {
      get: (_name: string) => null,
    },
  }),
);

// Import app AFTER mocks are set up
const { default: app } = await import("../../src/app.js");

describe("API Routes — Integration", () => {
  describe("GET /health", () => {
    it("returns { status: 'ok' }", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  describe("POST /api/chat", () => {
    it("returns 200 with reply on valid request", async () => {
      const res = await request(app)
        .post("/api/chat")
        .send({ message: "Hello" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("reply");
      expect(res.body).toHaveProperty("sessionId");
      expect(res.body).toHaveProperty("model");
      expect(res.body).toHaveProperty("usage");
    });

    it("returns 400 when message is missing", async () => {
      const res = await request(app)
        .post("/api/chat")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("preserves sessionId across requests", async () => {
      const sessionId = `integration-test-${Date.now()}`;

      const res1 = await request(app)
        .post("/api/chat")
        .send({ message: "Hello", sessionId });

      const res2 = await request(app)
        .post("/api/chat")
        .send({ message: "Follow up", sessionId });

      expect(res1.body.sessionId).toBe(sessionId);
      expect(res2.body.sessionId).toBe(sessionId);
    });
  });

  describe("POST /api/stream", () => {
    it("returns 200 with text/event-stream content type", async () => {
      const res = await request(app)
        .post("/api/stream")
        .send({ message: "Hello" });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");
    });

    it("returns 400 when message is missing", async () => {
      const res = await request(app)
        .post("/api/stream")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("POST /api/chat/upload", () => {
    it("returns 400 when no file is attached", async () => {
      const res = await request(app)
        .post("/api/chat/upload")
        .field("message", "Describe this image");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FILE");
    });
  });

  describe("POST /api/chat/upload/multiple", () => {
    it("returns 400 when no files are attached", async () => {
      const res = await request(app)
        .post("/api/chat/upload/multiple")
        .field("message", "Compare these images");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FILES");
    });
  });

  describe("Error handling", () => {
    it("returns consistent error JSON format", async () => {
      const res = await request(app)
        .post("/api/chat")
        .send({});

      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toHaveProperty("code");
      expect(res.body.error).toHaveProperty("message");
    });
  });
});
