/**
 * HMAC-style signature utilities for proxy mode authentication.
 *
 * Algorithm matches the v0 codebase:
 *   MD5(password + "::" + timestamp.substring(0, 8))
 *
 * The timestamp is truncated to the first 8 digits (centisecond precision),
 * providing a time-based nonce that resists replay attacks within the tolerance window.
 */

import { Md5 } from "ts-md5";

/** Default clock-skew tolerance in milliseconds (30 seconds). */
const DEFAULT_TOLERANCE_MS = 30_000;

/**
 * Generate an HMAC-style signature from a password and timestamp.
 *
 * @param password - The shared secret (ACCESS_PASSWORD)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns MD5 hex digest string
 */
export function generateSignature(
  password: string,
  timestamp: number,
): string {
  const data = `${password}::${timestamp.toString().substring(0, 8)}`;
  return Md5.hashStr(data) as string;
}

/**
 * Verify a signature against the expected value for a given password and timestamp.
 *
 * Checks that the provided signature matches the generated one AND that the
 * timestamp is within the tolerance window of the current time.
 *
 * @param signature - The client-provided signature to verify
 * @param password - The shared secret (ACCESS_PASSWORD)
 * @param timestamp - The client-provided Unix timestamp in milliseconds
 * @param toleranceMs - Maximum allowed clock skew in ms (default: 30000)
 * @returns true if the signature is valid and within the time window
 */
export function verifySignature(
  signature: string,
  password: string,
  timestamp: number,
  toleranceMs: number = DEFAULT_TOLERANCE_MS,
): boolean {
  // Reject empty inputs early
  if (!signature || !password) {
    return false;
  }

  // Check timestamp is within tolerance window
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  if (diff > toleranceMs) {
    return false;
  }

  // Compare against expected signature
  const expected = generateSignature(password, timestamp);
  return signature === expected;
}
