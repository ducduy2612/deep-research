/**
 * Tests for research store freeze semantics, persist round-trip with
 * checkpoints, backward compatibility with old state, and manualQueries.
 *
 * Covers:
 *  - freeze() for all 4 phases (clarify, plan, research, report)
 *  - freeze() idempotency
 *  - freeze() overwrite (regeneration)
 *  - reset() clearing checkpoints
 *  - persist + hydrate round-trip with checkpoints
 *  - hydrate with old state missing checkpoints
 *  - manualQueries state and setter
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useResearchStore } from "@/stores/research-store";
import type { ResearchResult, SearchResult } from "@/engine/research/types";
import * as storage from "@/lib/storage";

// ---------------------------------------------------------------------------
// Mock storage — capture writes and provide reads
// ---------------------------------------------------------------------------

let storedData: Record<string, unknown> = {};

vi.mock("@/lib/storage", () => ({
  get: vi.fn(async (key: string) => storedData[key] ?? null),
  set: vi.fn(async (key: string, value: unknown) => {
    storedData[key] = value;
  }),
  remove: vi.fn(async (key: string) => {
    delete storedData[key];
  }),
  clear: vi.fn(async () => {
    storedData = {};
  }),
  localforage: {},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  useResearchStore.getState().reset();
  storedData = {};
  vi.clearAllMocks();
});

function dispatch(eventType: string, data: unknown) {
  useResearchStore.getState().handleEvent(eventType, data);
}

/** Advance to awaiting_feedback with questions populated. */
function advanceToAwaitingFeedback() {
  dispatch("start", { topic: "Quantum computing", phase: "clarify" });
  dispatch("step-start", { step: "clarify", state: "clarifying" });
  dispatch("step-delta", { step: "clarify", text: "1. What area?" });
  dispatch("step-complete", { step: "clarify", duration: 1000 });
  dispatch("clarify-result", {
    questions: "1. What area of quantum computing?",
  });
}

/** Advance to awaiting_plan_review with plan + search tasks. */
function advanceToAwaitingPlanReview() {
  advanceToAwaitingFeedback();
  useResearchStore.getState().setFeedback("Focus on error correction");
  dispatch("step-start", { step: "plan", state: "planning" });
  dispatch("step-delta", { step: "plan", text: "# Plan\n1. Background" });
  dispatch("step-complete", { step: "plan", duration: 2000 });
  dispatch("plan-result", {
    plan: "# Plan\n1. Background\n2. Error correction",
  });
  dispatch("search-task", {
    tasks: [
      { query: "quantum error correction", researchGoal: "Survey approaches" },
    ],
  });
}

/** Advance to awaiting_results_review with search results populated. */
function advanceToAwaitingResultsReview() {
  advanceToAwaitingPlanReview();
  dispatch("step-start", { step: "search", state: "searching" });
  dispatch("step-complete", { step: "search", duration: 3000 });
  dispatch("search-result", {
    query: "quantum error correction",
    sources: [{ url: "https://arxiv.org/paper1", title: "Surface Codes" }],
    images: [],
  });
  dispatch("research-result", {
    learnings: ["Surface codes are promising"],
    sources: [{ url: "https://arxiv.org/paper1", title: "Surface Codes" }],
    images: [],
  });
}

/** Advance to a state with a result available for report freeze. */
function advanceToReportReady(): ResearchResult {
  advanceToAwaitingResultsReview();
  const result: ResearchResult = {
    title: "Quantum Error Correction Report",
    report: "# Report\n\nContent here.",
    learnings: ["Surface codes are promising"],
    sources: [{ url: "https://arxiv.org/paper1", title: "Surface Codes" }],
    images: [],
  };
  dispatch("result", result);
  return result;
}

// ---------------------------------------------------------------------------
// freeze() semantics
// ---------------------------------------------------------------------------

describe("freeze() semantics", () => {
  describe("freeze clarify phase", () => {
    it("freezes clarify checkpoint with questions", () => {
      advanceToAwaitingFeedback();
      const before = Date.now();

      useResearchStore.getState().freeze("clarify");

      const cp = useResearchStore.getState().checkpoints.clarify;
      expect(cp).toBeDefined();
      expect(cp!.questions).toBe("1. What area of quantum computing?");
      expect(cp!.frozenAt).toBeGreaterThanOrEqual(before);
    });

    it("adds activity log entry for clarify freeze", () => {
      advanceToAwaitingFeedback();
      useResearchStore.getState().freeze("clarify");

      const log = useResearchStore.getState().activityLog;
      const entry = log.find((e) => e.message.includes("Checkpoint frozen: clarify"));
      expect(entry).toBeDefined();
      expect(entry!.message).toBe("Checkpoint frozen: clarify");
    });
  });

  describe("freeze plan phase", () => {
    it("freezes plan checkpoint with plan and search tasks", () => {
      advanceToAwaitingPlanReview();
      const before = Date.now();

      useResearchStore.getState().freeze("plan");

      const cp = useResearchStore.getState().checkpoints.plan;
      expect(cp).toBeDefined();
      expect(cp!.plan).toBe("# Plan\n1. Background\n2. Error correction");
      expect(cp!.searchTasks).toHaveLength(1);
      expect(cp!.searchTasks[0].query).toBe("quantum error correction");
      expect(cp!.frozenAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("freeze research phase", () => {
    it("freezes research checkpoint with search results and result", () => {
      advanceToAwaitingResultsReview();
      const before = Date.now();

      useResearchStore.getState().freeze("research");

      const cp = useResearchStore.getState().checkpoints.research;
      expect(cp).toBeDefined();
      expect(cp!.searchResults).toHaveLength(1);
      expect(cp!.result).toBeDefined();
      expect(cp!.result!.learnings).toEqual(["Surface codes are promising"]);
      expect(cp!.frozenAt).toBeGreaterThanOrEqual(before);
    });

    it("freezes research checkpoint with null result when no result exists", () => {
      // Advance to plan review but not to results — so result is null
      advanceToAwaitingPlanReview();
      dispatch("step-start", { step: "search", state: "searching" });
      dispatch("step-complete", { step: "search", duration: 1000 });

      useResearchStore.getState().freeze("research");

      const cp = useResearchStore.getState().checkpoints.research;
      expect(cp).toBeDefined();
      expect(cp!.result).toBeNull();
      expect(cp!.searchResults).toHaveLength(0);
    });
  });

  describe("freeze report phase", () => {
    it("freezes report checkpoint with result", () => {
      const result = advanceToReportReady();
      const before = Date.now();

      useResearchStore.getState().freeze("report");

      const cp = useResearchStore.getState().checkpoints.report;
      expect(cp).toBeDefined();
      expect(cp!.result).toEqual(result);
      expect(cp!.frozenAt).toBeGreaterThanOrEqual(before);
    });

    it("does nothing when result is null", () => {
      // Store is in initial state — no result
      useResearchStore.getState().freeze("report");

      expect(useResearchStore.getState().checkpoints.report).toBeUndefined();
    });
  });

  describe("freeze idempotency", () => {
    it("calling freeze twice for same phase does not throw", () => {
      advanceToAwaitingFeedback();
      useResearchStore.getState().freeze("clarify");
      const firstCp = useResearchStore.getState().checkpoints.clarify;

      // Second freeze should succeed (overwrite, not error)
      expect(() => useResearchStore.getState().freeze("clarify")).not.toThrow();

      const secondCp = useResearchStore.getState().checkpoints.clarify;
      expect(secondCp).toBeDefined();
      expect(secondCp!.questions).toBe(firstCp!.questions);
    });
  });

  describe("freeze overwrite (regeneration)", () => {
    it("re-freezing a phase updates frozenAt with new timestamp", async () => {
      advanceToAwaitingFeedback();
      useResearchStore.getState().freeze("clarify");
      const firstTime = useResearchStore.getState().checkpoints.clarify!.frozenAt;

      // Wait for timestamp to advance
      await new Promise((r) => setTimeout(r, 10));

      // Change questions and re-freeze
      useResearchStore.getState().setQuestions("Updated questions");
      useResearchStore.getState().freeze("clarify");

      const secondCp = useResearchStore.getState().checkpoints.clarify!;
      expect(secondCp.questions).toBe("Updated questions");
      expect(secondCp.frozenAt).toBeGreaterThan(firstTime);
    });
  });

  describe("freeze for invalid/unknown phase", () => {
    it("does not modify state for unknown phase string", () => {
      advanceToAwaitingFeedback();
      const before = { ...useResearchStore.getState().checkpoints };

      // Cast to bypass TypeScript — runtime edge case
      (useResearchStore.getState() as any).freeze("unknown_phase");

      expect(useResearchStore.getState().checkpoints).toEqual(before);
    });
  });
});

// ---------------------------------------------------------------------------
// reset() clears checkpoints
// ---------------------------------------------------------------------------

describe("reset() clears checkpoints", () => {
  it("clears all checkpoints on reset", () => {
    advanceToAwaitingFeedback();
    useResearchStore.getState().freeze("clarify");
    expect(useResearchStore.getState().checkpoints.clarify).toBeDefined();

    useResearchStore.getState().reset();

    expect(useResearchStore.getState().checkpoints).toEqual({});
  });

  it("clears all workspace fields on reset", () => {
    advanceToAwaitingFeedback();
    useResearchStore.getState().setFeedback("My feedback");
    useResearchStore.getState().setManualQueries(["custom query"]);
    useResearchStore.getState().freeze("clarify");

    useResearchStore.getState().reset();

    const state = useResearchStore.getState();
    expect(state.questions).toBe("");
    expect(state.feedback).toBe("");
    expect(state.plan).toBe("");
    expect(state.suggestion).toBe("");
    expect(state.manualQueries).toEqual([]);
    expect(state.checkpoints).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// manualQueries state and setter
// ---------------------------------------------------------------------------

describe("manualQueries", () => {
  it("initializes as empty array", () => {
    expect(useResearchStore.getState().manualQueries).toEqual([]);
  });

  it("setManualQueries updates the field", () => {
    useResearchStore.getState().setManualQueries(["query 1", "query 2"]);
    expect(useResearchStore.getState().manualQueries).toEqual([
      "query 1",
      "query 2",
    ]);
  });

  it("replaces previous queries on subsequent setManualQueries", () => {
    useResearchStore.getState().setManualQueries(["first"]);
    useResearchStore.getState().setManualQueries(["second", "third"]);

    expect(useResearchStore.getState().manualQueries).toEqual([
      "second",
      "third",
    ]);
  });

  it("can be set to empty array", () => {
    useResearchStore.getState().setManualQueries(["a", "b"]);
    useResearchStore.getState().setManualQueries([]);

    expect(useResearchStore.getState().manualQueries).toEqual([]);
  });

  it("is persisted to storage", async () => {
    dispatch("start", { topic: "Test" });
    useResearchStore.getState().setManualQueries(["persisted query"]);

    await vi.waitFor(() => expect(storage.set).toHaveBeenCalled());

    const lastCall = (storage.set as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    const data = lastCall?.[1] as Record<string, unknown>;
    expect(data.manualQueries).toEqual(["persisted query"]);
  });

  it("is restored on hydrate", async () => {
    dispatch("start", { topic: "Test" });
    useResearchStore.getState().setManualQueries(["hydrated query"]);

    const savedData = storedData["research-state"];
    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    expect(useResearchStore.getState().manualQueries).toEqual([
      "hydrated query",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Persist + hydrate round-trip with checkpoints
// ---------------------------------------------------------------------------

describe("persist + hydrate round-trip with checkpoints", () => {
  it("round-trips clarify checkpoint through persist and hydrate", async () => {
    advanceToAwaitingFeedback();
    useResearchStore.getState().freeze("clarify");

    const savedData = storedData["research-state"];
    const frozenCp = useResearchStore.getState().checkpoints.clarify;
    expect(frozenCp).toBeDefined();

    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    const restored = useResearchStore.getState().checkpoints.clarify;
    expect(restored).toBeDefined();
    expect(restored!.questions).toBe(frozenCp!.questions);
    expect(restored!.frozenAt).toBe(frozenCp!.frozenAt);
  });

  it("round-trips plan checkpoint through persist and hydrate", async () => {
    advanceToAwaitingPlanReview();
    useResearchStore.getState().freeze("plan");

    const savedData = storedData["research-state"];
    const frozenCp = useResearchStore.getState().checkpoints.plan;

    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    const restored = useResearchStore.getState().checkpoints.plan;
    expect(restored).toBeDefined();
    expect(restored!.plan).toBe(frozenCp!.plan);
    expect(restored!.searchTasks).toEqual(frozenCp!.searchTasks);
    expect(restored!.frozenAt).toBe(frozenCp!.frozenAt);
  });

  it("round-trips research checkpoint through persist and hydrate", async () => {
    advanceToAwaitingResultsReview();
    useResearchStore.getState().freeze("research");

    const savedData = storedData["research-state"];
    const frozenCp = useResearchStore.getState().checkpoints.research;

    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    const restored = useResearchStore.getState().checkpoints.research;
    expect(restored).toBeDefined();
    expect(restored!.searchResults).toHaveLength(1);
    expect(restored!.frozenAt).toBe(frozenCp!.frozenAt);
  });

  it("round-trips report checkpoint through persist and hydrate", async () => {
    advanceToReportReady();
    useResearchStore.getState().freeze("report");

    const savedData = storedData["research-state"];
    const frozenCp = useResearchStore.getState().checkpoints.report;

    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    const restored = useResearchStore.getState().checkpoints.report;
    expect(restored).toBeDefined();
    expect(restored!.result.title).toBe(frozenCp!.result.title);
    expect(restored!.frozenAt).toBe(frozenCp!.frozenAt);
  });

  it("round-trips all checkpoints together", async () => {
    const result = advanceToReportReady();
    useResearchStore.getState().freeze("clarify");
    useResearchStore.getState().freeze("plan");
    useResearchStore.getState().freeze("research");
    useResearchStore.getState().freeze("report");

    const savedData = storedData["research-state"];
    const original = useResearchStore.getState().checkpoints;

    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    const restored = useResearchStore.getState().checkpoints;
    expect(restored.clarify!.questions).toBe(original.clarify!.questions);
    expect(restored.plan!.plan).toBe(original.plan!.plan);
    expect(restored.research!.searchResults).toHaveLength(1);
    expect(restored.report!.result.title).toBe(result.title);
  });
});

// ---------------------------------------------------------------------------
// Backward compat: hydrate with old state missing checkpoints / manualQueries
// ---------------------------------------------------------------------------

describe("backward compatibility", () => {
  it("hydrates old state without checkpoints field (defaults to {})", async () => {
    storedData["research-state"] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
      searchTasks: [],
      searchResults: [],
      result: null,
      error: null,
      startedAt: 1000,
      completedAt: null,
      activityLog: [],
      questions: "Some questions",
      feedback: "",
      plan: "",
      suggestion: "",
      // No checkpoints field at all
    };

    await useResearchStore.getState().hydrate();

    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
    expect(useResearchStore.getState().questions).toBe("Some questions");
    expect(useResearchStore.getState().checkpoints).toEqual({});
  });

  it("hydrates old state without manualQueries field (defaults to [])", async () => {
    storedData["research-state"] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
      searchTasks: [],
      searchResults: [],
      result: null,
      error: null,
      startedAt: 1000,
      completedAt: null,
      activityLog: [],
      questions: "Some questions",
      feedback: "",
      plan: "",
      suggestion: "",
      // No manualQueries field at all
    };

    await useResearchStore.getState().hydrate();

    expect(useResearchStore.getState().manualQueries).toEqual([]);
  });

  it("hydrates old state with empty checkpoints object", async () => {
    storedData["research-state"] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
      searchTasks: [],
      searchResults: [],
      result: null,
      error: null,
      startedAt: 1000,
      completedAt: null,
      activityLog: [],
      questions: "",
      feedback: "",
      plan: "",
      suggestion: "",
      checkpoints: {},
    };

    await useResearchStore.getState().hydrate();

    expect(useResearchStore.getState().checkpoints).toEqual({});
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
  });

  it("hydrates state with partial checkpoints (only clarify)", async () => {
    storedData["research-state"] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
      searchTasks: [],
      searchResults: [],
      result: null,
      error: null,
      startedAt: 1000,
      completedAt: null,
      activityLog: [],
      questions: "Old questions",
      feedback: "",
      plan: "",
      suggestion: "",
      checkpoints: {
        clarify: { frozenAt: 1000, questions: "Frozen questions" },
        // plan, research, report missing
      },
    };

    await useResearchStore.getState().hydrate();

    const cp = useResearchStore.getState().checkpoints;
    expect(cp.clarify).toBeDefined();
    expect(cp.clarify!.questions).toBe("Frozen questions");
    expect(cp.clarify!.frozenAt).toBe(1000);
    expect(cp.plan).toBeUndefined();
    expect(cp.research).toBeUndefined();
    expect(cp.report).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Checkpoint immutability — frozen data should not be affected by later edits
// ---------------------------------------------------------------------------

describe("checkpoint immutability", () => {
  it("frozen clarify questions are not affected by later setQuestions", () => {
    advanceToAwaitingFeedback();
    useResearchStore.getState().freeze("clarify");

    const frozenQuestions = useResearchStore.getState().checkpoints.clarify!.questions;
    useResearchStore.getState().setQuestions("Completely different questions");

    // Workspace updated but checkpoint untouched
    expect(useResearchStore.getState().questions).toBe(
      "Completely different questions",
    );
    expect(useResearchStore.getState().checkpoints.clarify!.questions).toBe(
      frozenQuestions,
    );
  });

  it("frozen plan is not affected by later setPlan", () => {
    advanceToAwaitingPlanReview();
    useResearchStore.getState().freeze("plan");

    const frozenPlan = useResearchStore.getState().checkpoints.plan!.plan;
    useResearchStore.getState().setPlan("Completely different plan");

    expect(useResearchStore.getState().plan).toBe("Completely different plan");
    expect(useResearchStore.getState().checkpoints.plan!.plan).toBe(frozenPlan);
  });
});

// ---------------------------------------------------------------------------
// Freeze preserves workspace fields alongside checkpoints
// ---------------------------------------------------------------------------

describe("freeze preserves workspace fields", () => {
  it("freeze does not clear workspace questions field", () => {
    advanceToAwaitingFeedback();
    useResearchStore.getState().setQuestions("My custom questions");
    useResearchStore.getState().freeze("clarify");

    // Both workspace and checkpoint have the same value at freeze time
    expect(useResearchStore.getState().questions).toBe("My custom questions");
    expect(useResearchStore.getState().checkpoints.clarify!.questions).toBe(
      "My custom questions",
    );
  });

  it("workspace feedback persists independently of checkpoints", () => {
    advanceToAwaitingFeedback();
    useResearchStore.getState().setFeedback("Important feedback");
    useResearchStore.getState().freeze("clarify");

    // Feedback is a workspace field, not part of clarify checkpoint
    expect(useResearchStore.getState().feedback).toBe("Important feedback");
    expect(
      (useResearchStore.getState().checkpoints.clarify as any)?.feedback,
    ).toBeUndefined();
  });
});
