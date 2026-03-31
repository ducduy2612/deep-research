import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { ProviderConfig } from "./types";

import { isOpenAICompatible } from "./types";

// ---------------------------------------------------------------------------
// Google Gemini factory
// ---------------------------------------------------------------------------

/**
 * Creates a configured Google Generative AI provider instance.
 *
 * The returned provider exposes `.languageModel(modelId)` for use with the
 * AI SDK's `streamText` / `generateText` helpers.
 */
export function createGoogleProvider(config: ProviderConfig) {
  try {
    const provider = createGoogleGenerativeAI({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });

    logger.info("Provider created", {
      providerId: config.id,
      modelCount: config.models.length,
    });

    return provider;
  } catch (cause) {
    throw new AppError("AI_REQUEST_FAILED", `Failed to create ${config.id} provider`, {
      category: "ai",
      context: { providerId: config.id },
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
  }
}

// ---------------------------------------------------------------------------
// OpenAI-compatible factory
// ---------------------------------------------------------------------------

/**
 * Creates an OpenAI-compatible provider instance.
 *
 * Used for OpenAI, DeepSeek, OpenRouter, Groq, xAI — any provider that
 * exposes an OpenAI-compatible chat completions API. The `name` parameter
 * is set to the provider ID so AI SDK telemetry labels calls correctly.
 *
 * Consumers should use the `.chat(modelId)` method (not `.languageModel()`)
 * to force the chat completions endpoint — required for DeepSeek reasoning
 * models and other non-standard providers.
 */
export function createOpenAICompatibleProvider(config: ProviderConfig) {
  try {
    const provider = createOpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
      name: config.id,
    });

    logger.info("Provider created", {
      providerId: config.id,
      modelCount: config.models.length,
    });

    return provider;
  } catch (cause) {
    throw new AppError("AI_REQUEST_FAILED", `Failed to create ${config.id} provider`, {
      category: "ai",
      context: { providerId: config.id },
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
  }
}

// ---------------------------------------------------------------------------
// Unified dispatcher
// ---------------------------------------------------------------------------

/**
 * Creates the correct provider instance based on `config.id`.
 *
 * - `'google'` → Google Generative AI provider
 * - anything else → OpenAI-compatible provider (validated by
 *   `isOpenAICompatible`)
 */
export function createProvider(config: ProviderConfig) {
  if (config.id === "google") {
    return createGoogleProvider(config);
  }

  if (isOpenAICompatible(config.id)) {
    return createOpenAICompatibleProvider(config);
  }

  // Defensive — should never happen if types are respected
  throw new AppError("AI_REQUEST_FAILED", `Unknown provider: ${config.id}`, {
    category: "ai",
    context: { providerId: config.id },
  });
}
