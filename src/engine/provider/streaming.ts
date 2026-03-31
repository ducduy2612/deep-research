import { streamText, generateObject, generateText } from "ai";
import type { LanguageModel, CoreMessage, ToolSet } from "ai";

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
// generateTextWithAbort
// ---------------------------------------------------------------------------

/** Options for {@link generateTextWithAbort}. */
export interface GenerateTextWithAbortOptions {
  model: LanguageModel;
  /** Simple text prompt. */
  prompt: string;
  abortSignal?: AbortSignal;
  /** AI SDK tools (e.g. OpenAI web_search_preview). */
  tools?: ToolSet;
  /** Provider-specific options (e.g. OpenRouter plugins, xAI search). */
  providerOptions?: Record<string, unknown>;
}

/**
 * Wraps AI SDK `generateText` with abort signal handling and error recovery.
 *
 * - **Abort** → throws `AppError('AI_STREAM_ABORTED')`
 * - **Other errors** → throws `AppError('AI_INVALID_RESPONSE')`
 *
 * Returns the full `GenerateTextResult` so callers can access `sources`,
 * `providerMetadata`, etc.
 */
export async function generateTextWithAbort(
  options: GenerateTextWithAbortOptions,
) {
  const { model, prompt, abortSignal, tools, providerOptions } = options;

  try {
    const result = await generateText({
      model,
      prompt,
      abortSignal,
      ...(tools && { tools }),
      ...(providerOptions && {
        providerOptions: providerOptions as Parameters<typeof generateText>[0]["providerOptions"],
      }),
    });

    logger.info("Text generated", {
      sourceCount: result.sources.length,
      textLength: result.text.length,
    });

    return result;
  } catch (cause) {
    const isAbort =
      cause instanceof DOMException && cause.name === "AbortError";

    if (isAbort) {
      throw new AppError("AI_STREAM_ABORTED", "Text generation aborted", {
        category: "ai",
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      });
    }

    throw new AppError(
      "AI_INVALID_RESPONSE",
      `Text generation failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      {
        category: "ai",
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      },
    );
  }
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
