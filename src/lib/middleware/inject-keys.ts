/**
 * Middleware: Inject provider API keys into request headers.
 *
 * In proxy mode, the server holds API keys in env vars. This handler reads
 * the provider configurations and injects them as custom request headers
 * so downstream route handlers can access them.
 *
 * Headers injected:
 *   - X-Provider-Configs: JSON-encoded ProviderConfig[]
 *
 * If no provider keys are configured, passes through without injection.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { MiddlewareHandler } from "./compose";
import type { ProviderConfig } from "@/engine/provider/types";

/**
 * Create an API key injection middleware handler.
 *
 * @param getProviderConfigs - Function that returns the current provider configs
 * @returns Middleware handler
 */
export function createInjectKeysHandler(
  getProviderConfigs: () => ProviderConfig[],
): MiddlewareHandler {
  return async (request: NextRequest, next) => {
    const configs = getProviderConfigs();

    if (configs.length === 0) {
      return next();
    }

    // Inject configs as a header so route handlers can read them
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    response.headers.set(
      "X-Provider-Configs",
      JSON.stringify(configs),
    );

    return response;
  };
}

/**
 * Default handler using buildProviderConfigs().
 * Lazy-imported to avoid circular deps at module level.
 */
export const injectKeysHandler: MiddlewareHandler = async (request, next) => {
  // Dynamic import to avoid loading api-config until actually needed
  const { buildProviderConfigs } = await import("@/lib/api-config");
  const handler = createInjectKeysHandler(buildProviderConfigs);
  return handler(request, next);
};
