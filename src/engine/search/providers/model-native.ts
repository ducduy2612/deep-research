import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import type {
  ProviderConfig,
  ProviderId,
} from "@/engine/provider/types";
import type { ProviderRegistry } from "@/engine/provider/registry";
import { getModelsByRole } from "@/engine/provider/types";
import { resolveModel } from "@/engine/provider/registry";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Supported provider types for model-native search
// ---------------------------------------------------------------------------

const NATIVE_SEARCH_PROVIDERS: readonly ProviderId[] = [
  "google",
  "openai",
  "openrouter",
  "xai",
] as const;

type NativeSearchProviderId = (typeof NATIVE_SEARCH_PROVIDERS)[number];

function isNativeSearchProvider(id: ProviderId): id is NativeSearchProviderId {
  return (NATIVE_SEARCH_PROVIDERS as readonly string[]).includes(id);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ModelNativeSearchProviderOptions {
  providerConfig: ProviderConfig;
  registry: ProviderRegistry;
  /** Search scope category. */
  scope?: string;
  /** OpenAI search context size: 'low' | 'medium' | 'high'. */
  searchContextSize?: string;
}

// ---------------------------------------------------------------------------
// ModelNativeSearchProvider
// ---------------------------------------------------------------------------

/**
 * Search provider that uses AI model-native search capabilities instead of
 * external REST APIs. Supports Google (search grounding), OpenAI
 * (web_search_preview tool), OpenRouter (web plugin), and xAI (live search).
 */
export class ModelNativeSearchProvider implements SearchProvider {
  private readonly providerConfig: ProviderConfig;
  private readonly registry: ProviderRegistry;
  private readonly scope: string;
  private readonly searchContextSize: string;

  constructor(options: ModelNativeSearchProviderOptions) {
    this.providerConfig = options.providerConfig;
    this.registry = options.registry;
    this.scope = options.scope ?? "general";
    this.searchContextSize = options.searchContextSize ?? "medium";
  }

  async search(
    query: string,
    options?: SearchProviderCallOptions,
  ): Promise<SearchProviderResult> {
    const maxResults = options?.maxResults ?? 5;
    const abortSignal = options?.abortSignal;
    const providerId = this.providerConfig.id;

    logger.info("ModelNativeSearchProvider: searching", {
      query,
      providerId,
      maxResults,
    });

    if (!isNativeSearchProvider(providerId)) {
      throw new AppError(
        "AI_REQUEST_FAILED",
        `Model-native search is not available for provider '${providerId}'. Supported providers: ${NATIVE_SEARCH_PROVIDERS.join(", ")}`,
        { category: "ai", context: { providerId } },
      );
    }

    // Resolve the networking model
    const networkingModels = getModelsByRole(this.providerConfig, "networking");
    const modelConfig = networkingModels[0];
    if (!modelConfig) {
      throw new AppError(
        "AI_REQUEST_FAILED",
        `No networking model found for provider '${providerId}'`,
        { category: "ai", context: { providerId } },
      );
    }

    const modelString = `${providerId}:${modelConfig.id}`;

    switch (providerId) {
      case "google":
        return this.searchGoogle(query, modelString, abortSignal);
      case "openai":
        return this.searchOpenAI(
          query,
          modelString,
          abortSignal,
          maxResults,
        );
      case "openrouter":
        return this.searchOpenRouter(
          query,
          modelString,
          abortSignal,
          maxResults,
        );
      case "xai":
        return this.searchXAI(query, modelString, abortSignal, maxResults);
    }

    // TypeScript exhaustiveness check — should be unreachable
    throw new AppError(
      "AI_REQUEST_FAILED",
      `Unhandled native search provider: ${providerId}`,
      { category: "ai", context: { providerId } },
    );
  }

  // -------------------------------------------------------------------------
  // Google: googleSearch provider tool
  // -------------------------------------------------------------------------

  private async searchGoogle(
    query: string,
    modelString: string,
    abortSignal: AbortSignal | undefined,
  ): Promise<SearchProviderResult> {
    // Create a fresh Google provider with search grounding enabled.
    // We can't use the registry model because we need the
    // googleSearch provider tool for search grounding.
    const google = createGoogleGenerativeAI({
      apiKey: this.providerConfig.apiKey,
      ...(this.providerConfig.baseURL && {
        baseURL: this.providerConfig.baseURL,
      }),
    });

    // Extract just the model ID after the "google:" prefix
    const modelId = modelString.replace("google:", "");
    const model = google(modelId);

    const result = await generateText({
      model,
      prompt: query,
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      abortSignal,
    });

    const groundingChunks = (
      result.providerMetadata?.google as
        { groundingChunks?: { web?: { uri: string; title: string } }[] } | undefined
    )?.groundingChunks;

    const sources = groundingChunks
      ?.filter((c) => c.web?.uri)
      .map((c) => ({
        url: c.web!.uri,
        title: c.web!.title,
      })) ?? [];

    logger.info("ModelNativeSearchProvider: Google results", {
      sourceCount: sources.length,
    });

    return { sources, images: [] };
  }

  // -------------------------------------------------------------------------
  // OpenAI: web_search_preview tool
  // -------------------------------------------------------------------------

  private async searchOpenAI(
    query: string,
    modelString: string,
    abortSignal: AbortSignal | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _maxResults: number,
  ): Promise<SearchProviderResult> {
    const model = resolveModel(this.registry, modelString);

    // Create OpenAI provider instance to access web_search_preview tool
    const openai = createOpenAI({
      apiKey: this.providerConfig.apiKey,
      ...(this.providerConfig.baseURL && {
        baseURL: this.providerConfig.baseURL,
      }),
    });

    const result = await generateText({
      model,
      prompt: query,
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize:
            this.searchContextSize as "low" | "medium" | "high",
        }),
      },
      abortSignal,
    });

    const sources = result.sources
      .filter((s) => s.sourceType === "url")
      .map((s) => ({
        url: s.url,
        ...(s.title && { title: s.title }),
      }));

    logger.info("ModelNativeSearchProvider: OpenAI results", {
      sourceCount: sources.length,
    });

    return { sources, images: [] };
  }

  // -------------------------------------------------------------------------
  // OpenRouter: web plugin via providerOptions
  // -------------------------------------------------------------------------

  private async searchOpenRouter(
    query: string,
    modelString: string,
    abortSignal: AbortSignal | undefined,
    maxResults: number,
  ): Promise<SearchProviderResult> {
    const model = resolveModel(this.registry, modelString);

    const result = await generateText({
      model,
      prompt: query,
      providerOptions: {
        openrouter: {
          plugins: [{ id: "web", max_results: maxResults }],
        },
      },
      abortSignal,
    });

    const sources = result.sources
      .filter((s) => s.sourceType === "url")
      .map((s) => ({
        url: s.url,
        ...(s.title && { title: s.title }),
      }));

    logger.info("ModelNativeSearchProvider: OpenRouter results", {
      sourceCount: sources.length,
    });

    return { sources, images: [] };
  }

  // -------------------------------------------------------------------------
  // xAI: search_parameters via providerOptions
  // -------------------------------------------------------------------------

  private async searchXAI(
    query: string,
    modelString: string,
    abortSignal: AbortSignal | undefined,
    maxResults: number,
  ): Promise<SearchProviderResult> {
    const model = resolveModel(this.registry, modelString);

    const result = await generateText({
      model,
      prompt: query,
      providerOptions: {
        xai: {
          search_parameters: {
            mode: "auto",
            max_search_results: maxResults,
          },
        },
      },
      abortSignal,
    });

    const sources = result.sources
      .filter((s) => s.sourceType === "url")
      .map((s) => ({
        url: s.url,
        ...(s.title && { title: s.title }),
      }));

    logger.info("ModelNativeSearchProvider: xAI results", {
      sourceCount: sources.length,
    });

    return { sources, images: [] };
  }
}
