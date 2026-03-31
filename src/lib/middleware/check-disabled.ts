/**
 * Middleware: Check if a provider is disabled.
 *
 * Reads NEXT_PUBLIC_DISABLED_AI_PROVIDER and NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER
 * from env vars. If the requested provider matches a disabled one, returns 403.
 *
 * The provider to check is determined by:
 *   - URL path segment (e.g., /api/chat/google → "google")
 *   - X-Provider-Id header (explicit override)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { MiddlewareHandler } from "./compose";

/**
 * Create a disabled-provider check middleware handler.
 *
 * @param getDisabledProviders - Function that returns the set of disabled provider IDs
 * @returns Middleware handler
 */
export function createCheckDisabledHandler(
  getDisabledProviders: () => Set<string>,
): MiddlewareHandler {
  return async (request: NextRequest, next) => {
    const disabled = getDisabledProviders();

    if (disabled.size === 0) {
      return next();
    }

    // Determine the requested provider from header or URL path
    const providerId =
      request.headers.get("X-Provider-Id") ?? extractProviderFromPath(request.nextUrl.pathname);

    if (providerId && disabled.has(providerId)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Provider '${providerId}' is disabled`,
        },
        { status: 403 },
      );
    }

    return next();
  };
}

/**
 * Extract a provider ID from an API path.
 *
 * Looks for the pattern /api/<segment>/<providerId> or /api/<providerId>.
 * Returns undefined if no provider can be identified.
 */
function extractProviderFromPath(pathname: string): string | undefined {
  // Normalize: remove trailing slash, split
  const segments = pathname.replace(/\/+$/, "").split("/");

  // /api/chat/google → ["", "api", "chat", "google"] → "google"
  // /api/google → ["", "api", "google"] → "google"
  if (segments.length >= 4 && segments[1] === "api") {
    return segments[3];
  }
  if (segments.length >= 3 && segments[1] === "api") {
    return segments[2];
  }

  return undefined;
}

/**
 * Default handler reading from process.env.
 */
export const checkDisabledHandler: MiddlewareHandler =
  createCheckDisabledHandler(() => {
    const disabled = new Set<string>();
    const aiDisabled = process.env.NEXT_PUBLIC_DISABLED_AI_PROVIDER;
    const searchDisabled = process.env.NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER;

    if (aiDisabled) {
      aiDisabled.split(",").forEach((p) => disabled.add(p.trim().toLowerCase()));
    }
    if (searchDisabled) {
      searchDisabled.split(",").forEach((p) => disabled.add(p.trim().toLowerCase()));
    }

    return disabled;
  });
