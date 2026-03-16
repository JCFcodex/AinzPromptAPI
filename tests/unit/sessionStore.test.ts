import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock @config before importing sessionStore
vi.mock("@config", () => ({
  env: {
    SESSION_TTL_MINUTES: 1, // 1 minute for fast testing
    PORT: 3000,
    NODE_ENV: "test",
    GROQ_API_KEYS: ["gsk_test_key_1"],
    RATE_LIMIT_RPM: 60,
    RATE_LIMIT_UPLOAD_RPM: 20,
    CORS_ORIGIN: "*",
    LOG_LEVEL: "info",
  },
}));

import { getSession, appendToSession, clearSession, getSessionCount } from "@lib";

describe("sessionStore", () => {
  beforeEach(() => {
    // Clear all sessions between tests by clearing known sessions
    // We track session IDs created during the test
  });

  it("returns empty array for a new session", () => {
    const id = `test-${Date.now()}-${Math.random()}`;
    const session = getSession(id);
    expect(session).toEqual([]);
    clearSession(id);
  });

  it("appends messages to session history", () => {
    const id = `test-append-${Date.now()}`;
    appendToSession(id, { role: "user", content: "Hello" });
    appendToSession(id, { role: "assistant", content: "Hi there!" });

    const session = getSession(id);
    expect(session).toHaveLength(2);
    expect(session[0]).toEqual({ role: "user", content: "Hello" });
    expect(session[1]).toEqual({ role: "assistant", content: "Hi there!" });
    clearSession(id);
  });

  it("isolates sessions from each other", () => {
    const id1 = `test-iso-1-${Date.now()}`;
    const id2 = `test-iso-2-${Date.now()}`;

    appendToSession(id1, { role: "user", content: "Session 1" });
    appendToSession(id2, { role: "user", content: "Session 2" });

    expect(getSession(id1)).toHaveLength(1);
    expect(getSession(id2)).toHaveLength(1);
    expect(getSession(id1)[0].content).toBe("Session 1");
    expect(getSession(id2)[0].content).toBe("Session 2");

    clearSession(id1);
    clearSession(id2);
  });

  it("clearSession removes a session and returns true", () => {
    const id = `test-clear-${Date.now()}`;
    appendToSession(id, { role: "user", content: "temp" });
    expect(clearSession(id)).toBe(true);
    // After clearing, getSession creates a fresh empty one
    expect(getSession(id)).toEqual([]);
    clearSession(id);
  });

  it("clearSession returns false for non-existent session", () => {
    expect(clearSession(`non-existent-${Date.now()}`)).toBe(false);
  });

  it("getSessionCount returns the number of active sessions", () => {
    const baseline = getSessionCount();
    const id = `test-count-${Date.now()}`;
    appendToSession(id, { role: "user", content: "counting" });
    expect(getSessionCount()).toBe(baseline + 1);
    clearSession(id);
  });

  it("supports content blocks for vision messages", () => {
    const id = `test-vision-${Date.now()}`;
    const contentBlocks = [
      { type: "text" as const, text: "What is this?" },
      { type: "image_url" as const, image_url: { url: "https://example.com/img.jpg" } },
    ];
    appendToSession(id, { role: "user", content: contentBlocks });

    const session = getSession(id);
    expect(session[0].content).toEqual(contentBlocks);
    clearSession(id);
  });
});
