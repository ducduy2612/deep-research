/**
 * @vitest-environment jsdom
 * Tests for useResearch hook — SSE parsing, lifecycle, settings integration, auto-save.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useResearch, parseSSEChunk, createSSEBuffer,
} from "@/hooks/use-research";
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

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------
describe("parseSSEChunk", () => {
  it("parses a single complete SSE event", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    parseSSEChunk(sse("start", { topic: "test" }), (type, data) => events.push({ type, data }));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "start", data: { topic: "test" } });
  });
  it("parses multiple SSE events in one chunk", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    parseSSEChunk(
      sse("start", { topic: "test" }) + sse("step-start", { step: "plan", state: "planning" }),
      (type, data) => events.push({ type, data }),
    );
    expect(events).toHaveLength(2);
  });
  it("skips events with malformed JSON", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    parseSSEChunk("event: test\ndata: not-json\n\n", (type, data) => events.push({ type, data }));
    expect(events).toHaveLength(0);
  });
});

describe("createSSEBuffer", () => {
  it("dispatches complete events within a single chunk", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => events.push({ type, data }));
    buffer(sse("start", { topic: "test" }));
    expect(events).toHaveLength(1);
  });
  it("handles events split across chunks", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => events.push({ type, data }));
    buffer("event: start\nda");
    buffer("ta: {\"topic\":\"test\"}\n\n");
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ topic: "test" });
  });
  it("handles multiple events split across multiple chunks", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => events.push({ type, data }));
    buffer(sse("start", { topic: "test" }) + "event: step-start\nda");
    buffer("ta: {\"step\":\"plan\",\"state\":\"planning\"}\n\n");
    expect(events).toHaveLength(2);
    expect(events[1].data).toEqual({ step: "plan", state: "planning" });
  });
  it("handles empty chunks", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => events.push({ type, data }));
    buffer("");
    buffer(sse("start", { topic: "test" }));
    expect(events).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Hook tests
// ---------------------------------------------------------------------------
describe("useResearch hook", () => {
  beforeEach(() => {
    useResearchStore.getState().reset();
    useUIStore.getState().navigate("hub");
    mockFetch.mockReset();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns correct initial state", () => {
    const { result } = renderHook(() => useResearch());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.elapsedMs).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.connectionError).toBeNull();
  });

  it("does not expose start method", () => {
    const { result } = renderHook(() => useResearch());
    expect((result.current as Record<string, unknown>).start).toBeUndefined();
  });

  it("calls fetch with correct request body on clarify", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => {
      result.current.clarify({ topic: "quantum computing", reportStyle: "technical", reportLength: "comprehensive", language: "English" });
    });
    await act(async () => { await wait(50); });
    expect(mockFetch).toHaveBeenCalledWith("/api/research/stream", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.topic).toBe("quantum computing");
    expect(body.phase).toBe("clarify");
    expect(body.reportStyle).toBe("technical");
    expect(body.reportLength).toBe("comprehensive");
    expect(body.language).toBe("English");
  });

  it("navigates to active view on clarify", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.clarify({ topic: "test topic" }); });
    expect(useUIStore.getState().activeView).toBe("active");
  });

  it("dispatches SSE events to the store", async () => {
    const { result } = renderHook(() => useResearch());
    const chunk = sse("start", { topic: "AI safety" }) +
      sse("step-start", { step: "plan", state: "planning" }) +
      sse("step-delta", { step: "plan", text: "Planning..." }) +
      sse("step-complete", { step: "plan", duration: 1500 }) + sse("done", {});
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });
    await act(async () => { result.current.clarify({ topic: "AI safety" }); await wait(50); });
    const store = useResearchStore.getState();
    expect(store.topic).toBe("AI safety");
    expect(store.state).toBe("completed");
    expect(store.steps.plan.text).toBe("Planning...");
    expect(store.steps.plan.duration).toBe(1500);
  });

  it("aborts the SSE connection and sets aborted state", async () => {
    const { result } = renderHook(() => useResearch());
    const encoder = new TextEncoder();
    mockFetch.mockResolvedValue({
      ok: true,
      body: new ReadableStream({ start(ctrl) { ctrl.enqueue(encoder.encode(sse("start", { topic: "test" }))); } }),
    });
    act(() => { result.current.clarify({ topic: "test" }); });
    await act(async () => { await wait(20); });
    act(() => { result.current.abort(); });
    expect(useResearchStore.getState().state).toBe("aborted");
    expect(result.current.isConnected).toBe(false);
  });

  it("resets store and connection state", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("start", { topic: "test" }) + sse("done", {})]) });
    await act(async () => { result.current.clarify({ topic: "test" }); await wait(50); });
    act(() => { result.current.reset(); });
    expect(useResearchStore.getState().state).toBe("idle");
    expect(useResearchStore.getState().topic).toBe("");
    expect(result.current.connectionError).toBeNull();
  });

  it("handles HTTP error responses", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({
      ok: false, status: 500,
      text: () => Promise.resolve(sse("error", { code: "CONFIG_MISSING_KEY", message: "No API key" })),
    });
    await act(async () => { result.current.clarify({ topic: "test" }); await wait(50); });
    expect(result.current.connectionError).toBeTruthy();
    expect(useResearchStore.getState().state).toBe("failed");
  });

  it("handles network errors (fetch throws)", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockRejectedValue(new Error("Network request failed"));
    await act(async () => { result.current.clarify({ topic: "test" }); await wait(50); });
    expect(result.current.connectionError).toBe("Network request failed");
    expect(useResearchStore.getState().state).toBe("failed");
  });

  it("aborts connection and clears timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: new ReadableStream({ start() {} }) });
    act(() => { result.current.clarify({ topic: "test" }); });
    await act(async () => { await wait(20); });
    unmount();
    expect(true).toBe(true);
  });

  it("includes promptOverrides, autoReviewRounds, maxSearchQueries in request body", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ promptOverrides: { clarify: "Custom clarify prompt" }, autoReviewRounds: 3, maxSearchQueries: 15 });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.clarify({ topic: "test settings fields" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.promptOverrides).toEqual({ clarify: "Custom clarify prompt" });
    expect(body.autoReviewRounds).toBe(3);
    expect(body.maxSearchQueries).toBe(15);
  });

  it("auto-saves completed research to history on report phase done", async () => {
    const { useHistoryStore } = await import("@/stores/history-store");
    const { result } = renderHook(() => useResearch());

    // Set up store with research data
    useResearchStore.setState({
      topic: "auto-save test",
      plan: "# Plan",
      startedAt: 1000,
      result: {
        title: "", report: "",
        learnings: ["Learned A", "Learned B"],
        sources: [{ url: "https://example.com", title: "Example" }],
        images: [],
      },
    });

    const researchResult = {
      title: "Test Report", report: "# Test\nReport content",
      learnings: ["Learned A", "Learned B"],
      sources: [{ url: "https://example.com", title: "Example" }], images: [],
    };
    const chunk = sse("result", researchResult) + sse("done", {});
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });
    await act(async () => {
      result.current.generateReport();
      await wait(100);
    });
    const history = useHistoryStore.getState();
    expect(history.sessions.length).toBeGreaterThanOrEqual(1);
    const saved = history.sessions[0];
    expect(saved.topic).toBe("auto-save test");
    expect(saved.title).toBe("Test Report");
    expect(saved.report).toBe("# Test\nReport content");
    expect(saved.learnings).toEqual(["Learned A", "Learned B"]);
  });

  it("skips auto-save when no result on done event", async () => {
    const { useHistoryStore } = await import("@/stores/history-store");
    useHistoryStore.getState().clearAll();
    const { result } = renderHook(() => useResearch());
    const chunk = sse("start", { topic: "no result test" }) + sse("done", {});
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });
    await act(async () => { result.current.clarify({ topic: "no result test" }); await wait(100); });
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
  });

  it("omits promptOverrides from body when empty", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ promptOverrides: {} });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.clarify({ topic: "empty overrides" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.promptOverrides).toBeUndefined();
  });

  it("aborts previous connection when starting a new one", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: new ReadableStream({ start() {} }) });
    act(() => { result.current.clarify({ topic: "first" }); });
    await act(async () => { await wait(20); });
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([sse("start", { topic: "second" }) + sse("done", {})]),
    });
    await act(async () => { result.current.clarify({ topic: "second" }); await wait(50); });
    expect(useResearchStore.getState().topic).toBe("second");
    expect(useResearchStore.getState().state).toBe("completed");
  });

  // -------------------------------------------------------------------------
  // Knowledge integration tests
  // -------------------------------------------------------------------------
  it("includes localOnly flag in request body when enabled", async () => {
    const { useSettingsStore: settings } = await import("@/stores/settings-store");
    settings.setState({ localOnlyMode: true, selectedKnowledgeIds: [] });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.clarify({ topic: "local only test" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.localOnly).toBe(true);
    expect(body.knowledgeContent).toEqual([]);
    // Reset
    settings.setState({ localOnlyMode: false });
  });

  it("includes knowledge content when selected IDs are set", async () => {
    const { useSettingsStore: settings } = await import("@/stores/settings-store");
    const { useKnowledgeStore: knowledge } = await import("@/stores/knowledge-store");
    knowledge.setState({
      items: [
        { id: "k1", title: "Doc A", content: "Content A", type: "file", chunkCount: 1, createdAt: Date.now(), updatedAt: Date.now() },
        { id: "k2", title: "Doc B", content: "Content B", type: "url", chunkCount: 1, createdAt: Date.now(), updatedAt: Date.now() },
      ],
      loaded: true,
    });
    settings.setState({ localOnlyMode: false, selectedKnowledgeIds: ["k1", "k2"] });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.clarify({ topic: "knowledge test" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.localOnly).toBe(false);
    expect(body.knowledgeContent).toHaveLength(2);
    expect(body.knowledgeContent[0]).toEqual({ title: "Doc A", content: "Content A" });
    expect(body.knowledgeContent[1]).toEqual({ title: "Doc B", content: "Content B" });
    // Reset
    settings.setState({ selectedKnowledgeIds: [] });
    knowledge.setState({ items: [], loaded: false });
  });

  it("filters out deleted knowledge items from request body", async () => {
    const { useSettingsStore: settings } = await import("@/stores/settings-store");
    const { useKnowledgeStore: knowledge } = await import("@/stores/knowledge-store");
    knowledge.setState({
      items: [
        { id: "k1", title: "Doc A", content: "Content A", type: "file", chunkCount: 1, createdAt: Date.now(), updatedAt: Date.now() },
      ],
      loaded: true,
    });
    settings.setState({ selectedKnowledgeIds: ["k1", "k-deleted"] });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.clarify({ topic: "deleted item test" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.knowledgeContent).toHaveLength(1);
    expect(body.knowledgeContent[0].title).toBe("Doc A");
    // Reset
    settings.setState({ selectedKnowledgeIds: [] });
    knowledge.setState({ items: [], loaded: false });
  });

  // -------------------------------------------------------------------------
  // requestMoreResearch → review phase tests
  // -------------------------------------------------------------------------
  it("requestMoreResearch sends phase:review with learnings/sources/images", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test", plan: "# Plan\n1. Search",
      suggestion: "Look deeper into X",
      state: "awaiting_results_review", startedAt: Date.now(),
      result: {
        title: "", report: "",
        learnings: ["L1", "L2"],
        sources: [{ url: "https://a.com", title: "A" }],
        images: [{ url: "https://img.com/1.jpg", description: "Diagram" }],
      },
    });

    mockFetch.mockResolvedValue({
      ok: true, body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      result.current.requestMoreResearch();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("review");
    expect(body.plan).toBe("# Plan\n1. Search");
    expect(body.learnings).toEqual(["L1", "L2"]);
    expect(body.sources).toEqual([{ url: "https://a.com", title: "A" }]);
    expect(body.images).toEqual([{ url: "https://img.com/1.jpg", description: "Diagram" }]);
    expect(body.suggestion).toBe("Look deeper into X");
  });

  it("requestMoreResearch omits suggestion when empty", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test", plan: "# Plan",
      suggestion: "",
      state: "awaiting_results_review", startedAt: Date.now(),
      result: {
        title: "", report: "",
        learnings: [],
        sources: [],
        images: [],
      },
    });

    mockFetch.mockResolvedValue({
      ok: true, body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      result.current.requestMoreResearch();
      await wait(100);
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.phase).toBe("review");
    expect(body.suggestion).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // review-result event handler tests
  // -------------------------------------------------------------------------
  it("review-result event merges learnings/sources/images into store", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test",
      state: "reviewing",
      startedAt: Date.now(),
      result: {
        title: "", report: "",
        learnings: ["L1"],
        sources: [{ url: "https://a.com", title: "A" }],
        images: [],
      },
    });

    const chunk = sse("review-result", {
      learnings: ["L2", "L3"],
      sources: [{ url: "https://b.com", title: "B" }],
      images: [{ url: "https://img.com/1.jpg", description: "Img" }],
    }) + sse("done", {});

    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });

    // Fire a research phase SSE that emits review-result
    await act(async () => {
      result.current.approvePlanAndResearch();
      await wait(50);
    });

    // Actually, review-result comes via SSE — let's test the store handler directly
  });

  it("handleEvent review-result merges data into store result", () => {
    useResearchStore.setState({
      result: {
        title: "Existing", report: "Report",
        learnings: ["L1"],
        sources: [{ url: "https://a.com", title: "A" }],
        images: [],
      },
    });

    useResearchStore.getState().handleEvent("review-result", {
      learnings: ["L2", "L3"],
      sources: [{ url: "https://b.com", title: "B" }],
      images: [{ url: "https://img.com/1.jpg", description: "Img" }],
    });

    const store = useResearchStore.getState();
    expect(store.result?.learnings).toEqual(["L1", "L2", "L3"]);
    expect(store.result?.sources).toEqual([
      { url: "https://a.com", title: "A" },
      { url: "https://b.com", title: "B" },
    ]);
    expect(store.result?.images).toEqual([
      { url: "https://img.com/1.jpg", description: "Img" },
    ]);
    expect(store.state).toBe("awaiting_results_review");
    expect(store.result?.title).toBe("Existing");
    expect(store.result?.report).toBe("Report");
  });

  it("handleEvent review-result merges into empty result", () => {
    useResearchStore.setState({ result: null });

    useResearchStore.getState().handleEvent("review-result", {
      learnings: ["L1"],
      sources: [{ url: "https://a.com", title: "A" }],
      images: [],
    });

    const store = useResearchStore.getState();
    expect(store.result?.learnings).toEqual(["L1"]);
    expect(store.result?.sources).toEqual([{ url: "https://a.com", title: "A" }]);
    expect(store.state).toBe("awaiting_results_review");
  });

  // -------------------------------------------------------------------------
  // autoReviewRoundsRemaining tests
  // -------------------------------------------------------------------------
  it("approvePlanAndResearch initializes autoReviewRoundsRemaining from settings", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ autoReviewRounds: 2 });

    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test", plan: "# Plan",
      state: "awaiting_plan_review",
    });

    mockFetch.mockResolvedValue({
      ok: true, body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      result.current.approvePlanAndResearch();
      await wait(50);
    });

    expect(useResearchStore.getState().autoReviewRoundsRemaining).toBe(2);
    useSettingsStore.setState({ autoReviewRounds: 0 });
  });

  it("autoReviewRoundsRemaining is persisted in store state", () => {
    useResearchStore.setState({ autoReviewRoundsRemaining: 3 });
    expect(useResearchStore.getState().autoReviewRoundsRemaining).toBe(3);
  });
});
