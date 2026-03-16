/**
 * Request Queue — Buffers requests when all API keys are rate-limited.
 *
 * Instead of instantly rejecting with 429, queues the request and
 * drains when a key becomes available again.
 */

const MAX_QUEUE_SIZE = 50;
const MAX_WAIT_MS = 30_000; // 30 seconds

interface QueuedRequest {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const queue: QueuedRequest[] = [];

/**
 * Enqueue a request to wait for key availability.
 * Resolves when a key becomes available, rejects on timeout or queue full.
 */
export function enqueue(): Promise<void> {
  if (queue.length >= MAX_QUEUE_SIZE) {
    const error = new Error(
      "Request queue full. All API keys are rate-limited and the queue is at capacity.",
    );
    (error as any).status = 503;
    return Promise.reject(error);
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Remove from queue on timeout
      const idx = queue.findIndex((q) => q.resolve === resolve);
      if (idx !== -1) queue.splice(idx, 1);

      const error = new Error(
        "Request timed out in queue. All API keys are still rate-limited.",
      );
      (error as any).status = 429;
      reject(error);
    }, MAX_WAIT_MS);

    queue.push({ resolve, reject, timer });
  });
}

/**
 * Drain the queue — release one waiting request.
 * Called when a key becomes available.
 */
export function drainOne(): boolean {
  const item = queue.shift();
  if (!item) return false;
  clearTimeout(item.timer);
  item.resolve();
  return true;
}

/**
 * Drain all waiting requests (e.g., when circuit breaker recovers).
 */
export function drainAll(): number {
  let count = 0;
  while (queue.length > 0) {
    if (drainOne()) count++;
  }
  return count;
}

/** Get queue stats. */
export function getQueueStats() {
  return {
    size: queue.length,
    maxSize: MAX_QUEUE_SIZE,
    maxWaitMs: MAX_WAIT_MS,
  };
}

/** Clear the queue (for testing). */
export function clearQueue(): void {
  for (const item of queue) {
    clearTimeout(item.timer);
    item.reject(new Error("Queue cleared"));
  }
  queue.length = 0;
}
