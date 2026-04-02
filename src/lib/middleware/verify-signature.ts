/**
 * Middleware: HMAC signature verification.
 *
 * When ACCESS_PASSWORD is set AND the client sends auth headers, verify the
 * HMAC signature. Three cases:
 *
 * 1. No ACCESS_PASSWORD → local server, passthrough all requests.
 * 2. ACCESS_PASSWORD set + no auth headers → local client, passthrough.
 * 3. ACCESS_PASSWORD set + auth headers present → proxy client, verify signature.
 *
 * This allows a server with ACCESS_PASSWORD configured to serve both local
 * requests (no auth) and proxied requests (auth required) simultaneously.
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

    // No password configured → local server, passthrough all requests
    if (!password) {
      return next();
    }

    const signature = request.headers.get("Authorization");
    const timestampStr = request.headers.get("X-Timestamp");

    // Password configured but no auth headers → local client, passthrough
    if (!signature || !timestampStr) {
      return next();
    }

    // Auth headers present → verify signature
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
