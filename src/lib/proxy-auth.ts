/**
 * Server-side proxy auth enforcement for API routes.
 *
 * The middleware only verifies auth when headers are present — it can't
 * require them because it can't read the body to distinguish local vs
 * proxy mode. This module fills that gap for route handlers that can
 * inspect the body.
 *
 * Two enforcement modes:
 * 1. **Proxy mode** (no client providers): ACCESS_PASSWORD must be set
 *    AND auth headers must be valid. Rejects if password is missing/wrong.
 * 2. **Local mode** (client sends providers): No auth required — client
 *    brings their own keys.
 *
 * Knowledge routes (no provider concept) always require auth when
 * ACCESS_PASSWORD is set — they're server-side utilities.
 */

import { verifySignature } from "@/lib/signature";
import { env } from "@/lib/env";

export interface AuthError {
  status: number;
  error: string;
  message: string;
}

/**
 * Enforce proxy auth for the research route.
 * Returns an error response if the server requires auth and the client
 * hasn't provided valid credentials, or null if auth passes.
 */
export function enforceResearchAuth(
  request: Request,
  clientProviders?: unknown[] | undefined,
): AuthError | null {
  const password = env.ACCESS_PASSWORD;
  if (!password) return null; // No password configured — open server

  // Client sent providers field (even empty array) — local mode, no auth needed.
  // An empty array means "no keys configured" which is caught downstream with
  // a clearer "No AI providers configured" error instead of a misleading auth error.
  if (clientProviders !== undefined) return null;

  // Client using server providers (proxy mode) — require auth
  return verifyHeaders(request, password);
}

/**
 * Enforce auth for knowledge/utility routes.
 * These routes always require auth when ACCESS_PASSWORD is set,
 * since they use server resources (not client API keys).
 */
export function enforceKnowledgeAuth(
  request: Request,
): AuthError | null {
  const password = env.ACCESS_PASSWORD;
  if (!password) return null; // No password configured — open server

  return verifyHeaders(request, password);
}

function verifyHeaders(request: Request, password: string): AuthError | null {
  const signature = request.headers.get("Authorization");
  const timestampStr = request.headers.get("X-Timestamp");

  if (!signature || !timestampStr) {
    return {
      status: 401,
      error: "UNAUTHORIZED",
      message:
        "Server requires authentication (ACCESS_PASSWORD). Provide a valid access password in Settings.",
    };
  }

  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return {
      status: 401,
      error: "UNAUTHORIZED",
      message: "Invalid X-Timestamp header",
    };
  }

  if (!verifySignature(signature, password, timestamp)) {
    return {
      status: 401,
      error: "UNAUTHORIZED",
      message:
        "Invalid or expired signature. Check your access password in Settings.",
    };
  }

  return null; // Auth OK
}
