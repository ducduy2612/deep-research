/* eslint-disable max-lines */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelNativeSearchProvider } from "../providers/model-native";
import type { ModelNativeSearchProviderOptions } from "../providers/model-native";
import type { ProviderConfig } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("ai", () => ({
  generateText: vi.fn(),
  createProviderRegistry: vi.fn(() => ({
    languageModel: vi.fn(),
  })),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => {
    const modelFn = vi.fn(() => "mock-google-model");
    return modelFn;
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({
    tools: {
      webSearchPreview: vi.fn(() => ({ type: "provider-defined", id: "openai.web_search_preview", args: {} })),
    },
  })),
}));

vi.mock("@/engine/provider/registry", () => ({
  resolveModel: vi.fn(() => "mock-resolved-model"),
  createRegistry: vi.fn(),
}));

vi.mock("@/engine/provider/factory", () => ({
  createProvider: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import mocked modules after vi.mock
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { resolveModel } from "@/engine/provider/registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
  id: ProviderConfig["id"],
  overrides: Partial<ProviderConfig> = {},
): ProviderConfig {
  return {
    id,
    apiKey: "test-api-key",
    models: [
      {
        id: `${id}-networking-model`,
        name: "Test Networking",
        role: "networking",
        capabilities: {
          reasoning: false,
          searchGrounding: true,
          structuredOutput: true,
          maxTokens: 4096,
        },
      },
    ],
    ...overrides,
  };
}

function makeOptions(
  id: ProviderConfig["id"],
  overrides: Partial<ModelNativeSearchProviderOptions> = {},
): ModelNativeSearchProviderOptions {
  return {
    providerConfig: makeConfig(id),
    registry: {} as never,
    ...overrides,
  };
}

function mockGenerateTextResult(sources: Array<{ url: string; title?: string }> = []) {
  return {
    text: "Generated text",
    sources: sources.map((s, i) => ({
      sourceType: "url" as const,
      id: String(i),
      url: s.url,
      title: s.title,
    })),
    toolCalls: [],
    toolResults: [],
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 20 },
    warnings: undefined,
    logprobs: undefined,
    request: {},
    response: {},
    steps: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ModelNativeSearchProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Google
  // -------------------------------------------------------------------------

  describe("Google provider", () => {
    it("creates model with useSearchGrounding=true and calls generateText", async () => {
      const googleModelFn = vi.fn(() => "mock-google-grounded-model");
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(
        googleModelFn as never,
      );

      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult([
          { url: "https://example.com", title: "Example" },
        ]) as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("google"),
      );
      const result = await provider.search("test query");

      // Google provider should be created with apiKey
      expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
      });

      // Model should be created with useSearchGrounding: true
      expect(googleModelFn).toHaveBeenCalledWith("google-networking-model", {
        useSearchGrounding: true,
      });

      // generateText should be called with the grounded model
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mock-google-grounded-model",
          prompt: "test query",
        }),
      );

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toEqual({
        url: "https://example.com",
        title: "Example",
      });
      expect(result.images).toEqual([]);
    });

    it("uses custom baseURL when configured", async () => {
      const googleModelFn = vi.fn(() => "model");
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(
        googleModelFn as never,
      );
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const provider = new ModelNativeSearchProvider({
        providerConfig: makeConfig("google", {
          baseURL: "https://custom.googleapis.com",
        }),
        registry: {} as never,
      });

      await provider.search("q");

      expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        baseURL: "https://custom.googleapis.com",
      });
    });
  });

  // -------------------------------------------------------------------------
  // OpenAI
  // -------------------------------------------------------------------------

  describe("OpenAI provider", () => {
    it("uses webSearchPreview tool and resolves model from registry", async () => {
      const mockWebSearchPreview = vi.fn(() => ({
        type: "provider-defined",
        id: "openai.web_search_preview",
        args: {},
      }));
      vi.mocked(createOpenAI).mockReturnValue({
        tools: { webSearchPreview: mockWebSearchPreview },
      } as never);

      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult([
          { url: "https://openai.com", title: "OpenAI" },
        ]) as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("openai"),
      );
      const result = await provider.search("test query");

      // OpenAI provider should be created with apiKey
      expect(createOpenAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
      });

      // Model should be resolved from registry
      expect(resolveModel).toHaveBeenCalledWith(
        expect.anything(),
        "openai:openai-networking-model",
      );

      // webSearchPreview tool should be configured
      expect(mockWebSearchPreview).toHaveBeenCalledWith({
        searchContextSize: "medium",
      });

      // generateText should be called with tools
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: {
            web_search_preview: expect.anything(),
          },
        }),
      );

      expect(result.sources).toHaveLength(1);
      expect(result.images).toEqual([]);
    });

    it("respects custom searchContextSize", async () => {
      const mockWebSearchPreview = vi.fn(() => ({
        type: "provider-defined",
        id: "openai.web_search_preview",
        args: {},
      }));
      vi.mocked(createOpenAI).mockReturnValue({
        tools: { webSearchPreview: mockWebSearchPreview },
      } as never);

      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const provider = new ModelNativeSearchProvider({
        ...makeOptions("openai"),
        searchContextSize: "high",
      });

      await provider.search("q");

      expect(mockWebSearchPreview).toHaveBeenCalledWith({
        searchContextSize: "high",
      });
    });
  });

  // -------------------------------------------------------------------------
  // OpenRouter
  // -------------------------------------------------------------------------

  describe("OpenRouter provider", () => {
    it("passes web plugin via providerOptions", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult([
          { url: "https://openrouter.com", title: "OpenRouter" },
        ]) as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("openrouter"),
      );
      const result = await provider.search("test query");

      expect(resolveModel).toHaveBeenCalledWith(
        expect.anything(),
        "openrouter:openrouter-networking-model",
      );

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openrouter: {
              plugins: [{ id: "web", max_results: 5 }],
            },
          },
        }),
      );

      expect(result.sources).toHaveLength(1);
      expect(result.images).toEqual([]);
    });

    it("respects custom maxResults from call options", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("openrouter"),
      );
      await provider.search("q", { maxResults: 10 });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openrouter: {
              plugins: [{ id: "web", max_results: 10 }],
            },
          },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // xAI
  // -------------------------------------------------------------------------

  describe("xAI provider", () => {
    it("passes search_parameters via providerOptions", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult([
          { url: "https://xai.com", title: "xAI" },
        ]) as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("xai"),
      );
      const result = await provider.search("test query");

      expect(resolveModel).toHaveBeenCalledWith(
        expect.anything(),
        "xai:xai-networking-model",
      );

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            xai: {
              search_parameters: {
                mode: "auto",
                max_search_results: 5,
              },
            },
          },
        }),
      );

      expect(result.sources).toHaveLength(1);
      expect(result.images).toEqual([]);
    });

    it("respects custom maxResults from call options", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("xai"),
      );
      await provider.search("q", { maxResults: 15 });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            xai: {
              search_parameters: {
                mode: "auto",
                max_search_results: 15,
              },
            },
          },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Unsupported providers
  // -------------------------------------------------------------------------

  describe("Unsupported providers", () => {
    it("throws for deepseek", async () => {
      const provider = new ModelNativeSearchProvider(
        makeOptions("deepseek"),
      );
      await expect(provider.search("q")).rejects.toThrow(
        "Model-native search is not available for provider 'deepseek'",
      );
    });

    it("throws for groq", async () => {
      const provider = new ModelNativeSearchProvider(
        makeOptions("groq"),
      );
      await expect(provider.search("q")).rejects.toThrow(
        "Model-native search is not available for provider 'groq'",
      );
    });
  });

  // -------------------------------------------------------------------------
  // No networking model
  // -------------------------------------------------------------------------

  describe("No networking model", () => {
    it("throws when provider has no networking model", async () => {
      const provider = new ModelNativeSearchProvider({
        providerConfig: {
          id: "google",
          apiKey: "key",
          models: [
            {
              id: "thinking-only",
              name: "Thinking Only",
              role: "thinking",
              capabilities: {
                reasoning: true,
                searchGrounding: false,
                structuredOutput: true,
                maxTokens: 8192,
              },
            },
          ],
        },
        registry: {} as never,
      });

      await expect(provider.search("q")).rejects.toThrow(
        "No networking model found for provider 'google'",
      );
    });
  });

  // -------------------------------------------------------------------------
  // Abort signal propagation
  // -------------------------------------------------------------------------

  describe("Abort signal propagation", () => {
    it("passes abortSignal to generateText for Google", async () => {
      const googleModelFn = vi.fn(() => "model");
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(
        googleModelFn as never,
      );
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const controller = new AbortController();
      const provider = new ModelNativeSearchProvider(
        makeOptions("google"),
      );
      await provider.search("q", { abortSignal: controller.signal });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: controller.signal,
        }),
      );
    });

    it("passes abortSignal to generateText for OpenAI", async () => {
      const mockWebSearchPreview = vi.fn(() => ({
        type: "provider-defined",
        id: "openai.web_search_preview",
        args: {},
      }));
      vi.mocked(createOpenAI).mockReturnValue({
        tools: { webSearchPreview: mockWebSearchPreview },
      } as never);

      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const controller = new AbortController();
      const provider = new ModelNativeSearchProvider(
        makeOptions("openai"),
      );
      await provider.search("q", { abortSignal: controller.signal });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: controller.signal,
        }),
      );
    });

    it("passes abortSignal to generateText for OpenRouter", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const controller = new AbortController();
      const provider = new ModelNativeSearchProvider(
        makeOptions("openrouter"),
      );
      await provider.search("q", { abortSignal: controller.signal });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: controller.signal,
        }),
      );
    });

    it("passes abortSignal to generateText for xAI", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const controller = new AbortController();
      const provider = new ModelNativeSearchProvider(
        makeOptions("xai"),
      );
      await provider.search("q", { abortSignal: controller.signal });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: controller.signal,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Source extraction
  // -------------------------------------------------------------------------

  describe("Source extraction", () => {
    it("filters to url sources only", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "Generated",
        sources: [
          { sourceType: "url", id: "0", url: "https://example.com", title: "URL Source" },
          { sourceType: "file" as never, id: "1" } as never,
        ],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20 },
      } as never);

      const googleModelFn = vi.fn(() => "model");
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(
        googleModelFn as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("google"),
      );
      const result = await provider.search("q");

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe("https://example.com");
    });

    it("includes title only when present", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "Generated",
        sources: [
          { sourceType: "url", id: "0", url: "https://a.com", title: "Has Title" },
          { sourceType: "url", id: "1", url: "https://b.com" },
        ],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20 },
      } as never);

      const googleModelFn = vi.fn(() => "model");
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(
        googleModelFn as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("google"),
      );
      const result = await provider.search("q");

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0]).toEqual({
        url: "https://a.com",
        title: "Has Title",
      });
      expect(result.sources[1]).toEqual({
        url: "https://b.com",
      });
    });

    it("always returns empty images array", async () => {
      vi.mocked(generateText).mockResolvedValue(
        mockGenerateTextResult() as never,
      );

      const googleModelFn = vi.fn(() => "model");
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(
        googleModelFn as never,
      );

      const provider = new ModelNativeSearchProvider(
        makeOptions("google"),
      );
      const result = await provider.search("q");

      expect(result.images).toEqual([]);
    });
  });
});
