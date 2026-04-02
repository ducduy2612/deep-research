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

// ---------------------------------------------------------------------------
// Multi-phase lifecycle
// ---------------------------------------------------------------------------

describe("useResearchStore — multi-phase lifecycle", () => {
  it("tracks a full multi-phase flow: clarify → plan → research → report", () => {
    // Phase 1: Clarify
    dispatch("start", { topic: "Quantum computing" });
    dispatch("step-start", { step: "clarify", state: "clarifying" });
    dispatch("step-delta", { step: "clarify", text: "Generating questions..." });
    dispatch("step-complete", { step: "clarify", duration: 1000 });
    dispatch("clarify-result", { questions: "1. What area of QC?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");

    // User provides feedback
    useResearchStore.getState().setFeedback("Focus on error correction");

    // Phase 2: Plan (simulated — real SSE would come from plan endpoint)
    dispatch("step-start", { step: "plan", state: "planning" });
    dispatch("step-delta", { step: "plan", text: "Planning..." });
    dispatch("step-complete", { step: "plan", duration: 2000 });
    dispatch("plan-result", { plan: "# Plan\n1. Background\n2. Error correction" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");

    // User provides suggestion
    useResearchStore.getState().setSuggestion("Add more on surface codes");

    // Phase 3: Research
    dispatch("step-start", { step: "search", state: "searching" });
    dispatch("step-complete", { step: "search", duration: 3000 });
    dispatch("research-result", {
      learnings: ["Surface codes are promising"],
      sources: [{ url: "https://arxiv.org/paper1" }],
      images: [],
    });
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");

    // Phase 4: Report
    dispatch("step-start", { step: "report", state: "reporting" });
    dispatch("result", {
      title: "Quantum Error Correction Report",
      report: "# QEC Report",
      learnings: ["Surface codes are promising"],
      sources: [{ url: "https://arxiv.org/paper1" }],
      images: [],
    });
    dispatch("done", {});

    const final = useResearchStore.getState();
    expect(final.state).toBe("completed");
    expect(final.questions).toBe("1. What area of QC?");
    expect(final.feedback).toBe("Focus on error correction");
    expect(final.plan).toBe("# Plan\n1. Background\n2. Error correction");
    expect(final.suggestion).toBe("Add more on surface codes");
    expect(final.result!.title).toBe("Quantum Error Correction Report");
  });
});

// ---------------------------------------------------------------------------
// Reset clears multi-phase fields
// ---------------------------------------------------------------------------

describe("useResearchStore — reset clears multi-phase fields", () => {
  it("resets questions, feedback, plan, suggestion to empty strings", () => {
    useResearchStore.getState().setQuestions("Q1?");
    useResearchStore.getState().setFeedback("My feedback");
    useResearchStore.getState().setPlan("Plan text");
    useResearchStore.getState().setSuggestion("More research");

    useResearchStore.getState().reset();

    const s = useResearchStore.getState();
    expect(s.questions).toBe("");
    expect(s.feedback).toBe("");
    expect(s.plan).toBe("");
    expect(s.suggestion).toBe("");
  });
});

// ---------------------------------------------------------------------------
// State transitions — explicit multi-phase paths
// ---------------------------------------------------------------------------

describe("useResearchStore — multi-phase state transitions", () => {
  it("idle → clarifying → awaiting_feedback (via clarify-result)", () => {
    expect(useResearchStore.getState().state).toBe("idle");

    dispatch("start", { topic: "test" });
    expect(useResearchStore.getState().state).toBe("clarifying");

    dispatch("clarify-result", { questions: "Q1?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
  });

  it("awaiting_feedback → planning → awaiting_plan_review (via plan-result)", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q1?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");

    // Server starts planning after user feedback
    dispatch("step-start", { step: "plan", state: "planning" });
    expect(useResearchStore.getState().state).toBe("planning");

    dispatch("plan-result", { plan: "Plan A" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
  });

  it("awaiting_plan_review → searching → analyzing → reviewing → awaiting_results_review", () => {
    // Reach awaiting_plan_review
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "Plan A" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");

    // Server begins research
    dispatch("step-start", { step: "search", state: "searching" });
    expect(useResearchStore.getState().state).toBe("searching");

    dispatch("step-start", { step: "analyze", state: "analyzing" });
    expect(useResearchStore.getState().state).toBe("analyzing");

    dispatch("step-start", { step: "review", state: "reviewing" });
    expect(useResearchStore.getState().state).toBe("reviewing");

    dispatch("research-result", { learnings: ["L1"], sources: [], images: [] });
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");
  });

  it("awaiting_results_review → reporting → completed", () => {
    // Reach awaiting_results_review
    dispatch("start", { topic: "test" });
    dispatch("research-result", { learnings: [], sources: [], images: [] });
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");

    // Server begins report
    dispatch("step-start", { step: "report", state: "reporting" });
    expect(useResearchStore.getState().state).toBe("reporting");

    dispatch("result", {
      title: "Report",
      report: "Content",
      learnings: [],
      sources: [],
      images: [],
    });
    dispatch("done", {});
    expect(useResearchStore.getState().state).toBe("completed");
    expect(useResearchStore.getState().completedAt).not.toBeNull();
  });

  it("events dispatched out of order do not corrupt state", () => {
    // Sending clarify-result without start should still work — store doesn't enforce guards
    dispatch("clarify-result", { questions: "Q?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
    expect(useResearchStore.getState().questions).toBe("Q?");

    // plan-result transitions from awaiting_feedback (not the usual path but valid)
    dispatch("plan-result", { plan: "Plan" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
    expect(useResearchStore.getState().plan).toBe("Plan");
  });
});

// ---------------------------------------------------------------------------
// Data persistence across phases
// ---------------------------------------------------------------------------

describe("useResearchStore — data persistence across phases", () => {
  it("questions persist from clarify-result through all subsequent phases", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "1. Scope?\n2. Depth?" });

    // Progress through plan and research phases
    dispatch("plan-result", { plan: "Plan" });
    expect(useResearchStore.getState().questions).toBe("1. Scope?\n2. Depth?");

    dispatch("research-result", { learnings: ["L1"], sources: [], images: [] });
    expect(useResearchStore.getState().questions).toBe("1. Scope?\n2. Depth?");

    dispatch("result", {
      title: "Report",
      report: "Content",
      learnings: ["L1"],
      sources: [],
      images: [],
    });
    dispatch("done", {});
    expect(useResearchStore.getState().questions).toBe("1. Scope?\n2. Depth?");
  });

  it("plan persists from plan-result through research and report phases", () => {
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "# Plan\n1. Step one" });

    dispatch("research-result", { learnings: [], sources: [], images: [] });
    expect(useResearchStore.getState().plan).toBe("# Plan\n1. Step one");

    dispatch("result", {
      title: "Report",
      report: "Content",
      learnings: [],
      sources: [],
      images: [],
    });
    dispatch("done", {});
    expect(useResearchStore.getState().plan).toBe("# Plan\n1. Step one");
  });

  it("feedback and suggestion persist through state transitions", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q?" });
    useResearchStore.getState().setFeedback("Focus on X");

    dispatch("plan-result", { plan: "Plan" });
    expect(useResearchStore.getState().feedback).toBe("Focus on X");

    useResearchStore.getState().setSuggestion("Add Y");
    dispatch("research-result", { learnings: [], sources: [], images: [] });
    expect(useResearchStore.getState().feedback).toBe("Focus on X");
    expect(useResearchStore.getState().suggestion).toBe("Add Y");
  });

  it("user-edited plan overrides plan-result value", () => {
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "Original plan" });

    // User edits the plan
    useResearchStore.getState().setPlan("User-modified plan");
    expect(useResearchStore.getState().plan).toBe("User-modified plan");

    // Plan survives through research phase
    dispatch("research-result", { learnings: [], sources: [], images: [] });
    expect(useResearchStore.getState().plan).toBe("User-modified plan");
  });

  it("research-result preserves existing result title and report", () => {
    dispatch("start", { topic: "test" });
    // First, a result event sets the report
    dispatch("result", {
      title: "My Report",
      report: "# Full report content",
      learnings: ["L1"],
      sources: [{ url: "https://a.com" }],
      images: [],
    });

    // Then a research-result event (from a subsequent phase) should not overwrite
    dispatch("research-result", {
      learnings: ["L2", "L3"],
      sources: [{ url: "https://b.com" }],
      images: [],
    });

    const r = useResearchStore.getState().result;
    expect(r!.title).toBe("My Report");
    expect(r!.report).toBe("# Full report content");
    // The existing result's learnings/sources are preserved, not merged
    expect(r!.learnings).toEqual(["L1"]);
  });
});

// ---------------------------------------------------------------------------
// Abort from checkpoint states
// ---------------------------------------------------------------------------

describe("useResearchStore — abort from checkpoint states", () => {
  it("abort from awaiting_feedback → aborted", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");

    useResearchStore.getState().abort();
    const s = useResearchStore.getState();
    expect(s.state).toBe("aborted");
    expect(s.completedAt).not.toBeNull();
    expect(s.activityLog.at(-1)!.message).toContain("aborted");
  });

  it("abort from awaiting_plan_review → aborted", () => {
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "Plan" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");

    useResearchStore.getState().abort();
    const s = useResearchStore.getState();
    expect(s.state).toBe("aborted");
    expect(s.completedAt).not.toBeNull();
  });

  it("abort from awaiting_results_review → aborted", () => {
    dispatch("start", { topic: "test" });
    dispatch("research-result", { learnings: [], sources: [], images: [] });
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");

    useResearchStore.getState().abort();
    const s = useResearchStore.getState();
    expect(s.state).toBe("aborted");
    expect(s.completedAt).not.toBeNull();
  });

  it("abort preserves checkpoint data (questions, plan, feedback)", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q?" });
    useResearchStore.getState().setFeedback("My feedback");
    dispatch("plan-result", { plan: "Plan text" });
    useResearchStore.getState().setSuggestion("Suggestion text");

    useResearchStore.getState().abort();

    const s = useResearchStore.getState();
    expect(s.state).toBe("aborted");
    // Checkpoint data is preserved after abort — useful for debugging/resuming
    expect(s.questions).toBe("Q?");
    expect(s.feedback).toBe("My feedback");
    expect(s.plan).toBe("Plan text");
    expect(s.suggestion).toBe("Suggestion text");
  });
});

// ---------------------------------------------------------------------------
// Reset from mid-lifecycle states
// ---------------------------------------------------------------------------

describe("useResearchStore — reset from mid-lifecycle", () => {
  it("reset from awaiting_feedback clears all state", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q?" });
    useResearchStore.getState().setFeedback("FB");

    useResearchStore.getState().reset();

    const s = useResearchStore.getState();
    expect(s.state).toBe("idle");
    expect(s.topic).toBe("");
    expect(s.questions).toBe("");
    expect(s.feedback).toBe("");
    expect(s.startedAt).toBeNull();
    expect(s.activityLog).toEqual([]);
  });

  it("reset from awaiting_plan_review clears all state", () => {
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "Plan" });
    useResearchStore.getState().setSuggestion("Sug");

    useResearchStore.getState().reset();

    const s = useResearchStore.getState();
    expect(s.state).toBe("idle");
    expect(s.plan).toBe("");
    expect(s.suggestion).toBe("");
    expect(s.steps.plan.text).toBe("");
  });

  it("reset from awaiting_results_review clears all state", () => {
    dispatch("start", { topic: "test" });
    dispatch("research-result", { learnings: ["L1"], sources: [], images: [] });

    useResearchStore.getState().reset();

    const s = useResearchStore.getState();
    expect(s.state).toBe("idle");
    expect(s.result).toBeNull();
    expect(s.steps.search.text).toBe("");
  });

  it("reset after abort restores clean idle state", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "Q?" });
    useResearchStore.getState().abort();
    expect(useResearchStore.getState().state).toBe("aborted");

    useResearchStore.getState().reset();

    const s = useResearchStore.getState();
    expect(s.state).toBe("idle");
    expect(s.completedAt).toBeNull();
    expect(s.questions).toBe("");
    expect(s.activityLog).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility — old pipeline events still work
// ---------------------------------------------------------------------------

describe("useResearchStore — backward compatibility", () => {
  it("old full pipeline (no checkpoint events) completes correctly", () => {
    dispatch("start", { topic: "Legacy topic" });
    expect(useResearchStore.getState().state).toBe("clarifying");

    // Old pipeline: step-start drives state transitions
    dispatch("step-start", { step: "plan", state: "planning" });
    dispatch("step-delta", { step: "plan", text: "Planning text" });
    dispatch("step-complete", { step: "plan", duration: 1000 });

    dispatch("step-start", { step: "search", state: "searching" });
    dispatch("step-delta", { step: "search", text: "Searching..." });
    dispatch("step-complete", { step: "search", duration: 2000 });

    dispatch("step-start", { step: "analyze", state: "analyzing" });
    dispatch("step-delta", { step: "analyze", text: "Analyzing..." });
    dispatch("step-complete", { step: "analyze", duration: 1500 });

    dispatch("step-start", { step: "review", state: "reviewing" });
    dispatch("step-delta", { step: "review", text: "Reviewing..." });
    dispatch("step-complete", { step: "review", duration: 800 });

    dispatch("step-start", { step: "report", state: "reporting" });
    dispatch("step-delta", { step: "report", text: "# Final Report" });
    dispatch("step-complete", { step: "report", duration: 3000 });

    dispatch("result", {
      title: "Legacy Report",
      report: "# Legacy Report\n\nContent.",
      learnings: ["L1", "L2"],
      sources: [{ url: "https://example.com", title: "Example" }],
      images: [],
    });

    dispatch("done", {});

    const s = useResearchStore.getState();
    expect(s.state).toBe("completed");
    expect(s.result!.title).toBe("Legacy Report");
    expect(s.steps.plan.text).toBe("Planning text");
    expect(s.steps.search.text).toBe("Searching...");
    expect(s.steps.analyze.text).toBe("Analyzing...");
    expect(s.steps.review.text).toBe("Reviewing...");
    expect(s.steps.report.text).toBe("# Final Report");
    expect(s.completedAt).not.toBeNull();
    // No checkpoint data was set in old pipeline
    expect(s.questions).toBe("");
    expect(s.plan).toBe("");
    expect(s.feedback).toBe("");
    expect(s.suggestion).toBe("");
  });

  it("mixed pipeline — old events + checkpoint events interleave", () => {
    dispatch("start", { topic: "Mixed" });

    // Clarify step via old-style step events
    dispatch("step-start", { step: "clarify", state: "clarifying" });
    dispatch("step-delta", { step: "clarify", text: "Thinking..." });
    dispatch("step-complete", { step: "clarify", duration: 500 });

    // Then checkpoint event
    dispatch("clarify-result", { questions: "Q?" });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
    expect(useResearchStore.getState().steps.clarify.text).toBe("Thinking...");

    // User provides feedback
    useResearchStore.getState().setFeedback("Focus on X");

    // Old-style plan step
    dispatch("step-start", { step: "plan", state: "planning" });
    dispatch("step-delta", { step: "plan", text: "Plan text" });
    dispatch("step-complete", { step: "plan", duration: 1000 });

    // Checkpoint event
    dispatch("plan-result", { plan: "Final plan" });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
    expect(useResearchStore.getState().steps.plan.text).toBe("Plan text");

    const s = useResearchStore.getState();
    expect(s.feedback).toBe("Focus on X");
    expect(s.questions).toBe("Q?");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("useResearchStore — multi-phase edge cases", () => {
  it("done event from failed state stays failed", () => {
    dispatch("start", { topic: "test" });
    dispatch("error", { code: "FAIL", message: "Something broke" });
    expect(useResearchStore.getState().state).toBe("failed");

    dispatch("done", {});
    expect(useResearchStore.getState().state).toBe("failed");
  });

  it("multiple clarify-result events update questions", () => {
    dispatch("start", { topic: "test" });
    dispatch("clarify-result", { questions: "First questions" });
    expect(useResearchStore.getState().questions).toBe("First questions");

    dispatch("clarify-result", { questions: "Updated questions" });
    expect(useResearchStore.getState().questions).toBe("Updated questions");
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
  });

  it("multiple plan-result events update plan", () => {
    dispatch("start", { topic: "test" });
    dispatch("plan-result", { plan: "Plan v1" });
    expect(useResearchStore.getState().plan).toBe("Plan v1");

    dispatch("plan-result", { plan: "Plan v2" });
    expect(useResearchStore.getState().plan).toBe("Plan v2");
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
  });

  it("multiple research-result events preserve first result when set", () => {
    dispatch("start", { topic: "test" });
    dispatch("result", {
      title: "Initial",
      report: "Content",
      learnings: ["L0"],
      sources: [],
      images: [],
    });

    dispatch("research-result", { learnings: ["L1"], sources: [], images: [] });
    dispatch("research-result", { learnings: ["L2"], sources: [], images: [] });

    // Original result preserved through multiple research-result events
    const r = useResearchStore.getState().result;
    expect(r!.title).toBe("Initial");
    expect(r!.learnings).toEqual(["L0"]);
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");
  });

  it("consecutive research-result events without prior result create minimal results", () => {
    dispatch("start", { topic: "test" });
    // First research-result with no prior result creates a minimal one
    dispatch("research-result", { learnings: ["L1"], sources: [], images: [] });
    let r = useResearchStore.getState().result;
    expect(r).not.toBeNull();
    expect(r!.title).toBe("");
    expect(r!.learnings).toEqual(["L1"]);

    // Second research-result preserves the first minimal result
    dispatch("research-result", { learnings: ["L2"], sources: [], images: [] });
    r = useResearchStore.getState().result;
    expect(r!.learnings).toEqual(["L1"]); // preserved from first
  });

  it("step streaming data persists across checkpoint transitions", () => {
    dispatch("start", { topic: "test" });

    // Clarify step streams text
    dispatch("step-start", { step: "clarify", state: "clarifying" });
    dispatch("step-delta", { step: "clarify", text: "Thinking..." });
    dispatch("step-complete", { step: "clarify", duration: 500 });

    // Checkpoint event
    dispatch("clarify-result", { questions: "Q?" });

    // Plan step streams text
    dispatch("step-start", { step: "plan", state: "planning" });
    dispatch("step-delta", { step: "plan", text: "Plan..." });
    dispatch("step-complete", { step: "plan", duration: 800 });

    // Checkpoint event
    dispatch("plan-result", { plan: "Plan text" });

    const s = useResearchStore.getState();
    expect(s.steps.clarify.text).toBe("Thinking...");
    expect(s.steps.clarify.progress).toBe(100);
    expect(s.steps.plan.text).toBe("Plan...");
    expect(s.steps.plan.progress).toBe(100);
  });
});
