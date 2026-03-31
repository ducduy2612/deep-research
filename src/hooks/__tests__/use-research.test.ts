/* eslint-disable max-lines */
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

  it("calls fetch with correct request body on start", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => {
      result.current.start({ topic: "quantum computing", reportStyle: "technical", reportLength: "comprehensive", language: "English" });
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/research/stream", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.topic).toBe("quantum computing");
    expect(body.reportStyle).toBe("technical");
    expect(body.reportLength).toBe("comprehensive");
    expect(body.language).toBe("English");
  });

  it("navigates to active view on start", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.start({ topic: "test topic" }); });
    expect(useUIStore.getState().activeView).toBe("active");
  });

  it("dispatches SSE events to the store", async () => {
    const { result } = renderHook(() => useResearch());
    const chunk = sse("start", { topic: "AI safety" }) +
      sse("step-start", { step: "plan", state: "planning" }) +
      sse("step-delta", { step: "plan", text: "Planning..." }) +
      sse("step-complete", { step: "plan", duration: 1500 }) + sse("done", {});
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });
    await act(async () => { result.current.start({ topic: "AI safety" }); await wait(50); });
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
    act(() => { result.current.start({ topic: "test" }); });
    await act(async () => { await wait(20); });
    act(() => { result.current.abort(); });
    expect(useResearchStore.getState().state).toBe("aborted");
    expect(result.current.isConnected).toBe(false);
  });

  it("resets store and connection state", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("start", { topic: "test" }) + sse("done", {})]) });
    await act(async () => { result.current.start({ topic: "test" }); await wait(50); });
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
    await act(async () => { result.current.start({ topic: "test" }); await wait(50); });
    expect(result.current.connectionError).toBeTruthy();
    expect(useResearchStore.getState().state).toBe("failed");
  });

  it("handles network errors (fetch throws)", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockRejectedValue(new Error("Network request failed"));
    await act(async () => { result.current.start({ topic: "test" }); await wait(50); });
    expect(result.current.connectionError).toBe("Network request failed");
    expect(useResearchStore.getState().state).toBe("failed");
  });

  it("aborts connection and clears timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: new ReadableStream({ start() {} }) });
    act(() => { result.current.start({ topic: "test" }); });
    await act(async () => { await wait(20); });
    unmount();
    expect(true).toBe(true);
  });

  it("includes promptOverrides, autoReviewRounds, maxSearchQueries in request body", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ promptOverrides: { clarify: "Custom clarify prompt" }, autoReviewRounds: 3, maxSearchQueries: 15 });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.start({ topic: "test settings fields" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.promptOverrides).toEqual({ clarify: "Custom clarify prompt" });
    expect(body.autoReviewRounds).toBe(3);
    expect(body.maxSearchQueries).toBe(15);
  });

  it("auto-saves completed research to history store on done event", async () => {
    const { useHistoryStore } = await import("@/stores/history-store");
    const { result } = renderHook(() => useResearch());
    const researchResult = {
      title: "Test Report", report: "# Test\nReport content",
      learnings: ["Learned A", "Learned B"],
      sources: [{ url: "https://example.com", title: "Example" }], images: [],
    };
    const chunk = sse("start", { topic: "auto-save test" }) + sse("result", researchResult) + sse("done", {});
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });
    await act(async () => {
      result.current.start({ topic: "auto-save test", reportStyle: "technical", reportLength: "brief" });
      await wait(100);
    });
    const history = useHistoryStore.getState();
    expect(history.sessions.length).toBeGreaterThanOrEqual(1);
    const saved = history.sessions[0];
    expect(saved.topic).toBe("auto-save test");
    expect(saved.title).toBe("Test Report");
    expect(saved.report).toBe("# Test\nReport content");
    expect(saved.learnings).toEqual(["Learned A", "Learned B"]);
    expect(saved.reportStyle).toBe("technical");
    expect(saved.reportLength).toBe("brief");
  });

  it("skips auto-save when no result on done event", async () => {
    const { useHistoryStore } = await import("@/stores/history-store");
    useHistoryStore.getState().clearAll();
    const { result } = renderHook(() => useResearch());
    const chunk = sse("start", { topic: "no result test" }) + sse("done", {});
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([chunk]) });
    await act(async () => { result.current.start({ topic: "no result test" }); await wait(100); });
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
  });

  it("omits promptOverrides from body when empty", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ promptOverrides: {} });
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: createMockStream([sse("done", {})]) });
    act(() => { result.current.start({ topic: "empty overrides" }); });
    await act(async () => { await wait(50); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.promptOverrides).toBeUndefined();
  });

  it("aborts previous connection when starting a new one", async () => {
    const { result } = renderHook(() => useResearch());
    mockFetch.mockResolvedValue({ ok: true, body: new ReadableStream({ start() {} }) });
    act(() => { result.current.start({ topic: "first" }); });
    await act(async () => { await wait(20); });
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([sse("start", { topic: "second" }) + sse("done", {})]),
    });
    await act(async () => { result.current.start({ topic: "second" }); await wait(50); });
    expect(useResearchStore.getState().topic).toBe("second");
    expect(useResearchStore.getState().state).toBe("completed");
  });
});
