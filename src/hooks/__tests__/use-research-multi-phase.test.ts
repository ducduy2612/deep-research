/**
 * @vitest-environment jsdom
 * Tests for useResearch multi-phase SSE flow — clarify, plan, research, report phases.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResearch } from "@/hooks/use-research";
import { useResearchStore } from "@/stores/research-store";
import { useUIStore } from "@/stores/ui-store";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) { controller.enqueue(encoder.encode(chunks[index++])); }
      else { controller.close(); }
    },
  });
}
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("useResearch multi-phase flow", () => {
  beforeEach(() => {
    useResearchStore.getState().reset();
    useUIStore.getState().navigate("hub");
    mockFetch.mockReset();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("clarify() sends phase=clarify with topic and resets store", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { topic: "quantum computing", phase: "clarify" }) +
        sse("step-delta", { step: "clarify", text: "What specific aspects..." }) +
        sse("clarify-result", { questions: "1. What aspects?\n2. Any constraints?" }) +
        sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.clarify({ topic: "quantum computing" });
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("clarify");
    expect(body.topic).toBe("quantum computing");

    const store = useResearchStore.getState();
    expect(store.topic).toBe("quantum computing");
    expect(store.state).toBe("awaiting_feedback");
    expect(store.questions).toBe("1. What aspects?\n2. Any constraints?");
    expect(useUIStore.getState().activeView).toBe("active");
  });

  it("submitFeedbackAndPlan() reads questions+feedback from store and sends phase=plan", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "AI safety",
      questions: "1. What aspects?",
      feedback: "Focus on alignment",
      state: "awaiting_feedback",
      startedAt: Date.now(),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { topic: "AI safety", phase: "plan" }) +
        sse("plan-result", { plan: "# Research Plan\n1. Search X\n2. Analyze Y" }) +
        sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.submitFeedbackAndPlan();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("plan");
    expect(body.topic).toBe("AI safety");
    expect(body.questions).toBe("1. What aspects?");
    expect(body.feedback).toBe("Focus on alignment");

    const store = useResearchStore.getState();
    expect(store.state).toBe("awaiting_plan_review");
    expect(store.plan).toBe("# Research Plan\n1. Search X\n2. Analyze Y");
  });

  it("approvePlanAndResearch() reads plan from store and sends phase=research", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test",
      plan: "# Plan\n1. Search",
      state: "awaiting_plan_review",
      startedAt: Date.now(),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { phase: "research" }) +
        sse("research-result", {
          learnings: ["Found A"],
          sources: [{ url: "https://example.com", title: "Example" }],
          images: [],
        }) +
        sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.approvePlanAndResearch();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("research");
    expect(body.plan).toBe("# Plan\n1. Search");
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");
  });

  it("requestMoreResearch() appends suggestion to plan", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test", plan: "# Plan\n1. Search",
      suggestion: "Look deeper into X",
      state: "awaiting_results_review", startedAt: Date.now(),
    });

    mockFetch.mockResolvedValue({
      ok: true, body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      result.current.requestMoreResearch();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("research");
    expect(body.plan).toContain("Look deeper into X");
  });

  it("requestMoreResearch() sends plan without suggestion when empty", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test", plan: "# Plan\n1. Search",
      suggestion: "", state: "awaiting_results_review", startedAt: Date.now(),
    });

    mockFetch.mockResolvedValue({
      ok: true, body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      result.current.requestMoreResearch();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.plan).toBe("# Plan\n1. Search");
  });

  it("generateReport() reads result from store and sends phase=report", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test", plan: "# Plan\n1. Search",
      state: "awaiting_results_review", startedAt: Date.now(),
      result: {
        title: "", report: "",
        learnings: ["Learned A", "Learned B"],
        sources: [{ url: "https://example.com", title: "Example" }],
        images: [{ url: "https://img.com/1.jpg", description: "Diagram" }],
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { phase: "report" }) +
        sse("result", {
          title: "Test Report", report: "# Final Report\nContent here",
          learnings: ["Learned A", "Learned B"],
          sources: [{ url: "https://example.com", title: "Example" }],
          images: [{ url: "https://img.com/1.jpg", description: "Diagram" }],
        }) +
        sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.generateReport();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("report");
    expect(body.plan).toBe("# Plan\n1. Search");
    expect(body.learnings).toEqual(["Learned A", "Learned B"]);

    const store = useResearchStore.getState();
    expect(store.state).toBe("completed");
    expect(store.result?.title).toBe("Test Report");
  });

  it("generateReport() auto-saves to history on done", async () => {
    const { useHistoryStore } = await import("@/stores/history-store");
    useHistoryStore.getState().clearAll();

    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "report save test", plan: "# Plan",
      state: "awaiting_results_review", startedAt: 1000,
      result: {
        title: "", report: "", learnings: ["L1"],
        sources: [{ url: "https://a.com", title: "A" }], images: [],
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("result", {
          title: "Report Save", report: "# Report", learnings: ["L1"],
          sources: [{ url: "https://a.com", title: "A" }], images: [],
        }) + sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.generateReport();
      await wait(100);
    });

    const history = useHistoryStore.getState();
    expect(history.sessions.length).toBeGreaterThanOrEqual(1);
    const saved = history.sessions[history.sessions.length - 1];
    expect(saved.topic).toBe("report save test");
    expect(saved.title).toBe("Report Save");
  });

  it("timer persists across phases", async () => {
    const { result } = renderHook(() => useResearch());

    // Phase 1: clarify
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { topic: "timer test", phase: "clarify" }) +
        sse("clarify-result", { questions: "Q?" }) + sse("done", {}),
      ]),
    });
    await act(async () => {
      result.current.clarify({ topic: "timer test" });
      await wait(100);
    });

    const startedAt = useResearchStore.getState().startedAt;
    expect(startedAt).toBeTruthy();
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");

    // Phase 2: plan — startedAt should persist
    useResearchStore.getState().setFeedback("My feedback");
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("plan-result", { plan: "# Plan" }) + sse("done", {}),
      ]),
    });
    await act(async () => {
      result.current.submitFeedbackAndPlan();
      await wait(100);
    });

    expect(useResearchStore.getState().startedAt).toBe(startedAt);
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
  });

  it("error in any phase sets failed state", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "error test", plan: "# Plan",
      state: "awaiting_plan_review", startedAt: Date.now(),
    });

    mockFetch.mockResolvedValue({
      ok: false, status: 500,
      text: () => Promise.resolve(sse("error", { code: "INTERNAL", message: "Server error" })),
    });

    await act(async () => {
      result.current.approvePlanAndResearch();
      await wait(100);
    });

    expect(useResearchStore.getState().state).toBe("failed");
    expect(result.current.connectionError).toBeTruthy();
  });

  it("full pipeline: clarify → plan → research → report", async () => {
    const { useHistoryStore } = await import("@/stores/history-store");
    useHistoryStore.getState().clearAll();

    const { result } = renderHook(() => useResearch());

    // Phase 1: Clarify
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("clarify-result", { questions: "Q1?" }) + sse("done", {}),
      ]),
    });
    await act(async () => {
      result.current.clarify({ topic: "full flow", reportStyle: "technical" });
      await wait(100);
    });
    expect(useResearchStore.getState().state).toBe("awaiting_feedback");
    expect(useResearchStore.getState().questions).toBe("Q1?");

    // Set feedback
    act(() => { useResearchStore.getState().setFeedback("Focus on X"); });

    // Phase 2: Plan
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("plan-result", { plan: "# Plan\n1. Step" }) + sse("done", {}),
      ]),
    });
    await act(async () => {
      result.current.submitFeedbackAndPlan();
      await wait(100);
    });
    expect(useResearchStore.getState().state).toBe("awaiting_plan_review");
    expect(useResearchStore.getState().plan).toBe("# Plan\n1. Step");

    // Phase 3: Research
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("research-result", {
          learnings: ["L1"],
          sources: [{ url: "https://a.com", title: "A" }],
          images: [],
        }) + sse("done", {}),
      ]),
    });
    await act(async () => {
      result.current.approvePlanAndResearch();
      await wait(100);
    });
    expect(useResearchStore.getState().state).toBe("awaiting_results_review");

    // Phase 4: Report
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("result", {
          title: "Final", report: "# Report", learnings: ["L1"],
          sources: [{ url: "https://a.com", title: "A" }], images: [],
        }) + sse("done", {}),
      ]),
    });
    await act(async () => {
      result.current.generateReport();
      await wait(100);
    });
    expect(useResearchStore.getState().state).toBe("completed");
    expect(useResearchStore.getState().result?.title).toBe("Final");

    // Verify auto-save
    const history = useHistoryStore.getState();
    expect(history.sessions.length).toBeGreaterThanOrEqual(1);
    expect(history.sessions[history.sessions.length - 1].title).toBe("Final");
  });
});
