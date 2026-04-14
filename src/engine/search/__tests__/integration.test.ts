import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock utilities — vi.hoisted runs before vi.mock factory functions
// ---------------------------------------------------------------------------

const { streamFn, generateFn } = vi.hoisted(() => ({
  streamFn: vi.fn(),
  generateFn: vi.fn(),
}));

vi.mock("@/engine/provider/registry", () => ({
  createRegistry: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockReturnValue({}),
  }),
  resolveModel: vi.fn().mockReturnValue({}),
  getDefaultModel: vi.fn().mockReturnValue({}),
}));

vi.mock("@/engine/provider/streaming", () => ({
  streamWithAbort: vi.fn().mockImplementation((...args: unknown[]) =>
    streamFn(...args),
  ),
  generateStructured: vi.fn().mockImplementation((...args: unknown[]) =>
    generateFn(...args),
  ),
}));

vi.mock("@/engine/provider/factory", () => ({
  createProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockReturnValue({}),
  }),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { ResearchOrchestrator } from "@/engine/research/orchestrator";
import type { ResearchConfig } from "@/engine/research/types";
import type { SearchProvider } from "@/engine/research/search-provider";
import type { SearchProviderCallOptions } from "@/engine/search/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A mock search provider that records call options and returns realistic
 * source + image data.
 */
class MockSearchProvider implements SearchProvider {
  public readonly calls: Array<{
    query: string;
    options?: SearchProviderCallOptions;
  }> = [];

  async search(
    query: string,
    options?: SearchProviderCallOptions,
  ): Promise<{ sources: { title: string; url: string }[]; images: { url: string }[] }> {
    this.calls.push({ query, options });

    return {
      sources: [
        { title: `Result for: ${query}`, url: `https://example.com/${encodeURIComponent(query)}` },
      ],
      images: [
        { url: `https://img.example.com/${encodeURIComponent(query)}.jpg` },
      ],
    };
  }
}

function makeConfig(): ResearchConfig {
  return {
    topic: "test topic",
    language: "en",
    stepModelMap: {},
    providerConfigs: [
      {
        id: "google",
        apiKey: "test-key",
        models: [
          {
            id: "gemini-2.5-flash",
            name: "Gemini Flash",
            role: "thinking",
            capabilities: {
              reasoning: false,
              searchGrounding: false,
              structuredOutput: true,
              maxOutputTokens: 1048576,
            },
          },
          {
            id: "gemini-2.5-flash",
            name: "Gemini Flash",
            role: "networking",
            capabilities: {
              reasoning: false,
              searchGrounding: false,
              structuredOutput: true,
              maxOutputTokens: 1048576,
            },
          },
        ],
      },
    ],
    promptOverrides: {},
  };
}

/**
 * Configure the mock streaming to yield text deltas and complete.
 */
function setupStreamMock(text = "mock response text"): void {
  streamFn.mockResolvedValue({
    fullStream: (async function* () {
      yield { type: "text-delta", text: text };
    })(),
  });
}

/**
 * Configure the mock structured generation to return SERP queries.
 */
function setupSerpQueries(queries: Array<{ query: string; researchGoal: string }>): void {
  generateFn.mockResolvedValue(queries);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Orchestrator search integration", () => {
  beforeEach(() => {
    // clearAllMocks — NOT restoreAllMocks — to keep vi.mock factories intact
    vi.clearAllMocks();

    // Default: streaming returns text
    setupStreamMock();
    // Default: structured generation returns empty array
    setupSerpQueries([]);
  });

  it("passes abortSignal to search provider during initial search", async () => {
    const searchProvider = new MockSearchProvider();
    setupStreamMock("Analysis learning");
    setupSerpQueries([{ query: "test query", researchGoal: "learn about testing" }]);

    const orchestrator = new ResearchOrchestrator(
      makeConfig(),
      searchProvider,
    );

    const result = await orchestrator.researchFromPlan("## Plan\n1. Research testing");

    // Verify the search provider was called with options containing abortSignal
    expect(searchProvider.calls.length).toBeGreaterThan(0);

    for (const call of searchProvider.calls) {
      expect(call.options).toBeDefined();
      expect(call.options?.abortSignal).toBeInstanceOf(AbortSignal);
    }

    expect(result).not.toBeNull();
    expect(result!.sources.length).toBeGreaterThan(0);
  });

  it("passes abortSignal to search provider during review search", async () => {
    const searchProvider = new MockSearchProvider();
    // Review structured output returns a follow-up query
    setupSerpQueries([{ query: "follow-up query", researchGoal: "deeper dive" }]);
    // Follow-up search + analyze
    setupStreamMock("Follow-up analysis");

    const config = makeConfig();

    const orchestrator = new ResearchOrchestrator(config, searchProvider);
    const result = await orchestrator.reviewOnly(
      "## Plan\n1. Research X",
      ["Initial learning"],
      [],
      [],
    );

    // Should have been called once — review follow-up
    expect(searchProvider.calls.length).toBeGreaterThanOrEqual(1);

    for (const call of searchProvider.calls) {
      expect(call.options).toBeDefined();
      expect(call.options?.abortSignal).toBeInstanceOf(AbortSignal);
    }

    expect(result).not.toBeNull();
  });

  it("sources and images flow through the pipeline", async () => {
    const searchProvider = new MockSearchProvider();
    setupSerpQueries([{ query: "quantum computing", researchGoal: "understand advances" }]);
    setupStreamMock("Quantum computing is advancing rapidly.");

    const orchestrator = new ResearchOrchestrator(makeConfig(), searchProvider);

    const result = await orchestrator.researchFromPlan(
      "## Plan\n1. Research quantum computing",
    );

    expect(result).not.toBeNull();
    expect(result!.sources).toHaveLength(1);
    expect(result!.sources[0].title).toBe("Result for: quantum computing");
  });

  it("remains backward-compatible with NoOpSearchProvider (no options)", async () => {
    const { NoOpSearchProvider } = await import("@/engine/research/search-provider");

    // No SERP queries — empty research phase
    const orchestrator = new ResearchOrchestrator(
      makeConfig(),
      new NoOpSearchProvider(),
    );

    // Should complete without error — NoOp ignores options
    const result = await orchestrator.researchFromPlan("# Plan\n1. Step");
    expect(result).not.toBeNull();
    expect(result!.sources).toEqual([]);
    expect(result!.images).toEqual([]);
  });
});
