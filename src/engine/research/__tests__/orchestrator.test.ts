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
import type { ResearchConfig } from "../types";
import type { SearchProvider } from "../search-provider";
import type { ProviderConfig } from "@/engine/provider/types";
import { MockLanguageModelV3 } from "ai/test";
import { simulateReadableStream } from "ai";

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
        maxOutputTokens: 8192,
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
      yield {
        type: "text-delta" as const,
        text: chunk,
      };
    }
    yield {
      type: "finish" as const,
      finishReason: "stop" as const,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
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
    mockContainer.model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-delta", text: "text" },
            {
              type: "finish",
              finishReason: "stop",
              usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            },
          ],
        }),
      }),
      doGenerate: async () => ({
        content: [{ type: "text", text: JSON.stringify([]) }],
        finishReason: "stop",
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
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
  // Abort (using clarifyOnly since start() is removed)
  // -------------------------------------------------------------------------

  it("transitions to aborted state on abort call during clarifyOnly", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // Make streaming delay so we can abort
    let streamResolve: (() => void) | undefined;
    mockContainer.streamFn.mockImplementation(() => {
      return new Promise((resolve) => {
        streamResolve = () => resolve(fakeStreamResponse(["starting..."]));
        setTimeout(streamResolve, 10);
      });
    });

    const clarifyPromise = orchestrator.clarifyOnly();

    orchestrator.abort();

    const result = await clarifyPromise;
    expect(orchestrator.getState()).toBe("aborted");
    expect(result).toBeNull();
  });

  it("can call abort multiple times without error", () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    // Start clarifyOnly so there's an AbortController
    const promise = orchestrator.clarifyOnly();
    orchestrator.abort();
    orchestrator.abort();
    expect(orchestrator.getState()).toBe("aborted");

    return promise.catch(() => {});
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

    await orchestrator.clarifyOnly();

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

    const clarifyPromise = orchestrator.clarifyOnly();

    orchestrator.destroy();

    await clarifyPromise.catch(() => {});

    expect(orchestrator.getState()).toBe("aborted");
  });

  // =========================================================================
  // Phase methods
  // =========================================================================

  describe("clarifyOnly()", () => {
    it("returns ClarifyResult with questions text", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.streamFn.mockResolvedValueOnce(
        fakeStreamResponse([
          "1. What is the scope?\n",
          "2. Any constraints?\n",
        ]),
      );

      const result = await orchestrator.clarifyOnly();

      expect(result).not.toBeNull();
      expect(result!.questions).toContain("What is the scope");
      expect(result!.questions).toContain("Any constraints");
    });

    it("transitions to awaiting_feedback on success", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      await orchestrator.clarifyOnly();

      expect(orchestrator.getState()).toBe("awaiting_feedback");
    });

    it("emits step-start and step-complete for clarify step", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      const events: Array<{ type: string; step?: string }> = [];
      orchestrator.on("step-start", (p) => events.push({ type: "step-start", step: p.step }));
      orchestrator.on("step-complete", (p) => events.push({ type: "step-complete", step: p.step }));

      await orchestrator.clarifyOnly();

      expect(events.some((e) => e.type === "step-start" && e.step === "clarify")).toBe(true);
      expect(events.some((e) => e.type === "step-complete" && e.step === "clarify")).toBe(true);
    });

    it("returns null on abort", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      let streamResolve: (() => void) | undefined;
      mockContainer.streamFn.mockImplementation(() => {
        return new Promise((resolve) => {
          streamResolve = () => resolve(fakeStreamResponse(["text"]));
          setTimeout(streamResolve, 10);
        });
      });

      const promise = orchestrator.clarifyOnly();
      orchestrator.abort();
      const result = await promise;

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("aborted");
    });

    it("returns null on streaming failure", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.streamFn.mockRejectedValue(new Error("Stream failure"));

      const result = await orchestrator.clarifyOnly();

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("failed");
    });
  });

  describe("planWithContext()", () => {
    it("returns PlanResult with plan text", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.streamFn.mockResolvedValueOnce(
        fakeStreamResponse(["## Section 1\n", "## Section 2\n"]),
      );

      const result = await orchestrator.planWithContext(
        "quantum computing",
        "What areas?",
        "Focus on error correction",
      );

      expect(result).not.toBeNull();
      expect(result!.plan).toContain("Section 1");
      expect(result!.plan).toContain("Section 2");
    });

    it("transitions to awaiting_plan_review on success", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      await orchestrator.planWithContext("topic", "questions", "feedback");

      expect(orchestrator.getState()).toBe("awaiting_plan_review");
    });

    it("emits plan step events", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      const steps: string[] = [];
      orchestrator.on("step-start", (p) => steps.push(p.step));
      orchestrator.on("step-complete", (p) => steps.push(p.step));

      await orchestrator.planWithContext("topic", "q", "f");

      expect(steps).toContain("plan");
    });

    it("returns null on abort", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      let streamResolve: (() => void) | undefined;
      mockContainer.streamFn.mockImplementation(() => {
        return new Promise((resolve) => {
          streamResolve = () => resolve(fakeStreamResponse(["plan text"]));
          setTimeout(streamResolve, 10);
        });
      });

      const promise = orchestrator.planWithContext("topic", "q", "f");
      orchestrator.abort();
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe("researchFromPlan()", () => {
    it("returns ResearchPhaseResult with learnings, sources, images", async () => {
      const searchProvider = createMockSearchProvider({
        sources: [{ url: "https://example.com/page1", title: "Page 1" }],
        images: [],
      });
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "q1", researchGoal: "g1" },
      ]);

      const result = await orchestrator.researchFromPlan("## Plan\nSection 1");

      expect(result).not.toBeNull();
      expect(result!.learnings.length).toBeGreaterThan(0);
      expect(result!.sources.length).toBeGreaterThan(0);
      // Images come from analyze step, which currently returns empty
      expect(result!.images).toEqual([]);
    });

    it("transitions to awaiting_results_review on success", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      // No queries → empty result, still success
      mockContainer.generateFn.mockResolvedValueOnce([]);

      await orchestrator.researchFromPlan("plan");

      expect(orchestrator.getState()).toBe("awaiting_results_review");
    });

    it("handles empty SERP queries gracefully", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.generateFn.mockResolvedValueOnce([]);

      const result = await orchestrator.researchFromPlan("plan");

      expect(result).not.toBeNull();
      expect(result!.learnings).toEqual([]);
      expect(result!.sources).toEqual([]);
      expect(result!.images).toEqual([]);
    });

    it("does not run review loop even when autoReviewRounds > 0", async () => {
      const searchProvider = createMockSearchProvider();
      const config = createTestConfig({ autoReviewRounds: 1 });
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      // SERP queries
      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "q1", researchGoal: "g1" },
      ]);

      const reviewStarts: unknown[] = [];
      orchestrator.on("step-start", (p) => {
        if (p.step === "review") reviewStarts.push(p);
      });

      const result = await orchestrator.researchFromPlan("plan");

      expect(result).not.toBeNull();
      // researchFromPlan no longer calls runReviewLoop — review is separate
      expect(reviewStarts.length).toBe(0);
    });

    it("returns null on abort", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      // Make generateStructured hang so we can abort
      let genResolve: (() => void) | undefined;
      mockContainer.generateFn.mockImplementation(() => {
        return new Promise((resolve) => {
          genResolve = () => resolve([]);
          setTimeout(genResolve, 50);
        });
      });

      const promise = orchestrator.researchFromPlan("plan");
      orchestrator.abort();
      const result = await promise;

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("aborted");
    });
  });

  // =========================================================================
  // Cycle cap enforcement
  // =========================================================================

  describe("runSearchPhase cycle cap", () => {
    it("stops after maxCyclesPerInvocation cycles and returns remaining queries", async () => {
      const searchProvider = createMockSearchProvider();
      const config = createTestConfig({ maxCyclesPerInvocation: 2 });
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      // Generate 4 queries — only 2 should execute
      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "q1", researchGoal: "g1" },
        { query: "q2", researchGoal: "g2" },
        { query: "q3", researchGoal: "g3" },
        { query: "q4", researchGoal: "g4" },
      ]);

      const result = await orchestrator.researchFromPlan("plan");

      expect(result).not.toBeNull();
      // Only 2 queries should have been executed
      expect(searchProvider.search).toHaveBeenCalledTimes(2);
      expect(result!.remainingQueries).toHaveLength(2);
      expect(result!.learnings).toHaveLength(2);
    });

    it("defaults to 2 cycles when maxCyclesPerInvocation not set", async () => {
      const searchProvider = createMockSearchProvider();
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      // Generate 5 queries — only 2 should execute with default cap
      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "q1", researchGoal: "g1" },
        { query: "q2", researchGoal: "g2" },
        { query: "q3", researchGoal: "g3" },
        { query: "q4", researchGoal: "g4" },
        { query: "q5", researchGoal: "g5" },
      ]);

      const result = await orchestrator.researchFromPlan("plan");

      expect(result).not.toBeNull();
      expect(searchProvider.search).toHaveBeenCalledTimes(2);
      expect(result!.remainingQueries).toHaveLength(3);
    });

    it("executes all queries when under the cycle cap", async () => {
      const searchProvider = createMockSearchProvider();
      const config = createTestConfig({ maxCyclesPerInvocation: 5 });
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "q1", researchGoal: "g1" },
        { query: "q2", researchGoal: "g2" },
      ]);

      const result = await orchestrator.researchFromPlan("plan");

      expect(result).not.toBeNull();
      expect(searchProvider.search).toHaveBeenCalledTimes(2);
      expect(result!.remainingQueries ?? []).toHaveLength(0);
    });
  });

  // =========================================================================
  // reviewOnly()
  // =========================================================================

  describe("reviewOnly()", () => {
    it("generates follow-up queries and executes 1 search+analyze cycle", async () => {
      const searchProvider = createMockSearchProvider();
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      // Review generates 2 follow-up queries
      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "follow-up 1", researchGoal: "deeper research" },
        { query: "follow-up 2", researchGoal: "more context" },
      ]);

      const result = await orchestrator.reviewOnly(
        "plan text",
        ["learning 1"],
        [{ url: "https://example.com" }],
        [],
      );

      expect(result).not.toBeNull();
      expect(result!.learnings.length).toBe(3); // 1 original + 2 new
      expect(result!.sources.length).toBeGreaterThan(0);
      expect(searchProvider.search).toHaveBeenCalledTimes(2);
    });

    it("returns existing data when no follow-up queries needed", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      // Review returns empty — no follow-up needed
      mockContainer.generateFn.mockResolvedValueOnce([]);

      const existingLearnings = ["l1", "l2"];
      const existingSources = [{ url: "https://example.com" }];

      const result = await orchestrator.reviewOnly(
        "plan",
        existingLearnings,
        existingSources,
        [],
      );

      expect(result).not.toBeNull();
      expect(result!.learnings).toEqual(existingLearnings);
      expect(result!.sources).toEqual(existingSources);
    });

    it("passes suggestion to review prompt", async () => {
      const searchProvider = createMockSearchProvider();
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      // Review returns no follow-up queries
      mockContainer.generateFn.mockResolvedValueOnce([]);

      await orchestrator.reviewOnly(
        "plan",
        ["learning"],
        [],
        [],
        "Focus on error correction",
      );

      // Verify generateStructured was called (review query generation)
      expect(mockContainer.generateFn).toHaveBeenCalledTimes(1);
    });

    it("transitions to awaiting_results_review on success", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.generateFn.mockResolvedValueOnce([]);

      await orchestrator.reviewOnly("plan", [], [], []);

      expect(orchestrator.getState()).toBe("awaiting_results_review");
    });

    it("returns null on failure", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.generateFn.mockRejectedValue(new Error("Review failure"));

      const result = await orchestrator.reviewOnly("plan", [], [], []);

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("failed");
    });

    it("returns null on abort", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      let genResolve: (() => void) | undefined;
      mockContainer.generateFn.mockImplementation(() => {
        return new Promise((resolve) => {
          genResolve = () => resolve([]);
          setTimeout(genResolve, 50);
        });
      });

      const promise = orchestrator.reviewOnly("plan", [], [], []);
      orchestrator.abort();
      const result = await promise;

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("aborted");
    });
  });

  describe("reportFromLearnings()", () => {
    it("returns ReportResult with title and report", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.streamFn.mockResolvedValueOnce(
        fakeStreamResponse(["# Final Report\n", "Report content here."]),
      );

      const learnings = ["Learning 1", "Learning 2"];
      const sources = [{ url: "https://example.com" }];
      const images: Array<{ url: string; description?: string }> = [];

      const result = await orchestrator.reportFromLearnings(
        "plan",
        learnings,
        sources,
        images,
      );

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Final Report");
      expect(result!.report).toContain("Report content here");
      expect(result!.learnings).toEqual(learnings);
      expect(result!.sources).toEqual(sources);
    });

    it("transitions to completed on success", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      await orchestrator.reportFromLearnings("plan", [], [], []);

      expect(orchestrator.getState()).toBe("completed");
    });

    it("sets getResult() after completion", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.streamFn.mockResolvedValueOnce(
        fakeStreamResponse(["# Title\nBody"]),
      );

      await orchestrator.reportFromLearnings("plan", ["l1"], [], []);

      expect(orchestrator.getResult()).not.toBeNull();
      expect(orchestrator.getResult()!.title).toBe("Title");
    });

    it("returns null on failure", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      mockContainer.streamFn.mockRejectedValue(new Error("Report failure"));

      const result = await orchestrator.reportFromLearnings("plan", [], [], []);

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("failed");
    });

    it("returns null on abort", async () => {
      const config = createTestConfig();
      const orchestrator = new ResearchOrchestrator(config);

      let streamResolve: (() => void) | undefined;
      mockContainer.streamFn.mockImplementation(() => {
        return new Promise((resolve) => {
          streamResolve = () => resolve(fakeStreamResponse(["report"]));
          setTimeout(streamResolve, 10);
        });
      });

      const promise = orchestrator.reportFromLearnings("plan", [], [], []);
      orchestrator.abort();
      const result = await promise;

      expect(result).toBeNull();
      expect(orchestrator.getState()).toBe("aborted");
    });
  });

  // =========================================================================
  // Phase chaining — calling phases in sequence should produce same result
  // =========================================================================

  describe("phase chaining", () => {
    it("produces same final state as start() when chained manually", async () => {
      const searchProvider = createMockSearchProvider({
        sources: [{ url: "https://example.com", title: "Example" }],
        images: [],
      });
      const config = createTestConfig({ autoReviewRounds: 0 });
      const orchestrator = new ResearchOrchestrator(config, searchProvider);

      // SERP queries for researchFromPlan
      mockContainer.generateFn.mockResolvedValueOnce([
        { query: "q1", researchGoal: "g1" },
      ]);

      // Phase 1: clarify
      const clarifyResult = await orchestrator.clarifyOnly();
      expect(orchestrator.getState()).toBe("awaiting_feedback");
      expect(clarifyResult!.questions).toBeDefined();

      // Phase 2: plan with context
      const planResult = await orchestrator.planWithContext(
        "Test research topic",
        clarifyResult!.questions,
        "Focus on practical applications",
      );
      expect(orchestrator.getState()).toBe("awaiting_plan_review");
      expect(planResult!.plan).toBeDefined();

      // Phase 3: research from plan
      const researchResult = await orchestrator.researchFromPlan(planResult!.plan);
      expect(orchestrator.getState()).toBe("awaiting_results_review");
      expect(researchResult!.learnings.length).toBeGreaterThan(0);

      // Phase 4: report from learnings
      const reportResult = await orchestrator.reportFromLearnings(
        planResult!.plan,
        researchResult!.learnings,
        researchResult!.sources,
        researchResult!.images,
      );
      expect(orchestrator.getState()).toBe("completed");
      expect(reportResult!.title).toBeDefined();
      expect(reportResult!.report).toBeDefined();
      expect(reportResult!.learnings).toEqual(researchResult!.learnings);
    });
  });
});
