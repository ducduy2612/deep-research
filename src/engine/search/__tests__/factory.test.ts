import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSearchProvider } from "../factory";
import type { SearchProviderConfig } from "../types";
import { TavilyProvider } from "../providers/tavily";
import { FirecrawlProvider } from "../providers/firecrawl";
import { ExaProvider } from "../providers/exa";
import { BraveProvider } from "../providers/brave";
import { SearXNGProvider } from "../providers/searxng";
import { ModelNativeSearchProvider } from "../providers/model-native";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function config(
  overrides: Partial<SearchProviderConfig> = {},
): SearchProviderConfig {
  return {
    id: overrides.id ?? "tavily",
    apiKey: overrides.apiKey ?? "test-key",
    baseURL: overrides.baseURL,
    scope: overrides.scope,
    maxResults: overrides.maxResults,
  };
}

// Minimal provider config / registry for model-native tests
const mockProviderConfig = {
  id: "google" as const,
  apiKey: "test-google-key",
  models: [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      role: "networking" as const,
      capabilities: {
        reasoning: false,
        searchGrounding: true,
        structuredOutput: true,
        maxTokens: 1048576,
      },
    },
  ],
};

const mockRegistry = {
  languageModel: vi.fn(),
} as unknown as Parameters<typeof createSearchProvider>[2];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createSearchProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // External providers — correct class returned
  // -------------------------------------------------------------------------

  it("creates TavilyProvider for id='tavily'", () => {
    const provider = createSearchProvider(config({ id: "tavily" }));
    expect(provider).toBeInstanceOf(TavilyProvider);
  });

  it("creates FirecrawlProvider for id='firecrawl'", () => {
    const provider = createSearchProvider(config({ id: "firecrawl" }));
    expect(provider).toBeInstanceOf(FirecrawlProvider);
  });

  it("creates ExaProvider for id='exa'", () => {
    const provider = createSearchProvider(config({ id: "exa" }));
    expect(provider).toBeInstanceOf(ExaProvider);
  });

  it("creates BraveProvider for id='brave'", () => {
    const provider = createSearchProvider(config({ id: "brave" }));
    expect(provider).toBeInstanceOf(BraveProvider);
  });

  it("creates SearXNGProvider for id='searxng'", () => {
    const provider = createSearchProvider(config({ id: "searxng" }));
    expect(provider).toBeInstanceOf(SearXNGProvider);
  });

  // -------------------------------------------------------------------------
  // Model-native
  // -------------------------------------------------------------------------

  it("creates ModelNativeSearchProvider for id='model-native' with providerConfig + registry", () => {
    const provider = createSearchProvider(
      config({ id: "model-native" }),
      mockProviderConfig,
      mockRegistry,
    );
    expect(provider).toBeInstanceOf(ModelNativeSearchProvider);
  });

  it("throws for model-native without providerConfig", () => {
    expect(() =>
      createSearchProvider(config({ id: "model-native" }), undefined, mockRegistry),
    ).toThrow(/model-native.*providerConfig.*registry/i);
  });

  it("throws for model-native without registry", () => {
    expect(() =>
      createSearchProvider(config({ id: "model-native" }), mockProviderConfig, undefined),
    ).toThrow(/model-native.*providerConfig.*registry/i);
  });

  it("throws for model-native without providerConfig or registry", () => {
    expect(() =>
      createSearchProvider(config({ id: "model-native" })),
    ).toThrow(/model-native.*providerConfig.*registry/i);
  });

  // -------------------------------------------------------------------------
  // Unknown provider
  // -------------------------------------------------------------------------

  it("throws for unknown provider ID", () => {
    expect(() =>
      createSearchProvider({ id: "unknown-provider" as SearchProviderConfig["id"] }),
    ).toThrow(/unknown search provider/i);
  });

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------

  it("logs provider creation for external providers", () => {
    const loggerSpy = vi.spyOn(logger, "info");
    createSearchProvider(config({ id: "tavily" }));
    expect(loggerSpy).toHaveBeenCalledWith(
      "Creating external search provider",
      expect.objectContaining({ id: "tavily" }),
    );
  });

  it("logs provider creation for model-native", () => {
    const loggerSpy = vi.spyOn(logger, "info");
    createSearchProvider(
      config({ id: "model-native" }),
      mockProviderConfig,
      mockRegistry,
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      "Creating model-native search provider",
      expect.objectContaining({ providerId: "google" }),
    );
  });
});
