import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the lib module before importing the service
vi.mock("@lib", () => ({
  streamGroq: vi.fn(),
  appendToSession: vi.fn(),
  getSession: vi.fn(() => []),
}));

import { processStreamRequest } from "../../src/services/stream.service.js";
import type { StreamMeta } from "../../src/services/stream.service.js";
import { streamGroq } from "@lib";

/** Helper — create a ReadableStream from chunks of encoded text */
function fakeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(ctrl) {
      if (i < chunks.length) {
        ctrl.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        ctrl.close();
      }
    },
  });
}

describe("processStreamRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits StreamMeta as first yield", async () => {
    vi.mocked(streamGroq).mockResolvedValue(
      fakeStream(['data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n']),
    );

    const gen = processStreamRequest({ message: "hello" });
    const first = await gen.next();

    expect(first.done).toBe(false);
    const meta = first.value as StreamMeta;
    expect(meta).toHaveProperty("sessionId");
    expect(meta).toHaveProperty("model");
    expect(meta.model).toBe("llama-3.3-70b-versatile");
  });

  it("yields tokens from complete SSE lines", async () => {
    vi.mocked(streamGroq).mockResolvedValue(
      fakeStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        "data: [DONE]\n",
      ]),
    );

    const gen = processStreamRequest({ message: "test" });
    const results: string[] = [];

    for await (const chunk of gen) {
      if (typeof chunk === "string") results.push(chunk);
    }

    expect(results).toEqual(["Hello", " world"]);
  });

  it("buffers partial lines across chunks (regression test for TCP split fix)", async () => {
    // Simulate a TCP split in the middle of a JSON payload
    vi.mocked(streamGroq).mockResolvedValue(
      fakeStream([
        'data: {"choices":[{"delta":{"content":"He',  // partial — no newline
        'llo"}}]}\ndata: [DONE]\n',                    // completion + DONE
      ]),
    );

    const gen = processStreamRequest({ message: "test" });
    const results: string[] = [];

    for await (const chunk of gen) {
      if (typeof chunk === "string") results.push(chunk);
    }

    // Should yield "Hello" from the buffered + completed line
    expect(results).toEqual(["Hello"]);
  });

  it("handles empty delta content gracefully", async () => {
    vi.mocked(streamGroq).mockResolvedValue(
      fakeStream([
        'data: {"choices":[{"delta":{}}]}\n',
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n',
        "data: [DONE]\n",
      ]),
    );

    const gen = processStreamRequest({ message: "test" });
    const results: string[] = [];

    for await (const chunk of gen) {
      if (typeof chunk === "string") results.push(chunk);
    }

    expect(results).toEqual(["ok"]);
  });

  it("uses vision model when content contains image_url", async () => {
    vi.mocked(streamGroq).mockResolvedValue(
      fakeStream(['data: {"choices":[{"delta":{"content":"img"}}]}\ndata: [DONE]\n']),
    );

    const gen = processStreamRequest({
      message: "describe",
      content: [
        { type: "text", text: "describe" },
        { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
      ],
    });

    const first = await gen.next();
    const meta = first.value as StreamMeta;
    expect(meta.model).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
  });
});
