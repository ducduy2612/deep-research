/**
 * Middleware: HMAC signature verification.
 *
 * When ACCESS_PASSWORD is set (proxy mode), all /api/* requests must include:
 *   - Authorization: <signature>
 *   - X-Timestamp: <unix-ms>
 *
 * The signature is verified against the expected HMAC for the given password
 * and timestamp. If verification fails or headers are missing, returns 401.
 *
 * When ACCESS_PASSWORD is not set (local mode), this handler passes through.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { MiddlewareHandler } from "./compose";
import { verifySignature } from "@/lib/signature";

/**
 * Create a signature verification middleware handler.
 *
 * @param getPassword - Function that returns the ACCESS_PASSWORD (or undefined for local mode)
 * @returns Middleware handler
 */
export function createVerifySignatureHandler(
  getPassword: () => string | undefined,
): MiddlewareHandler {
  return async (request: NextRequest, next) => {
    const password = getPassword();

    // No password configured → local mode, passthrough
    if (!password) {
      return next();
    }

    const signature = request.headers.get("Authorization");
    const timestampStr = request.headers.get("X-Timestamp");

    // Missing headers
    if (!signature || !timestampStr) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Missing Authorization or X-Timestamp header",
        },
        { status: 401 },
      );
    }

    // Parse timestamp
    const timestamp = Number(timestampStr);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid X-Timestamp header",
        },
        { status: 401 },
      );
    }

    // Verify signature
    const valid = verifySignature(signature, password, timestamp);
    if (!valid) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid or expired signature",
        },
        { status: 401 },
      );
    }

    return next();
  };
}

/**
 * Default handler using process.env.ACCESS_PASSWORD.
 * Safe for use in Next.js middleware where env vars are available.
 */
export const verifySignatureHandler: MiddlewareHandler =
  createVerifySignatureHandler(() => process.env.ACCESS_PASSWORD);
