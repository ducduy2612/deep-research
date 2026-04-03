import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderConfig,
  SearchProviderId,
} from "@/engine/search/types";
import type { ProviderConfig } from "@/engine/provider/types";
import type { ProviderRegistry } from "@/engine/provider/registry";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { TavilyProvider } from "./providers/tavily";
import { FirecrawlProvider } from "./providers/firecrawl";
import { ExaProvider } from "./providers/exa";
import { BraveProvider } from "./providers/brave";
import { SearXNGProvider } from "./providers/searxng";
import {
  ModelNativeSearchProvider,
  type ModelNativeSearchProviderOptions,
} from "./providers/model-native";

// ---------------------------------------------------------------------------
// External provider IDs (API-key driven)
// ---------------------------------------------------------------------------

const EXTERNAL_PROVIDER_IDS: readonly SearchProviderId[] = [
  "tavily",
  "firecrawl",
  "exa",
  "brave",
  "searxng",
] as const;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a {@link SearchProvider} instance for the given configuration.
 *
 * External providers (tavily, firecrawl, exa, brave, searxng) only need a
 * {@link SearchProviderConfig} with an `apiKey` and optional `baseURL`.
 *
 * Model-native search requires both `providerConfig` (describing the AI
 * provider to use) and `registry` (a resolved provider registry) so it can
 * instantiate the correct model with search capabilities.
 *
 * @throws {AppError} if model-native is requested without providerConfig/registry,
 *   or if the provider ID is unknown.
 */
export function createSearchProvider(
  config: SearchProviderConfig,
  providerConfig?: ProviderConfig,
  registry?: ProviderRegistry,
): SearchProvider {
  const { id } = config;

  // External providers — API-key driven
  if (isExternalProvider(id)) {
    return createExternalProvider(id, config);
  }

  // Model-native search — needs AI provider + registry
  if (id === "model-native") {
    if (!providerConfig || !registry) {
      throw new AppError(
        "AI_REQUEST_FAILED",
        "Model-native search requires both providerConfig and registry",
        { category: "ai", context: { id } },
      );
    }

    const options: ModelNativeSearchProviderOptions = {
      providerConfig,
      registry,
      scope: config.scope,
    };

    logger.info("Creating model-native search provider", {
      providerId: providerConfig.id,
    });

    return new ModelNativeSearchProvider(options);
  }

  // Unknown provider
  throw new AppError(
    "AI_REQUEST_FAILED",
    `Unknown search provider: '${id}'`,
    { category: "ai", context: { id } },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExternalProvider(id: SearchProviderId): boolean {
  return (EXTERNAL_PROVIDER_IDS as readonly string[]).includes(id);
}

function createExternalProvider(
  id: SearchProviderId,
  config: SearchProviderConfig,
): SearchProvider {
  const maskedKey = config.apiKey
    ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}`
    : "<none>";

  logger.info("Creating external search provider", { id, maskedKey, baseURL: config.baseURL ?? "default" });

  switch (id) {
    case "tavily":
      return new TavilyProvider(config);
    case "firecrawl":
      return new FirecrawlProvider(config);
    case "exa":
      return new ExaProvider(config);
    case "brave":
      return new BraveProvider(config);
    case "searxng":
      return new SearXNGProvider(config);
    default:
      // Exhaustiveness — should be unreachable
      throw new AppError(
        "AI_REQUEST_FAILED",
        `Unhandled external search provider: '${id}'`,
        { category: "ai", context: { id } },
      );
  }
}
