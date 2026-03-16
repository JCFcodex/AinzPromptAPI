/**
 * Response Cache — In-memory LRU cache for non-streaming completions.
 *
 * Only caches deterministic responses (no images, default temperature).
 */

import crypto from "crypto";
import type { GroqResponse } from "@types";

interface CacheEntry {
  response: GroqResponse;
  createdAt: number;
}

const MAX_ENTRIES = 200;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CacheEntry>();

/**
 * Generate a cache key from model + messages.
 * Uses SHA-256 hash of the serialized input.
 */
export function makeCacheKey(model: string, messages: unknown[]): string {
  const input = JSON.stringify({ model, messages });
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Get a cached response. Returns null on miss or expired entry.
 */
export function getCachedResponse(key: string): GroqResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key);
    return null;
  }

  // LRU: move to end (most recently used)
  cache.delete(key);
  cache.set(key, entry);

  return entry.response;
}

/**
 * Store a response in the cache.
 */
export function setCachedResponse(key: string, response: GroqResponse): void {
  // Evict oldest entries if full
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  cache.set(key, { response, createdAt: Date.now() });
}

/**
 * Check if a request is cacheable.
 * Only cache non-streaming requests without images.
 */
export function isCacheable(messages: unknown[]): boolean {
  const str = JSON.stringify(messages);
  // Skip if messages contain image data
  return !str.includes('"image_url"') && !str.includes("data:image");
}

/** Get cache stats. */
export function getCacheStats() {
  return { size: cache.size, maxSize: MAX_ENTRIES, ttlMs: TTL_MS };
}

/** Clear the cache (for testing). */
export function clearCache(): void {
  cache.clear();
}
