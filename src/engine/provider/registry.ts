import { createProviderRegistry } from "ai";
import type { ProviderRegistryProvider, LanguageModel } from "ai";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { ProviderConfig, ProviderId, ModelRole } from "./types";
import { getModelsByRole } from "./types";
import { createProvider } from "./factory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Opaque registry type returned by {@link createRegistry}.
 *
 * Wraps the AI SDK's `ProviderRegistryProvider` — consumers pass this to
 * {@link resolveModel} and {@link getDefaultModel}.
 */
export type ProviderRegistry = ProviderRegistryProvider;

// ---------------------------------------------------------------------------
// createRegistry
// ---------------------------------------------------------------------------

/**
 * Creates a provider registry from an array of {@link ProviderConfig}s.
 *
 * Each config is fed through {@link createProvider} to obtain an AI SDK
 * provider instance. The instances are keyed by `config.id` and passed to
 * `createProviderRegistry` so that models can later be resolved via
 * `"providerId:modelName"` strings.
 *
 * @throws {AppError} AI_REQUEST_FAILED if any factory call fails.
 */
export function createRegistry(configs: ProviderConfig[]): ProviderRegistry {
  const providerRecord: Record<string, ReturnType<typeof createProvider>> = {};

  for (const config of configs) {
    try {
      providerRecord[config.id] = createProvider(config);
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

  const registry = createProviderRegistry(providerRecord);

  logger.info("Registry created", {
    providerCount: configs.length,
    providers: configs.map((c) => c.id),
  });

  return registry;
}

// ---------------------------------------------------------------------------
// resolveModel
// ---------------------------------------------------------------------------

/**
 * Resolves a `"providerId:modelName"` string to a {@link LanguageModel}.
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
  try {
    const model = registry.languageModel(modelString as `${string}:${string}`);
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
