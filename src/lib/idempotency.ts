/**
 * Idempotency & Duplicate-Submit Protection Layer
 * Protects server-side mutations from duplicate triggers or rapid double-clicks.
 */

interface IdempotencyRecord {
  timestamp: number;
  result?: unknown;
}

const memoryStore = new Map<string, IdempotencyRecord>();
const DEFAULT_TTL_MS = 10000; // 10 seconds protection window

export class IdempotencyGuard {
  /**
   * Checks whether a given key has been processed within the TTL window.
   * If already processed or in-flight, returns true (is duplicate).
   * Otherwise registers the key and returns false (not duplicate).
   */
  static isDuplicate(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
    const now = Date.now();
    const existing = memoryStore.get(key);

    if (existing && now - existing.timestamp < ttlMs) {
      return true;
    }

    memoryStore.set(key, { timestamp: now });
    // Garbage collection for expired keys
    if (memoryStore.size > 1000) {
      for (const [k, v] of memoryStore.entries()) {
        if (now - v.timestamp >= ttlMs) {
          memoryStore.delete(k);
        }
      }
    }

    return false;
  }

  /**
   * Resets or clears a key (e.g., if a transaction failed and should be retried).
   */
  static clear(key: string): void {
    memoryStore.delete(key);
  }
}
