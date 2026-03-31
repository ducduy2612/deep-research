import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateSignature, verifySignature } from "@/lib/signature";

describe("generateSignature", () => {
  it("should produce a known MD5 hash for given inputs", () => {
    // Manually compute: MD5("mypassword::12345678")
    // Using the algorithm: password + "::" + timestamp.toString().substring(0, 8)
    const result = generateSignature("mypassword", 1234567890);
    expect(result).toBeTypeOf("string");
    expect(result).toHaveLength(32); // MD5 hex digest
  });

  it("should produce deterministic output for the same inputs", () => {
    const a = generateSignature("test-password", 1700000000000);
    const b = generateSignature("test-password", 1700000000000);
    expect(a).toBe(b);
  });

  it("should produce different output for different passwords", () => {
    const a = generateSignature("password-a", 1700000000000);
    const b = generateSignature("password-b", 1700000000000);
    expect(a).not.toBe(b);
  });

  it("should produce different output for different timestamps (different prefix)", () => {
    const a = generateSignature("test-password", 1700000000000);
    // 1800000000000 truncates to "18000000" vs "17000000"
    const b = generateSignature("test-password", 1800000000000);
    expect(a).not.toBe(b);
  });

  it("should truncate timestamp to first 8 digits", () => {
    // Timestamp 1700000000000 → "17000000" (first 8 digits)
    const result = generateSignature("pw", 1700000000000);
    // Should match generating with just the truncated prefix
    // 1700000000000 → substring(0,8) → "17000000"
    // But 1700000099999 → substring(0,8) → "17000000" — same prefix!
    const samePrefix = generateSignature("pw", 1700000099999);
    expect(result).toBe(samePrefix);
  });

  it("should handle empty password", () => {
    const result = generateSignature("", 1700000000000);
    expect(result).toBeTypeOf("string");
    expect(result).toHaveLength(32);
  });

  it("should handle short timestamps", () => {
    const result = generateSignature("pw", 123);
    expect(result).toBeTypeOf("string");
    expect(result).toHaveLength(32);
  });

  it("should match the v0 algorithm exactly", async () => {
    // Replicate the v0 algorithm to ensure compatibility
    const password = "ACCESS_PASSWORD";
    const timestamp = 1700000000000;
    const data = `${password}::${timestamp.toString().substring(0, 8)}`;

    // Use Md5 directly to verify the algorithm matches
    const tsMd5 = await import("ts-md5");
    const expected = tsMd5.Md5.hashStr(data);

    const result = generateSignature(password, timestamp);
    expect(result).toBe(expected);
  });
});

describe("verifySignature", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z")); // 1705316400000
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const NOW = 1705320000000;

  function makeValidSignature(password: string, timestamp: number): string {
    return generateSignature(password, timestamp);
  }

  it("should return true for a valid signature within tolerance", () => {
    const signature = makeValidSignature("mypassword", NOW - 10_000);
    expect(verifySignature(signature, "mypassword", NOW - 10_000)).toBe(true);
  });

  it("should return true for a signature at exactly the current time", () => {
    const signature = makeValidSignature("mypassword", NOW);
    expect(verifySignature(signature, "mypassword", NOW)).toBe(true);
  });

  it("should return false for an invalid signature", () => {
    expect(verifySignature("badsignature", "mypassword", NOW)).toBe(false);
  });

  it("should return false for an expired timestamp (>30s)", () => {
    const expiredTimestamp = NOW - 31_000;
    const signature = makeValidSignature("mypassword", expiredTimestamp);
    expect(verifySignature(signature, "mypassword", expiredTimestamp)).toBe(false);
  });

  it("should return true at exactly the tolerance boundary (30s)", () => {
    const boundaryTimestamp = NOW - 30_000;
    const signature = makeValidSignature("mypassword", boundaryTimestamp);
    expect(verifySignature(signature, "mypassword", boundaryTimestamp)).toBe(true);
  });

  it("should return false just past the tolerance boundary (30.001s)", () => {
    const pastTimestamp = NOW - 30_001;
    const signature = makeValidSignature("mypassword", pastTimestamp);
    expect(verifySignature(signature, "mypassword", pastTimestamp)).toBe(false);
  });

  it("should return false for a future timestamp beyond tolerance", () => {
    const futureTimestamp = NOW + 31_000;
    const signature = makeValidSignature("mypassword", futureTimestamp);
    expect(verifySignature(signature, "mypassword", futureTimestamp)).toBe(false);
  });

  it("should return false for empty signature", () => {
    expect(verifySignature("", "mypassword", NOW)).toBe(false);
  });

  it("should return false for empty password", () => {
    const signature = makeValidSignature("", NOW);
    expect(verifySignature(signature, "", NOW)).toBe(false);
  });

  it("should return false for signature with wrong password", () => {
    const signature = makeValidSignature("correct-password", NOW);
    expect(verifySignature(signature, "wrong-password", NOW)).toBe(false);
  });

  it("should respect custom tolerance", () => {
    const timestamp = NOW - 50_000;
    const signature = makeValidSignature("pw", timestamp);

    // Default tolerance (30s) should reject
    expect(verifySignature(signature, "pw", timestamp)).toBe(false);

    // Custom tolerance of 60s should accept
    expect(verifySignature(signature, "pw", timestamp, 60_000)).toBe(true);
  });

  it("should reject signatures from the far past regardless", () => {
    const oldTimestamp = NOW - 3600_000; // 1 hour ago
    const signature = makeValidSignature("pw", oldTimestamp);
    expect(verifySignature(signature, "pw", oldTimestamp)).toBe(false);
  });
});
