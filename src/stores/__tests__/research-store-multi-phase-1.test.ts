/**
 * Multi-phase tests for useResearchStore — Part 1.
 *
 * Validates: checkpoint setters, multi-phase SSE events,
 * full multi-phase lifecycle, and reset behavior.
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

  it("research-result accumulates new learnings into existing result", () => {
    dispatch("start", { topic: "test" });
    dispatch("result", {
      title: "Existing Report",
      report: "Content",
      learnings: [],
      sources: [],
      images: [],
    });

    dispatch("research-result", {
      learnings: ["New learning"],
      sources: [],
      images: [],
    });

    const result = useResearchStore.getState().result;
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Existing Report");
    expect(result!.report).toBe("Content");
    // New learnings are accumulated into the existing result
    expect(result!.learnings).toEqual(["New learning"]);
    expect(result!.sources).toEqual([]);
  });

  it("research-result creates minimal result when none exists", () => {
    dispatch("start", { topic: "test" });
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

    // Phase 2: Plan
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
