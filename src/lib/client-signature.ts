/**
 * Client-side signature generation for proxy mode authentication.
 *
 * Generates HMAC-style auth headers matching the server-side verification
 * algorithm in src/lib/signature.ts:
 *   MD5(accessPassword + "::" + timestamp.substring(0, 8))
 *
 * Headers are generated fresh per-request (timestamp changes each call).
 */

import { Md5 } from "ts-md5";

/**
 * Create authentication headers for proxy mode API requests.
 *
 * @param accessPassword - The shared secret from settings
 * @returns Object with Authorization and X-Timestamp headers, or empty object if no password
 */
export function createAuthHeaders(
  accessPassword: string,
): Record<string, string> {
  if (!accessPassword) {
    return {};
  }

  const timestamp = Date.now();
  const data = `${accessPassword}::${timestamp.toString().substring(0, 8)}`;
  const signature = Md5.hashStr(data) as string;

  return {
    Authorization: signature,
    "X-Timestamp": timestamp.toString(),
  };
}
