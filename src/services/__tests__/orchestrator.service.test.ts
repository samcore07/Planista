import { describe, it, expect } from "vitest";
import { IdempotencyGuard } from "@/lib/idempotency";

describe("IdempotencyGuard", () => {
  it("allows the initial request and detects immediate duplicates", () => {
    const key = "mutation_key_123";
    IdempotencyGuard.clear(key);

    const firstAttempt = IdempotencyGuard.isDuplicate(key, 5000);
    expect(firstAttempt).toBe(false);

    const duplicateAttempt = IdempotencyGuard.isDuplicate(key, 5000);
    expect(duplicateAttempt).toBe(true);
  });

  it("permits actions after TTL expiration or after explicit clear", () => {
    const key = "mutation_key_456";
    IdempotencyGuard.clear(key);

    IdempotencyGuard.isDuplicate(key, 100);
    expect(IdempotencyGuard.isDuplicate(key, 100)).toBe(true);

    IdempotencyGuard.clear(key);
    expect(IdempotencyGuard.isDuplicate(key, 100)).toBe(false);
  });
});
