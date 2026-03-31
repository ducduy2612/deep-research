/**
 * Middleware: Check if a requested model is allowed.
 *
 * Reads NEXT_PUBLIC_MODEL_LIST from env. If set (comma-separated model IDs),
 * only those models are allowed. If the requested model is not in the list,
 * returns 403.
 *
 * If NEXT_PUBLIC_MODEL_LIST is not set, all models are allowed (passthrough).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { MiddlewareHandler } from "./compose";

/**
 * Create a model filter middleware handler.
 *
 * @param getAllowedModels - Function that returns the set of allowed model IDs (empty = all allowed)
 * @returns Middleware handler
 */
export function createCheckModelFilterHandler(
  getAllowedModels: () => Set<string>,
): MiddlewareHandler {
  return async (request: NextRequest, next) => {
    const allowed = getAllowedModels();

    // No filter configured → all models allowed
    if (allowed.size === 0) {
      return next();
    }

    // Determine the requested model from header or query param
    const modelId =
      request.headers.get("X-Model-Id") ??
      request.nextUrl.searchParams.get("model");

    if (!modelId) {
      // No model specified — let the route handler decide
      return next();
    }

    if (!allowed.has(modelId)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Model '${modelId}' is not in the allowed list`,
        },
        { status: 403 },
      );
    }

    return next();
  };
}

/**
 * Default handler reading from process.env.NEXT_PUBLIC_MODEL_LIST.
 */
export const checkModelFilterHandler: MiddlewareHandler =
  createCheckModelFilterHandler(() => {
    const modelList = process.env.NEXT_PUBLIC_MODEL_LIST;
    if (!modelList) {
      return new Set<string>();
    }
    return new Set(
      modelList.split(",").map((m) => m.trim()).filter(Boolean),
    );
  });
