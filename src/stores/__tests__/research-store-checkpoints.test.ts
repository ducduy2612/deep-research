/**
 * Tests for useResearchStore — abort from checkpoints, reset from mid-lifecycle,
 * backward compatibility, and multi-phase edge cases.
 *
 * Split from research-store-multi-phase.test.ts to stay under the 500-line limit.
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

  it("multiple research-result events accumulate learnings into existing result", () => {
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

    // Learnings accumulate through multiple research-result events
    const r = useResearchStore.getState().result;
    expect(r!.title).toBe("Initial");
    expect(r!.learnings).toEqual(["L0", "L1", "L2"]);
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");
  });

  it("consecutive research-result events without prior result accumulate learnings", () => {
    dispatch("start", { topic: "test" });
    // First research-result with no prior result creates a minimal one
    dispatch("research-result", { learnings: ["L1"], sources: [], images: [] });
    let r = useResearchStore.getState().result;
    expect(r).not.toBeNull();
    expect(r!.title).toBe("");
    expect(r!.learnings).toEqual(["L1"]);

    // Second research-result accumulates into the first minimal result
    dispatch("research-result", { learnings: ["L2"], sources: [], images: [] });
    r = useResearchStore.getState().result;
    expect(r!.learnings).toEqual(["L1", "L2"]);
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
