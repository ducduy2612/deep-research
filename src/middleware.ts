/**
 * Next.js Edge middleware: route-aware handler composition.
 *
 * Proxy mode (client sends auth headers): verify HMAC signature on all /api/* routes.
 * Local mode (no auth headers): skip auth, still apply provider/model checks on research routes.
 * ACCESS_PASSWORD being set does NOT block local requests — it only gates proxy clients.
 *
 * Route classes:
 *   /api/research/* → verify signature (if headers present) + check disabled providers + check model filter
 *   /api/knowledge/* → verify signature only (if headers present)
 *   /api/* other → verify signature only (if headers present)
 *
 * NOTE: This middleware does NOT consume the request body.
 * Body consumption in middleware prevents route handlers from reading it.
 */

import type { NextRequest } from "next/server";
import {
  runMiddleware,
  verifySignatureHandler,
  checkDisabledHandler,
  checkModelFilterHandler,
} from "@/lib/middleware";

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

type RouteType = "research" | "knowledge" | "other";

function classifyRoute(pathname: string): RouteType {
  if (pathname.startsWith("/api/research")) return "research";
  if (pathname.startsWith("/api/knowledge")) return "knowledge";
  return "other";
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export const config = {
  matcher: "/api/:path*",
};

export default async function middleware(request: NextRequest) {
  const routeType = classifyRoute(request.nextUrl.pathname);
  const isProxyMode = !!process.env.ACCESS_PASSWORD;

  // Build handler chain based on route type and mode
  const handlers = [];

  // Proxy mode: verify HMAC signature on all API routes
  if (isProxyMode) {
    handlers.push(verifySignatureHandler);
  }

  // Research routes: additional provider/model checks
  if (routeType === "research") {
    handlers.push(checkDisabledHandler);
    handlers.push(checkModelFilterHandler);
  }

  // No handlers needed (local mode + non-research) → passthrough
  if (handlers.length === 0) {
    return;
  }

  return runMiddleware(request, handlers);
}
