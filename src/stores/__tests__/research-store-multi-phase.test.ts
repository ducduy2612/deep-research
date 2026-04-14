/**
 * Tests for useResearchStore — multi-phase lifecycle, state transitions,
 * data persistence, backward compatibility, and edge cases.
 *
 * Split from research-store.test.ts to stay under the 500-line limit.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useResearchStore } from "@/stores/research-store";

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

  it("research-result accumulates learnings into existing result", () => {
    dispatch("start", { topic: "test" });
    // First, a result event sets the report
    dispatch("result", {
      title: "My Report",
      report: "# Full report content",
      learnings: ["L1"],
      sources: [{ url: "https://a.com" }],
      images: [],
    });

    // Then a research-result event accumulates into the existing result
    dispatch("research-result", {
      learnings: ["L2", "L3"],
      sources: [{ url: "https://b.com" }],
      images: [],
    });

    const r = useResearchStore.getState().result;
    expect(r!.title).toBe("My Report");
    expect(r!.report).toBe("# Full report content");
    // Learnings and sources are accumulated across rounds
    expect(r!.learnings).toEqual(["L1", "L2", "L3"]);
    expect(r!.sources).toEqual([{ url: "https://a.com" }, { url: "https://b.com" }]);
  });
});

