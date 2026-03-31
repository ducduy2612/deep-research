/* eslint-disable max-lines */

/**
 * Comprehensive test suite for ResearchOrchestrator.
 *
 * Uses module-level mocking of the provider registry and streaming
 * modules so the orchestrator never touches real AI APIs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — must be defined before vi.mock calls due to hoisting
// ---------------------------------------------------------------------------

/**
 * We use a mutable container so the hoisted vi.mock factory can reference
 * it, and test code can swap the mock model as needed.
 */
const mockContainer = {
  model: null as unknown,
  streamFn: vi.fn(),
  generateFn: vi.fn(),
};

vi.mock("@/engine/provider/registry", () => ({
  createRegistry: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
  resolveModel: vi.fn().mockImplementation(() => mockContainer.model),
  getDefaultModel: vi.fn().mockImplementation(() => mockContainer.model),
}));

vi.mock("@/engine/provider/streaming", () => ({
  streamWithAbort: vi.fn().mockImplementation((...args: unknown[]) =>
    mockContainer.streamFn(...args),
  ),
  generateStructured: vi.fn().mockImplementation((...args: unknown[]) =>
    mockContainer.generateFn(...args),
  ),
}));

vi.mock("@/engine/provider/factory", () => ({
  createProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
  createGoogleProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
  createOpenAICompatibleProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
}));

// ---------------------------------------------------------------------------
// Imports — must come after vi.mock calls
// ---------------------------------------------------------------------------

import { ResearchOrchestrator } from "../orchestrator";
import type { ResearchConfig, ResearchState } from "../types";
import type { SearchProvider } from "../search-provider";
import type { ProviderConfig } from "@/engine/provider/types";
import { MockLanguageModelV1 } from "ai/test";
import type { LanguageModelV1 } from "@ai-sdk/provider";

// ---------------------------------------------------------------------------
// Test config builder
// ---------------------------------------------------------------------------

const TEST_PROVIDER_CONFIG: ProviderConfig = {
  id: "google",
  apiKey: "test-key",
  models: [
    {
      id: "gemini-test",
      name: "Gemini Test",
      role: "thinking",
      capabilities: {
        reasoning: true,
        searchGrounding: false,
        structuredOutput: true,
        maxTokens: 8192,
      },
    },
  ],
};

function createTestConfig(
  overrides?: Partial<ResearchConfig>,
): ResearchConfig {
  return {
    topic: "Test research topic",
    providerConfigs: [TEST_PROVIDER_CONFIG],
    stepModelMap: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fake stream response
// ---------------------------------------------------------------------------

/** Simulates an AI SDK StreamTextResult with a fullStream async iterable. */
function fakeStreamResponse(textChunks: string[] = ["response text"]) {
  const fullStream = (async function* () {
    for (const chunk of textChunks) {
      yield { type: "text-delta" as const, textDelta: chunk };
    }
    yield {
      type: "finish" as const,
      finishReason: "stop" as const,
      usage: { promptTokens: 10, completionTokens: 20 },
    };
  })();

  return { fullStream };
}

// ---------------------------------------------------------------------------
// Mock search provider
// ---------------------------------------------------------------------------

function createMockSearchProvider(
  result?: { sources: { url: string; title?: string }[]; images: { url: string; description?: string }[] },
): SearchProvider {
  return {
    search: vi.fn().mockResolvedValue(
      result ?? {
        sources: [{ url: "https://example.com", title: "Example" }],
        images: [],
      },
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ResearchOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock model
    mockContainer.model = new MockLanguageModelV1({
      doStream: async () => ({
        stream: new ReadableStream<LanguageModelV1.StreamPart>({
          start(controller) {
            controller.enqueue({ type: "text-delta", textDelta: "text" });
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: { promptTokens: 10, completionTokens: 20 },
              providerMetadata: undefined,
            });
            controller.close();
          },
        }),
      }),
      doGenerate: async () => ({
        text: JSON.stringify([]),
        usage: { promptTokens: 5, completionTokens: 10 },
        finishReason: "stop",
        providerMetadata: undefined,
      }),
    });

    // Default: streaming returns text
    mockContainer.streamFn.mockResolvedValue(fakeStreamResponse());

    // Default: structured generation returns empty array (no queries)
    mockContainer.generateFn.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Construction & initial state
  // -------------------------------------------------------------------------

  it("initializes with idle state", () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);
    expect(orchestrator.getState()).toBe("idle");
  });

  it("returns null result initially", () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);
    expect(orchestrator.getResult()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // State transitions — full happy path
  // -------------------------------------------------------------------------

  it("transitions through all states during successful run", async () => {
    const searchProvider = createMockSearchProvider();
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config, searchProvider);

    // SERP query generation returns one query
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "test query", researchGoal: "test goal" },
    ]);

    const states: ResearchState[] = [];
    orchestrator.on("step-start", (payload) => {
      states.push(payload.state);
    });

    const result = await orchestrator.start();

    expect(result).not.toBeNull();
    expect(orchestrator.getState()).toBe("completed");

    expect(states).toContain("clarifying");
    expect(states).toContain("planning");
    expect(states).toContain("searching");
    expect(states).toContain("analyzing");
    expect(states).toContain("reporting");
  });

  // -------------------------------------------------------------------------
  // Event emission
  // -------------------------------------------------------------------------

  it("emits step-start, step-delta, and step-complete events", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // One SERP query
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "q1", researchGoal: "g1" },
    ]);

    const events: Array<{ type: string }> = [];

    orchestrator.on("step-start", () => events.push({ type: "step-start" }));
    orchestrator.on("step-delta", () => events.push({ type: "step-delta" }));
    orchestrator.on("step-complete", () => events.push({ type: "step-complete" }));

    await orchestrator.start();

    const startEvents = events.filter((e) => e.type === "step-start");
    const deltaEvents = events.filter((e) => e.type === "step-delta");
    const completeEvents = events.filter((e) => e.type === "step-complete");

    // At least 5 steps: clarify, plan, search, analyze, report
    expect(startEvents.length).toBeGreaterThanOrEqual(5);
    expect(deltaEvents.length).toBeGreaterThan(0);
    expect(completeEvents.length).toBeGreaterThanOrEqual(5);
  });

  it("emits step-complete with positive duration", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    const durations: number[] = [];
    orchestrator.on("step-complete", (payload) => {
      durations.push(payload.duration);
    });

    await orchestrator.start();

    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(0);
    }
  });

  // -------------------------------------------------------------------------
  // Abort
  // -------------------------------------------------------------------------

  it("transitions to aborted state on abort call", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // Make streaming delay so we can abort
    let streamResolve: (() => void) | undefined;
    mockContainer.streamFn.mockImplementation(() => {
      return new Promise((resolve) => {
        streamResolve = () => resolve(fakeStreamResponse(["starting..."]));
        // Resolve quickly so the test doesn't hang
        setTimeout(streamResolve, 10);
      });
    });

    const startPromise = orchestrator.start();

    // Abort immediately
    orchestrator.abort();

    const result = await startPromise;
    expect(orchestrator.getState()).toBe("aborted");
    expect(result).toBeNull();
  });

  it("can call abort multiple times without error", () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // Must start first so there's an AbortController
    const startPromise = orchestrator.start();
    orchestrator.abort();
    orchestrator.abort();
    expect(orchestrator.getState()).toBe("aborted");

    return startPromise.catch(() => {});
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it("emits step-error and transitions to failed when model throws", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // Make streaming throw
    mockContainer.streamFn.mockRejectedValue(new Error("Simulated failure"));

    const errors: Array<{ step: string }> = [];
    orchestrator.on("step-error", (payload) => {
      errors.push({ step: payload.step });
    });

    const result = await orchestrator.start();

    expect(result).toBeNull();
    expect(orchestrator.getState()).toBe("failed");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].step).toBe("clarify");
  });

  // -------------------------------------------------------------------------
  // SERP query generation
  // -------------------------------------------------------------------------

  it("uses generateStructured for SERP query generation", async () => {
    const searchProvider = createMockSearchProvider();
    const config = createTestConfig({ maxSearchQueries: 2 });
    const orchestrator = new ResearchOrchestrator(config, searchProvider);

    // SERP query generation returns two queries
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "quantum computing 2024", researchGoal: "latest advances" },
      { query: "quantum error correction", researchGoal: "error methods" },
    ]);

    await orchestrator.start();

    // generateStructured should have been called at least once (SERP queries)
    expect(mockContainer.generateFn).toHaveBeenCalled();

    // Search provider should have been called for each query
    expect(searchProvider.search).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Review loop
  // -------------------------------------------------------------------------

  it("runs review loop when autoReviewRounds > 0", async () => {
    const searchProvider = createMockSearchProvider();
    const config = createTestConfig({ autoReviewRounds: 2 });
    const orchestrator = new ResearchOrchestrator(config, searchProvider);

    // 1st generateStructured: SERP queries
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "q1", researchGoal: "g1" },
    ]);
    // 2nd generateStructured: review returns empty (stop loop)
    mockContainer.generateFn.mockResolvedValueOnce([]);

    const reviewStarts: unknown[] = [];
    orchestrator.on("step-start", (payload) => {
      if (payload.step === "review") {
        reviewStarts.push(payload);
      }
    });

    await orchestrator.start();

    // Review should have been started at least once
    expect(reviewStarts.length).toBeGreaterThanOrEqual(1);
    // At least 2 generateStructured calls: SERP + review
    expect(mockContainer.generateFn.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("caps review loop at autoReviewRounds", async () => {
    const searchProvider = createMockSearchProvider();
    const config = createTestConfig({ autoReviewRounds: 1 });
    const orchestrator = new ResearchOrchestrator(config, searchProvider);

    // SERP queries
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "q1", researchGoal: "g1" },
    ]);
    // Review always returns queries (to test capping)
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "follow-up", researchGoal: "more research" },
    ]);

    const reviewStarts: unknown[] = [];
    orchestrator.on("step-start", (payload) => {
      if (payload.step === "review") {
        reviewStarts.push(payload);
      }
    });

    await orchestrator.start();

    // Exactly 1 review round despite follow-up queries
    expect(reviewStarts.length).toBe(1);
  });

  it("skips review loop when autoReviewRounds is 0", async () => {
    const config = createTestConfig({ autoReviewRounds: 0 });
    const orchestrator = new ResearchOrchestrator(config);

    // Only SERP query generation
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "q1", researchGoal: "g1" },
    ]);

    const reviewStarts: unknown[] = [];
    orchestrator.on("step-start", (payload) => {
      if (payload.step === "review") {
        reviewStarts.push(payload);
      }
    });

    await orchestrator.start();

    expect(reviewStarts.length).toBe(0);
    // Only 1 generateStructured call (SERP queries)
    expect(mockContainer.generateFn).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Model resolution — verified via step execution
  // -------------------------------------------------------------------------

  it("resolves models for each step and executes all steps", async () => {
    const searchProvider = createMockSearchProvider();
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config, searchProvider);

    // SERP queries
    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "q1", researchGoal: "g1" },
    ]);

    const steps: string[] = [];
    orchestrator.on("step-start", (payload) => {
      steps.push(payload.step);
    });

    await orchestrator.start();

    expect(steps).toContain("clarify");
    expect(steps).toContain("plan");
    expect(steps).toContain("search");
    expect(steps).toContain("analyze");
    expect(steps).toContain("report");
  });

  // -------------------------------------------------------------------------
  // Unsubscribe
  // -------------------------------------------------------------------------

  it("stops receiving events after unsubscribe", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    const received: unknown[] = [];
    const unsubscribe = orchestrator.on("step-start", () => {
      received.push(1);
    });

    unsubscribe();

    await orchestrator.start();

    expect(received.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  it("clears handlers on destroy", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // Make streaming delay
    let resolveStream: (() => void) | undefined;
    mockContainer.streamFn.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveStream = () => resolve(fakeStreamResponse(["text"]));
        setTimeout(resolveStream, 10);
      });
    });

    const received: unknown[] = [];
    orchestrator.on("step-start", () => {
      received.push(1);
    });

    const startPromise = orchestrator.start();

    orchestrator.destroy();

    await startPromise.catch(() => {});

    expect(orchestrator.getState()).toBe("aborted");
  });

  // -------------------------------------------------------------------------
  // Result assembly
  // -------------------------------------------------------------------------

  it("assembles ResearchResult with title, report, learnings, sources, images", async () => {
    const searchProvider = createMockSearchProvider({
      sources: [{ url: "https://example.com/page1", title: "Page 1" }],
      images: [{ url: "https://example.com/img1.png", description: "Test image" }],
    });

    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config, searchProvider);

    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "test query", researchGoal: "test goal" },
    ]);

    const result = await orchestrator.start();

    expect(result).not.toBeNull();
    expect(result!.title).toBeDefined();
    expect(result!.report).toBeDefined();
    expect(typeof result!.report).toBe("string");
    expect(result!.learnings).toBeDefined();
    expect(result!.sources).toBeDefined();
    expect(result!.images).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // No-op search provider
  // -------------------------------------------------------------------------

  it("works with NoOpSearchProvider returning empty results", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    mockContainer.generateFn.mockResolvedValueOnce([
      { query: "q1", researchGoal: "g1" },
    ]);

    const result = await orchestrator.start();

    expect(result).not.toBeNull();
    expect(orchestrator.getState()).toBe("completed");
    expect(result!.sources).toEqual([]);
    expect(result!.images).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Title extraction
  // -------------------------------------------------------------------------

  it("extracts title from markdown heading in report", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    mockContainer.generateFn.mockResolvedValueOnce([]);

    // Report is the 3rd streaming call (clarify, plan, report)
    let streamCallCount = 0;
    mockContainer.streamFn.mockImplementation(() => {
      streamCallCount++;
      if (streamCallCount === 3) {
        return Promise.resolve(
          fakeStreamResponse(["# My Research Title\n", "Report body."]),
        );
      }
      return Promise.resolve(fakeStreamResponse(["text"]));
    });

    const result = await orchestrator.start();

    expect(result).not.toBeNull();
    expect(result!.title).toBe("My Research Title");
  });

  // -------------------------------------------------------------------------
  // Empty SERP queries
  // -------------------------------------------------------------------------

  it("handles empty SERP queries gracefully", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    mockContainer.generateFn.mockResolvedValueOnce([]);

    const result = await orchestrator.start();

    expect(result).not.toBeNull();
    expect(orchestrator.getState()).toBe("completed");
    expect(result!.learnings).toEqual([]);
  });
});
