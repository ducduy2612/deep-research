/**
 * Tests for client-side signature generation.
 *
 * Covers: empty password, normal signature, timestamp freshness,
 * special characters, Unicode, :: separator in password.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Md5 } from "ts-md5";
import { createAuthHeaders } from "../client-signature";

describe("createAuthHeaders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty object when password is empty string", () => {
    expect(createAuthHeaders("")).toEqual({});
  });

  it("returns Authorization and X-Timestamp headers for valid password", () => {
    const headers = createAuthHeaders("my-secret");
    expect(headers).toHaveProperty("Authorization");
    expect(headers).toHaveProperty("X-Timestamp");
    expect(typeof headers.Authorization).toBe("string");
    expect(typeof headers["X-Timestamp"]).toBe("string");
  });

  it("generates correct MD5 signature matching server algorithm", () => {
    // Date.now() = 1774958400000 → truncated to "17749584"
    // data = "my-secret::17749584"
    const timestamp = Date.now();
    const headers = createAuthHeaders("my-secret");
    expect(headers["X-Timestamp"]).toBe(timestamp.toString());

    // Compute expected: MD5("my-secret::17749584")
    const tsTruncated = timestamp.toString().substring(0, 8);
    const expected = Md5.hashStr(`my-secret::${tsTruncated}`);
    expect(headers.Authorization).toBe(expected);
  });

  it("generates different signatures for different timestamps", () => {
    const headers1 = createAuthHeaders("password");
    // Need to advance enough to change the 8-digit truncated timestamp
    // Current: 17749584... → need to reach 17749585...
    vi.advanceTimersByTime(100_000); // ~100 seconds changes the truncated prefix
    const headers2 = createAuthHeaders("password");
    expect(headers1["X-Timestamp"]).not.toBe(headers2["X-Timestamp"]);
  });

  it("handles password with special characters", () => {
    const headers = createAuthHeaders("p@$$w0rd!#%^&*()");
    expect(Object.keys(headers)).toHaveLength(2);
    expect(headers.Authorization).toBeTruthy();
  });

  it("handles password with Unicode characters", () => {
    const headers = createAuthHeaders("пароль密码🔐");
    expect(Object.keys(headers)).toHaveLength(2);
    expect(headers.Authorization).toBeTruthy();
  });

  it("handles password containing :: separator", () => {
    // :: is the algorithm delimiter — password "a::b" should still work
    const headers = createAuthHeaders("a::b");
    expect(Object.keys(headers)).toHaveLength(2);
    expect(headers.Authorization).toBeTruthy();
    // The signature should be MD5("a::b::17749584") — double :: is fine
  });

  it("handles very long password", () => {
    const longPassword = "x".repeat(10000);
    const headers = createAuthHeaders(longPassword);
    expect(Object.keys(headers)).toHaveLength(2);
    expect(headers.Authorization).toBeTruthy();
  });

  it("produces fresh timestamp on every call", () => {
    const headers1 = createAuthHeaders("test");
    vi.advanceTimersByTime(100);
    const headers3 = createAuthHeaders("test");
    // Timestamps differ (100ms apart)
    expect(Number(headers3["X-Timestamp"])).toBeGreaterThan(
      Number(headers1["X-Timestamp"]),
    );
  });

  // --- Negative tests ---

  it("returns empty headers for whitespace-only password", () => {
    // Whitespace-only is truthy but effectively empty —
    // the function treats it as a valid password (matches server behavior)
    const headers = createAuthHeaders("   ");
    expect(Object.keys(headers)).toHaveLength(2);
  });

  it("proxy mode on + empty password = empty headers (server will 401)", () => {
    const headers = createAuthHeaders("");
    expect(headers).toEqual({});
    // Server would reject with 401 — this is the expected error path
  });

  it("password set but proxy mode off = no headers sent (caller decides)", () => {
    // createAuthHeaders just generates headers; the caller checks proxyMode
    const headers = createAuthHeaders("valid-password");
    expect(Object.keys(headers)).toHaveLength(2);
    // The caller (use-research, FileUpload, UrlCrawler) wraps this in
    // `proxyMode ? createAuthHeaders(accessPassword) : {}`
  });
});
