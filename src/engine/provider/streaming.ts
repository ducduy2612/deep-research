import { streamText, generateObject } from "ai";
import type { LanguageModel, CoreMessage } from "ai";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamOptions {
  model: LanguageModel;
  messages: CoreMessage[];
  abortSignal?: AbortSignal;
  /** Called when the stream is aborted (expected, not an error). */
  onAbort?: (steps: number) => void;
  /** Called when the stream encounters an error. */
  onError?: (error: Error) => void;
  /** Called when the stream finishes successfully with usage data. */
  onFinish?: (usage: {
    promptTokens: number;
    completionTokens: number;
  }) => void;
}

export interface GenerateStructuredOptions<T> {
  model: LanguageModel;
  schema: import("zod").ZodType<T>;
  prompt: string;
  abortSignal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// streamWithAbort
// ---------------------------------------------------------------------------

/**
 * Wraps AI SDK `streamText` with AbortController lifecycle callbacks,
 * structured logging, and error recovery.
 *
 * - **Abort** → logs + calls `onAbort` (no error thrown; abort is expected)
 * - **Error** → logs + calls `onError`
 * - **Finish** → logs usage + calls `onFinish`
 *
 * Returns the `StreamTextResult` for the caller to consume the stream.
 */
export async function streamWithAbort(options: StreamOptions) {
  const { model, messages, abortSignal, onAbort, onError, onFinish } = options;

  let stepCount = 0;

  const result = streamText({
    model,
    messages,
    abortSignal,
    onStepFinish: () => {
      stepCount++;
    },
    onError: (event) => {
      const error = event.error;
      const isAbort =
        error instanceof DOMException && error.name === "AbortError";

      if (isAbort) {
        logger.info("Stream aborted", { steps: stepCount });
        onAbort?.(stepCount);
      } else {
        const err =
          error instanceof Error ? error : new Error(String(error));
        logger.error("Stream error", {
          message: err.message,
          steps: stepCount,
        });
        onError?.(err);
      }
    },
    onFinish: (event) => {
      const usage = event.usage;
      logger.info("Stream finished", {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        steps: stepCount,
      });
      onFinish?.({
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      });
    },
  });

  return result;
}

// ---------------------------------------------------------------------------
// generateStructured
// ---------------------------------------------------------------------------

/**
 * Wraps AI SDK `generateObject` with typed Zod schema output and error
 * recovery.
 *
 * - **Abort** → throws `AppError('AI_STREAM_ABORTED')`
 * - **Other errors** → throws `AppError('AI_INVALID_RESPONSE')`
 */
export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>,
): Promise<T> {
  const { model, schema, prompt, abortSignal } = options;

  try {
    const result = await generateObject({ model, schema, prompt, abortSignal });

    logger.info("Structured output generated", {
      schemaType: (schema as unknown as { description?: string }).description ?? "unknown",
    });

    return result.object;
  } catch (cause) {
    const isAbort =
      cause instanceof DOMException && cause.name === "AbortError";

    if (isAbort) {
      throw new AppError("AI_STREAM_ABORTED", "Structured generation aborted", {
        category: "ai",
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      });
    }

    throw new AppError(
      "AI_INVALID_RESPONSE",
      `Structured generation failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      {
        category: "ai",
        context: {
          schemaType: (schema as unknown as { description?: string }).description ?? "unknown",
        },
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      },
    );
  }
}
