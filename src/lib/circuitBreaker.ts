/**
 * Circuit Breaker — Per-key health tracking for Groq API keys.
 *
 * States:
 *   CLOSED   → healthy, all requests pass through
 *   OPEN     → failing, requests skip this key
 *   HALF_OPEN → cooldown expired, allow one probe request
 */

const FAILURE_THRESHOLD = 3; // consecutive failures to trip
const COOLDOWN_MS = 30_000; // 30s before probing a tripped key
const WINDOW_MS = 60_000; // sliding window for counting failures

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface KeyHealth {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
  cooldownUntil: number;
  totalRequests: number;
  totalFailures: number;
}

const healthMap = new Map<string, KeyHealth>();

function getOrCreate(key: string): KeyHealth {
  if (!healthMap.has(key)) {
    healthMap.set(key, {
      state: "CLOSED",
      failures: 0,
      lastFailureAt: 0,
      cooldownUntil: 0,
      totalRequests: 0,
      totalFailures: 0,
    });
  }
  return healthMap.get(key)!;
}

/**
 * Get the current state of a key, transitioning OPEN → HALF_OPEN
 * if the cooldown period has passed.
 */
export function getKeyState(key: string): CircuitState {
  const h = getOrCreate(key);

  if (h.state === "OPEN" && Date.now() >= h.cooldownUntil) {
    h.state = "HALF_OPEN";
  }

  // Reset failure count if we're outside the sliding window
  if (h.state === "CLOSED" && h.lastFailureAt > 0 && Date.now() - h.lastFailureAt > WINDOW_MS) {
    h.failures = 0;
  }

  return h.state;
}

/**
 * Report a successful request — closes the circuit.
 */
export function reportSuccess(key: string): void {
  const h = getOrCreate(key);
  h.totalRequests++;
  h.failures = 0;
  h.state = "CLOSED";
}

/**
 * Report a failed request — may trip the circuit open.
 */
export function reportFailure(key: string): void {
  const h = getOrCreate(key);
  h.totalRequests++;
  h.totalFailures++;
  h.failures++;
  h.lastFailureAt = Date.now();

  if (h.failures >= FAILURE_THRESHOLD) {
    h.state = "OPEN";
    h.cooldownUntil = Date.now() + COOLDOWN_MS;
  }
}

/**
 * Check if a key is currently available for requests.
 */
export function isKeyAvailable(key: string): boolean {
  const state = getKeyState(key);
  return state === "CLOSED" || state === "HALF_OPEN";
}

/**
 * Select the next available key using round-robin, skipping OPEN keys.
 * Returns null if all keys are unavailable.
 */
let keyIndex = 0;

export function getHealthyKey(keys: string[]): string | null {
  const total = keys.length;

  for (let i = 0; i < total; i++) {
    const idx = (keyIndex + i) % total;
    const key = keys[idx];

    if (isKeyAvailable(key)) {
      keyIndex = (idx + 1) % total;
      return key;
    }
  }

  // Check if any key is transitioning to HALF_OPEN soon
  return null;
}

/**
 * Get health snapshot for all tracked keys (for metrics/observability).
 */
export function getHealthSnapshot(): Map<string, KeyHealth> {
  // Refresh states
  for (const key of healthMap.keys()) {
    getKeyState(key);
  }
  return new Map(healthMap);
}

/**
 * Get the earliest time a key will become available for probing.
 * Used by the request queue to know when to retry.
 */
export function getEarliestCooldownEnd(keys: string[]): number {
  let earliest = Infinity;
  for (const key of keys) {
    const h = getOrCreate(key);
    if (h.state === "OPEN" && h.cooldownUntil < earliest) {
      earliest = h.cooldownUntil;
    }
  }
  return earliest;
}

/** Reset all circuit breakers (for testing). */
export function resetAll(): void {
  healthMap.clear();
  keyIndex = 0;
}
