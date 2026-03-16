import { env } from "@config";
import type { SessionMessage } from "@types";

interface SessionEntry {
  messages: SessionMessage[];
  lastAccessed: number;
}

const sessions = new Map<string, SessionEntry>();
const TTL_MS = env.SESSION_TTL_MINUTES * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // sweep every 5 minutes

/** Retrieve the full message history for a session. Creates the array if new. */
export function getSession(sessionId: string): SessionMessage[] {
  const entry = sessions.get(sessionId);
  if (!entry) {
    const newEntry: SessionEntry = { messages: [], lastAccessed: Date.now() };
    sessions.set(sessionId, newEntry);
    return newEntry.messages;
  }
  entry.lastAccessed = Date.now();
  return entry.messages;
}

/** Append a message to the session history. Creates the array if new. */
export function appendToSession(sessionId: string, message: SessionMessage): void {
  const entry = sessions.get(sessionId);
  if (!entry) {
    sessions.set(sessionId, { messages: [message], lastAccessed: Date.now() });
    return;
  }
  entry.lastAccessed = Date.now();
  entry.messages.push(message);
}

/** Remove a specific session. */
export function clearSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/** Get the number of active sessions. */
export function getSessionCount(): number {
  return sessions.size;
}

/** Sweep stale sessions that have exceeded the TTL. */
function sweepStaleSessions(): void {
  const now = Date.now();
  let swept = 0;
  for (const [id, entry] of sessions) {
    if (now - entry.lastAccessed > TTL_MS) {
      sessions.delete(id);
      swept++;
    }
  }
  if (swept > 0) {
    console.log(`🧹 Swept ${swept} stale session(s). Active: ${sessions.size}`);
  }
}

// Start periodic sweep (unref so it doesn't keep the process alive)
const sweepTimer = setInterval(sweepStaleSessions, SWEEP_INTERVAL_MS);
sweepTimer.unref();
