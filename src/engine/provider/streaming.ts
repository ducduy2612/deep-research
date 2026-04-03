import { streamText, generateText, Output } from "ai";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamOptions {
  model: LanguageModel;
  messages: ModelMessage[];
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
        promptTokens: usage.inputTokens,
        completionTokens: usage.outputTokens,
        steps: stepCount,
      });
      onFinish?.({
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
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
 * recovery. Falls back to plain text generation + JSON extraction when
 * the model does not support structured output (e.g. GLM, DeepSeek).
 *
 * - **Abort** → throws `AppError('AI_STREAM_ABORTED')`
 * - **Structured output fails** → falls back to `generateText` + JSON parse
 * - **Other errors** → throws `AppError('AI_INVALID_RESPONSE')`
 */
export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>,
): Promise<T> {
  const { model, schema, prompt, abortSignal } = options;
  const schemaLabel =
    (schema as unknown as { description?: string }).description ?? "unknown";

  // --- Try structured output first ---
  try {
    const result = await generateText({
      model,
      experimental_output: Output.object({ schema }),
      prompt,
      abortSignal,
    });

    logger.info("Structured output generated", { schemaType: schemaLabel });
    return result.experimental_output as T;
  } catch (structuredError) {
    const isAbort =
      structuredError instanceof DOMException &&
      structuredError.name === "AbortError";

    if (isAbort) {
      throw new AppError(
        "AI_STREAM_ABORTED",
        "Structured generation aborted",
        {
          category: "ai",
          cause:
            structuredError instanceof Error
              ? structuredError
              : new Error(String(structuredError)),
        },
      );
    }

    // --- Fallback: generateText + manual JSON extraction ---
    logger.info("Structured output not supported, falling back to text+parse", {
      schemaType: schemaLabel,
      originalError:
        structuredError instanceof Error
          ? structuredError.message
          : String(structuredError),
    });

    try {
      const result = await generateText({
        model,
        prompt: `${prompt}\n\nRespond with valid JSON only. No markdown fences, no commentary — just the JSON.`,
        abortSignal,
      });

      const parsed = extractAndParseJSON<T>(result.text, schema);
      logger.info("Structured output generated via text fallback", {
        schemaType: schemaLabel,
      });
      return parsed;
    } catch (fallbackError) {
      const isFallbackAbort =
        fallbackError instanceof DOMException &&
        fallbackError.name === "AbortError";

      if (isFallbackAbort) {
        throw new AppError(
          "AI_STREAM_ABORTED",
          "Structured generation aborted",
          {
            category: "ai",
            cause:
              fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError)),
          },
        );
      }

      throw new AppError(
        "AI_INVALID_RESPONSE",
        `Structured generation failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        {
          category: "ai",
          context: { schemaType: schemaLabel },
          cause:
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError)),
        },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// extractAndParseJSON — robust JSON extraction from LLM text output
// ---------------------------------------------------------------------------

/**
 * Extracts and validates JSON from a model's text response.
 *
 * Handles common LLM artifacts:
 * - Markdown code fences (```json ... ```)
 * - Leading/trailing prose around the JSON
 * - Trailing commas (best-effort)
 */
export function extractAndParseJSON<T>(
  text: string,
  schema: import("zod").ZodType<T>,
): T {
  let jsonStr = text.trim();

  // Strip markdown code fences
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try direct parse first
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to find JSON array or object in the text
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);

    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        throw new AppError(
          "AI_INVALID_RESPONSE",
          "Could not parse JSON from model response",
          { category: "ai" },
        );
      }
    } else if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0]);
      } catch {
        throw new AppError(
          "AI_INVALID_RESPONSE",
          "Could not parse JSON from model response",
          { category: "ai" },
        );
      }
    } else {
      throw new AppError(
        "AI_INVALID_RESPONSE",
        "No JSON found in model response",
        { category: "ai" },
      );
    }
  }

  // Validate against schema
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AppError(
      "AI_INVALID_RESPONSE",
      `Model response did not match expected schema: ${result.error.message}`,
      {
        category: "ai",
        context: { zodErrors: result.error.issues.map((i) => i.message) },
      },
    );
  }

  return result.data;
}
