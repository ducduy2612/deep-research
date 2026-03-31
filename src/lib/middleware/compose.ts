/**
 * Composable middleware chain for Next.js route handlers.
 *
 * Each handler receives a standard NextRequest and a `next()` function.
 * Handlers run in registration order. If a handler returns a Response,
 * the chain short-circuits (e.g., auth failure → 401, provider disabled → 403).
 * If a handler calls `next()`, the next handler in the chain executes.
 *
 * The final handler in the chain must return a Response (typically the
 * route handler itself or a passthrough NextResponse.next()).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A middleware handler function.
 *
 * Receives the incoming request and a `next` callback to continue the chain.
 * Return a Response to short-circuit, or call `next()` to proceed.
 */
export type MiddlewareHandler = (
  request: NextRequest,
  next: () => Promise<Response>,
) => Promise<Response>;

// ---------------------------------------------------------------------------
// compose()
// ---------------------------------------------------------------------------

/**
 * Compose multiple middleware handlers into a single handler.
 *
 * Handlers execute in the order provided. The last handler's return value
 * flows back through the chain.
 *
 * @param handlers - Ordered list of middleware handlers
 * @returns A single composed handler function
 *
 * @example
 * ```ts
 * const handler = compose([verifySignature, injectKeys, checkDisabled]);
 * const response = await handler(request);
 * ```
 */
export function compose(handlers: MiddlewareHandler[]): MiddlewareHandler {
  if (handlers.length === 0) {
    // No handlers — passthrough
    return async (_req: NextRequest, next: () => Promise<Response>) => next();
  }

  return async (request: NextRequest, next: () => Promise<Response>) => {
    // Build the chain from right to left, ending with the provided `next`
    let chain: () => Promise<Response> = next;

    for (let i = handlers.length - 1; i >= 0; i--) {
      const handler = handlers[i];
      const previousChain = chain;
      chain = () => handler(request, previousChain);
    }

    return chain();
  };
}

// ---------------------------------------------------------------------------
// runMiddleware()
// ---------------------------------------------------------------------------

/**
 * Execute a composed middleware chain against a request.
 *
 * The terminal handler returns NextResponse.next() as the default response.
 * This is the entry point for route-level middleware invocation.
 *
 * @param request - The incoming NextRequest
 * @param handlers - Ordered list of middleware handlers
 * @returns The final Response from the chain
 */
export async function runMiddleware(
  request: NextRequest,
  handlers: MiddlewareHandler[],
): Promise<Response> {
  const chain = compose(handlers);
  return chain(request, async () => NextResponse.next());
}
