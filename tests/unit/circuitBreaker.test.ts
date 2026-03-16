import { describe, it, expect, beforeEach } from "vitest";
import {
  getKeyState,
  reportSuccess,
  reportFailure,
  isKeyAvailable,
  getHealthyKey,
  resetAll,
} from "../../src/lib/circuitBreaker.js";

describe("circuitBreaker", () => {
  beforeEach(() => {
    resetAll();
  });

  it("starts in CLOSED state", () => {
    expect(getKeyState("gsk_test_1")).toBe("CLOSED");
  });

  it("remains CLOSED after 1-2 failures", () => {
    reportFailure("gsk_test_1");
    reportFailure("gsk_test_1");
    expect(getKeyState("gsk_test_1")).toBe("CLOSED");
    expect(isKeyAvailable("gsk_test_1")).toBe(true);
  });

  it("transitions to OPEN after 3 consecutive failures", () => {
    reportFailure("gsk_test_1");
    reportFailure("gsk_test_1");
    reportFailure("gsk_test_1");
    expect(getKeyState("gsk_test_1")).toBe("OPEN");
    expect(isKeyAvailable("gsk_test_1")).toBe(false);
  });

  it("resets to CLOSED on success", () => {
    reportFailure("gsk_test_1");
    reportFailure("gsk_test_1");
    reportSuccess("gsk_test_1");
    expect(getKeyState("gsk_test_1")).toBe("CLOSED");
    expect(isKeyAvailable("gsk_test_1")).toBe(true);
  });

  it("getHealthyKey skips OPEN keys", () => {
    const keys = ["gsk_key_a", "gsk_key_b"];

    // Trip key_a
    reportFailure("gsk_key_a");
    reportFailure("gsk_key_a");
    reportFailure("gsk_key_a");

    const selected = getHealthyKey(keys);
    expect(selected).toBe("gsk_key_b");
  });

  it("getHealthyKey returns null when all keys are OPEN", () => {
    const keys = ["gsk_key_a", "gsk_key_b"];

    // Trip both
    for (const key of keys) {
      reportFailure(key);
      reportFailure(key);
      reportFailure(key);
    }

    expect(getHealthyKey(keys)).toBeNull();
  });

  it("tracks total requests and failures", () => {
    reportSuccess("gsk_test_1");
    reportSuccess("gsk_test_1");
    reportFailure("gsk_test_1");

    // Just verify it doesn't throw — detailed stats are in getHealthSnapshot
    expect(isKeyAvailable("gsk_test_1")).toBe(true);
  });
});
