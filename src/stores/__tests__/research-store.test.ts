/**
 * Tests for useResearchStore.
 *
 * Validates: initial state, SSE event processing, step streaming,
 * activity log accumulation, error handling, abort, reset, and selectors.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useResearchStore } from "@/stores/research-store";
import {
  selectElapsedMs,
  selectStepText,
  selectIsActive,
  selectAllSources,
  selectAllImages,
} from "@/stores/research-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  useResearchStore.getState().reset();
});

function dispatch(eventType: string, data: unknown) {
  useResearchStore.getState().handleEvent(eventType, data);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("useResearchStore — initial state", () => {
  it("starts with idle state", () => {
    const s = useResearchStore.getState();
    expect(s.state).toBe("idle");
    expect(s.topic).toBe("");
    expect(s.result).toBeNull();
    expect(s.error).toBeNull();
    expect(s.startedAt).toBeNull();
    expect(s.completedAt).toBeNull();
    expect(s.searchTasks).toEqual([]);
    expect(s.searchResults).toEqual([]);
    expect(s.activityLog).toEqual([]);
    // Multi-phase checkpoint fields
    expect(s.questions).toBe("");
    expect(s.feedback).toBe("");
    expect(s.plan).toBe("");
    expect(s.suggestion).toBe("");
  });

  it("initializes all 6 step slots", () => {
    const { steps } = useResearchStore.getState();
    const stepKeys = Object.keys(steps);
    expect(stepKeys).toHaveLength(6);
    expect(stepKeys.sort()).toEqual(
      ["clarify", "plan", "search", "analyze", "review", "report"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// setTopic
// ---------------------------------------------------------------------------

describe("useResearchStore — setTopic", () => {
  it("sets the topic", () => {
    useResearchStore.getState().setTopic("quantum computing");
    expect(useResearchStore.getState().topic).toBe("quantum computing");
  });
});

// ---------------------------------------------------------------------------
// SSE event handling
// ---------------------------------------------------------------------------

describe("useResearchStore — SSE event handling", () => {
  it("handles 'start' event", () => {
    dispatch("start", { topic: "AI safety" });
    const s = useResearchStore.getState();
    expect(s.topic).toBe("AI safety");
    expect(s.state).toBe("clarifying");
    expect(s.startedAt).not.toBeNull();
    expect(s.activityLog).toHaveLength(1);
    expect(s.activityLog[0].message).toContain("AI safety");
  });

  it("handles 'step-start' event", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-start", { step: "plan", state: "planning" });

    const s = useResearchStore.getState();
    expect(s.state).toBe("planning");
    expect(s.steps.plan.startTime).not.toBeNull();
    expect(s.activityLog).toHaveLength(2);
  });

  it("handles 'step-delta' event — accumulates text", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-start", { step: "plan", state: "planning" });
    dispatch("step-delta", { step: "plan", text: "Hello " });
    dispatch("step-delta", { step: "plan", text: "World" });

    const s = useResearchStore.getState();
    expect(s.steps.plan.text).toBe("Hello World");
  });

  it("handles 'step-reasoning' event — accumulates reasoning", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-start", { step: "analyze", state: "analyzing" });
    dispatch("step-reasoning", { step: "analyze", text: "Thinking " });
    dispatch("step-reasoning", { step: "analyze", text: "deeply" });

    expect(useResearchStore.getState().steps.analyze.reasoning).toBe(
      "Thinking deeply",
    );
  });

  it("handles 'progress' event", () => {
    dispatch("start", { topic: "test" });
    dispatch("progress", { step: "search", progress: 50 });

    expect(useResearchStore.getState().steps.search.progress).toBe(50);
  });

  it("handles 'step-complete' event", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-start", { step: "plan", state: "planning" });
    dispatch("step-complete", { step: "plan", duration: 2500 });

    const step = useResearchStore.getState().steps.plan;
    expect(step.progress).toBe(100);
    expect(step.duration).toBe(2500);
    expect(step.endTime).not.toBeNull();
  });

  it("handles 'step-error' event", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-error", {
      step: "search",
      error: { code: "AI_REQUEST_FAILED", message: "Rate limited" },
    });

    const s = useResearchStore.getState();
    expect(s.steps.search.endTime).not.toBeNull();
    expect(s.activityLog.at(-1)!.message).toContain("Rate limited");
  });

  it("handles 'result' event", () => {
    dispatch("start", { topic: "test" });
    dispatch("result", {
      title: "Test Report",
      report: "# Test Report\n\nContent here.",
      learnings: ["Learning 1"],
      sources: [{ url: "https://example.com", title: "Example" }],
      images: [],
    });

    const s = useResearchStore.getState();
    expect(s.result).not.toBeNull();
    expect(s.result!.title).toBe("Test Report");
    expect(s.result!.learnings).toEqual(["Learning 1"]);
  });

  it("handles 'done' event — sets completed state", () => {
    dispatch("start", { topic: "test" });
    dispatch("done", {});

    const s = useResearchStore.getState();
    expect(s.state).toBe("completed");
    expect(s.completedAt).not.toBeNull();
  });

  it("handles 'error' event — sets failed state", () => {
    dispatch("start", { topic: "test" });
    dispatch("error", { code: "CONFIG_MISSING_KEY", message: "No API key" });

    const s = useResearchStore.getState();
    expect(s.state).toBe("failed");
    expect(s.error).toEqual({
      code: "CONFIG_MISSING_KEY",
      message: "No API key",
    });
    expect(s.completedAt).not.toBeNull();
  });

  it("ignores unknown event types", () => {
    dispatch("start", { topic: "test" });
    const beforeState = useResearchStore.getState().state;
    dispatch("unknown-event", { foo: "bar" });
    expect(useResearchStore.getState().state).toBe(beforeState);
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle
// ---------------------------------------------------------------------------

describe("useResearchStore — full lifecycle", () => {
  it("tracks a complete research flow from start to done", () => {
    const store = useResearchStore.getState();

    // Start
    store.handleEvent("start", { topic: "Quantum computing" });
    expect(useResearchStore.getState().state).toBe("clarifying");

    // Plan step
    store.handleEvent("step-start", { step: "plan", state: "planning" });
    store.handleEvent("step-delta", { step: "plan", text: "Planning..." });
    store.handleEvent("step-complete", { step: "plan", duration: 1500 });

    // Search step
    store.handleEvent("step-start", { step: "search", state: "searching" });
    store.handleEvent("progress", { step: "search", progress: 50 });
    store.handleEvent("step-complete", { step: "search", duration: 3000 });

    // Report step
    store.handleEvent("step-start", { step: "report", state: "reporting" });
    store.handleEvent("step-delta", { step: "report", text: "# Report" });
    store.handleEvent("step-complete", { step: "report", duration: 2000 });

    // Result
    store.handleEvent("result", {
      title: "Quantum Computing Report",
      report: "# Quantum Computing Report",
      learnings: ["L1"],
      sources: [],
      images: [],
    });

    // Done
    store.handleEvent("done", {});

    const final = useResearchStore.getState();
    expect(final.state).toBe("completed");
    expect(final.result!.title).toBe("Quantum Computing Report");
    expect(final.steps.plan.text).toBe("Planning...");
    expect(final.steps.plan.duration).toBe(1500);
    expect(final.steps.report.text).toBe("# Report");
    expect(final.completedAt).not.toBeNull();
    // Activity log should have entries for each step
    expect(final.activityLog.length).toBeGreaterThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// Abort
// ---------------------------------------------------------------------------

describe("useResearchStore — abort", () => {
  it("sets aborted state", () => {
    dispatch("start", { topic: "test" });
    useResearchStore.getState().abort();

    const s = useResearchStore.getState();
    expect(s.state).toBe("aborted");
    expect(s.completedAt).not.toBeNull();
  });

  it("adds abort activity to log", () => {
    dispatch("start", { topic: "test" });
    useResearchStore.getState().abort();
    const last = useResearchStore.getState().activityLog.at(-1)!;
    expect(last.message).toContain("aborted");
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("useResearchStore — reset", () => {
  it("resets all state to initial", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-delta", { step: "plan", text: "some text" });
    dispatch("error", { code: "FAIL", message: "oops" });

    useResearchStore.getState().reset();

    const s = useResearchStore.getState();
    expect(s.state).toBe("idle");
    expect(s.topic).toBe("");
    expect(s.steps.plan.text).toBe("");
    expect(s.error).toBeNull();
    expect(s.activityLog).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe("useResearchStore — selectors", () => {
  it("selectElapsedMs returns null before start", () => {
    expect(selectElapsedMs(useResearchStore.getState())).toBeNull();
  });

  it("selectElapsedMs returns elapsed time after start", () => {
    dispatch("start", { topic: "test" });
    const elapsed = selectElapsedMs(useResearchStore.getState());
    expect(elapsed).not.toBeNull();
    expect(elapsed!).toBeGreaterThanOrEqual(0);
  });

  it("selectStepText returns step streaming text", () => {
    dispatch("start", { topic: "test" });
    dispatch("step-delta", { step: "plan", text: "hello" });
    expect(selectStepText("plan")(useResearchStore.getState())).toBe("hello");
  });

  it("selectIsActive is true during research", () => {
    expect(selectIsActive(useResearchStore.getState())).toBe(false);
    dispatch("start", { topic: "test" });
    expect(selectIsActive(useResearchStore.getState())).toBe(true);
    dispatch("done", {});
    expect(selectIsActive(useResearchStore.getState())).toBe(false);
  });

  it("selectAllSources aggregates from search results", () => {
    const state = {
      ...useResearchStore.getState(),
      searchResults: [
        {
          query: "q1",
          researchGoal: "g1",
          learning: "l1",
          sources: [{ url: "https://a.com" }, { url: "https://b.com" }],
          images: [],
        },
        {
          query: "q2",
          researchGoal: "g2",
          learning: "l2",
          sources: [{ url: "https://c.com" }],
          images: [],
        },
      ],
    } as any;
    const sources = selectAllSources(state);
    expect(sources).toHaveLength(3);
  });

  it("selectAllImages aggregates from search results", () => {
    const state = {
      ...useResearchStore.getState(),
      searchResults: [
        {
          query: "q1",
          researchGoal: "g1",
          learning: "l1",
          sources: [],
          images: [
            { url: "https://img1.com/a.jpg", description: "Image 1" },
          ],
        },
      ],
    } as any;
    const images = selectAllImages(state);
    expect(images).toHaveLength(1);
    expect(images[0].description).toBe("Image 1");
  });

  it("selectIsActive returns true for awaiting states", () => {
    // awaiting_feedback
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q1?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
    expect(selectIsActive(useResearchStore.getState())).toBe(true);

    // awaiting_plan_review
    dispatch("plan-result", { plan: "Step 1" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
    expect(selectIsActive(useResearchStore.getState())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Multi-phase checkpoint setters
// ---------------------------------------------------------------------------

describe("useResearchStore — multi-phase setters", () => {
  it("setQuestions updates questions field", () => {
    useResearchStore.getState().setQuestions("What is quantum?");
    expect(useResearchStore.getState().questions).toBe("What is quantum?");
  });

  it("setFeedback updates feedback field", () => {
    useResearchStore.getState().setFeedback("Focus on superposition");
    expect(useResearchStore.getState().feedback).toBe("Focus on superposition");
  });

  it("setPlan updates plan field", () => {
    useResearchStore.getState().setPlan("1. Intro\n2. Methods");
    expect(useResearchStore.getState().plan).toBe("1. Intro\n2. Methods");
  });

  it("setSuggestion updates suggestion field", () => {
    useResearchStore.getState().setSuggestion("Search more about entanglement");
    expect(useResearchStore.getState().suggestion).toBe("Search more about entanglement");
  });
});

// ---------------------------------------------------------------------------
// Multi-phase SSE events
// ---------------------------------------------------------------------------

describe("useResearchStore — multi-phase SSE events", () => {
  it("handles 'clarify-result' event — stores questions, transitions to awaiting_feedback", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "1. What scope?\n2. What depth?" });

    const s = useResearchStore.getState();
    expect(s.questions).toBe("1. What scope?\n2. What depth?");
    expect(s.state).toBe("awaiting_feedback");
    expect(s.activityLog.at(-1)!.message).toContain("awaiting feedback");
  });

  it("handles 'plan-result' event — stores plan, transitions to awaiting_plan_review", () => {
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "# Research Plan\n1. Background\n2. Analysis" });

    const s = useResearchStore.getState();
    expect(s.plan).toBe("# Research Plan\n1. Background\n2. Analysis");
    expect(s.state).toBe("awaiting_plan_review");
    expect(s.activityLog.at(-1)!.message).toContain("awaiting review");
  });

  it("handles 'research-result' event — transitions to awaiting_results_review", () => {
    dispatch("start", { topic: "test" });
    dispatch("research-result", {
      learnings: ["L1", "L2"],
      sources: [{ url: "https://a.com", title: "A" }],
      images: [{ url: "https://img.com/a.jpg", description: "Diagram" }],
    });

    const s = useResearchStore.getState();
    expect(s.state).toBe("awaiting_results_review");
    expect(s.result).not.toBeNull();
    expect(s.result!.learnings).toEqual(["L1", "L2"]);
    expect(s.result!.sources).toEqual([{ url: "https://a.com", title: "A" }]);
    expect(s.result!.images).toEqual([{ url: "https://img.com/a.jpg", description: "Diagram" }]);
    expect(s.activityLog.at(-1)!.message).toContain("awaiting review");
  });

  it("research-result preserves existing result if already set", () => {
    dispatch("start", { topic: "test" });
    // Set an existing result first
    dispatch("result", {
      title: "Existing Report",
      report: "Content",
      learnings: [],
      sources: [],
      images: [],
    });
    const existingResult = useResearchStore.getState().result;

    dispatch("research-result", {
      learnings: ["New learning"],
      sources: [],
      images: [],
    });

    expect(useResearchStore.getState().result).toBe(existingResult);
  });

  it("research-result creates minimal result when none exists", () => {
    dispatch("start", { topic: "test" });
    // Don't send a 'result' event — result is null
    expect(useResearchStore.getState().result).toBeNull();

    dispatch("research-result", {
      learnings: ["L1"],
      sources: [{ url: "https://b.com" }],
      images: [],
    });

    const r = useResearchStore.getState().result;
    expect(r).not.toBeNull();
    expect(r!.title).toBe("");
    expect(r!.report).toBe("");
    expect(r!.learnings).toEqual(["L1"]);
  });
});

