import type { LanguageModel } from "ai";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { ProviderConfig, ProviderId, ModelRole } from "./types";
import { isOpenAICompatible, getModelsByRole } from "./types";
import { createProvider } from "./factory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnyProvider = any;

/**
 * Opaque registry type returned by {@link createRegistry}.
 *
 * Stores raw provider instances internally so that models can be resolved
 * using the correct API (Chat Completions for OpenAI-compatible, native for
 * Google). Consumers pass this to {@link resolveModel} and
 * {@link getDefaultModel}.
 */
export interface ProviderRegistry {
  /** Raw provider instances keyed by config id. */
  providers: Record<string, AnyProvider>;
  /** The original configs, needed for role-based model lookup. */
  configs: ProviderConfig[];
}

// ---------------------------------------------------------------------------
// createRegistry
// ---------------------------------------------------------------------------

/**
 * Creates a provider registry from an array of {@link ProviderConfig}s.
 *
 * Each config is fed through {@link createProvider} to obtain an AI SDK
 * provider instance. The instances are stored keyed by `config.id` for
 * later model resolution via {@link resolveModel}.
 *
 * OpenAI-compatible providers are resolved via `.chat()` (Chat Completions
 * API) instead of the default Responses API, which only real OpenAI supports.
 *
 * @throws {AppError} AI_REQUEST_FAILED if any factory call fails.
 */
export function createRegistry(configs: ProviderConfig[]): ProviderRegistry {
  const providers: Record<string, AnyProvider> = {};

  for (const config of configs) {
    try {
      providers[config.id] = createProvider(config);
    } catch (cause) {
      throw new AppError(
        "AI_REQUEST_FAILED",
        `Failed to create provider '${config.id}' during registry init`,
        {
          category: "ai",
          context: { providerId: config.id },
          cause: cause instanceof Error ? cause : new Error(String(cause)),
        },
      );
    }
  }

  logger.info("Registry created", {
    providerCount: configs.length,
    providers: configs.map((c) => c.id),
  });

  return { providers, configs };
}

// ---------------------------------------------------------------------------
// resolveModel
// ---------------------------------------------------------------------------

/**
 * Resolves a `"providerId:modelName"` string to a {@link LanguageModel}.
 *
 * For OpenAI-compatible providers, uses `.chat()` to target the Chat
 * Completions API instead of the default Responses API.
 *
 * @example
 * ```ts
 * const model = resolveModel(registry, "google:gemini-2.5-pro");
 * ```
 *
 * @throws {AppError} AI_REQUEST_FAILED if the model string is malformed
 *   or the provider/model cannot be found.
 */
export function resolveModel(
  registry: ProviderRegistry,
  modelString: string,
): LanguageModel {
  const colonIndex = modelString.indexOf(":");
  if (colonIndex === -1) {
    throw new AppError(
      "AI_REQUEST_FAILED",
      `Invalid model string '${modelString}' — expected 'providerId:modelName'`,
      { category: "ai", context: { modelString } },
    );
  }

  const providerId = modelString.slice(0, colonIndex);
  const modelId = modelString.slice(colonIndex + 1);

  const provider = registry.providers[providerId];
  if (!provider) {
    throw new AppError(
      "AI_REQUEST_FAILED",
      `No provider '${providerId}' in registry`,
      { category: "ai", context: { modelString, providerId } },
    );
  }

  try {
    // OpenAI-compatible providers default to Responses API when called as a
    // function. Non-OpenAI endpoints (ZAI, DeepSeek, OpenRouter, etc.) don't
    // support it — use .chat() for Chat Completions API instead.
    const model = isOpenAICompatible(providerId as ProviderId)
      ? provider.chat(modelId)
      : provider(modelId);

    logger.debug("Model resolved", { modelString });
    return model;
  } catch (cause) {
    throw new AppError(
      "AI_REQUEST_FAILED",
      `Failed to resolve model '${modelString}'`,
      {
        category: "ai",
        context: { modelString },
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      },
    );
  }
}

// ---------------------------------------------------------------------------
// getDefaultModel
// ---------------------------------------------------------------------------

/**
 * Returns the default (first) model for a given provider and role.
 *
 * @example
 * ```ts
 * const thinkingModel = getDefaultModel(registry, configs, "google", "thinking");
 * ```
 *
 * @throws {AppError} AI_REQUEST_FAILED if the provider is not in `configs`
 *   or no model matches the requested role.
 */
export function getDefaultModel(
  registry: ProviderRegistry,
  configs: ProviderConfig[],
  providerId: ProviderId,
  role: ModelRole,
): LanguageModel {
  const config = configs.find((c) => c.id === providerId);

  if (!config) {
    throw new AppError(
      "AI_REQUEST_FAILED",
      `No config found for provider '${providerId}'`,
      {
        category: "ai",
        context: { providerId, role },
      },
    );
  }

  const models = getModelsByRole(config, role);
  const defaultModel = models[0];

  if (!defaultModel) {
    throw new AppError(
      "AI_REQUEST_FAILED",
      `No '${role}' model found for provider '${providerId}'`,
      {
        category: "ai",
        context: { providerId, role },
      },
    );
  }

  return resolveModel(registry, `${providerId}:${defaultModel.id}`);
}
