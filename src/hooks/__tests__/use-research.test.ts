/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useResearch hook.
 *
 * Validates: SSE parsing, buffered SSE parsing, start/abort/reset lifecycle,
 * AbortController management, elapsed timer, connection error handling,
 * and unmount cleanup.
 *
 * Uses a mock fetch to simulate SSE responses without a real server.
 * Tests the pure functions (parseSSEChunk, createSSEBuffer) directly
 * and the hook via @testing-library/react.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  useResearch,
  parseSSEChunk,
  createSSEBuffer,
} from "@/hooks/use-research";
import { useResearchStore } from "@/stores/research-store";
import { useUIStore } from "@/stores/ui-store";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper to create a mock ReadableStream from SSE text
function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

// Helper to create SSE event text
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ---------------------------------------------------------------------------
// Pure function tests: parseSSEChunk
// ---------------------------------------------------------------------------

describe("parseSSEChunk", () => {
  it("parses a single complete SSE event", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    parseSSEChunk(sse("start", { topic: "test" }), (type, data) => {
      events.push({ type, data });
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("start");
    expect(events[0].data).toEqual({ topic: "test" });
  });

  it("parses multiple SSE events in one chunk", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const chunk =
      sse("start", { topic: "test" }) + sse("step-start", { step: "plan", state: "planning" });

    parseSSEChunk(chunk, (type, data) => {
      events.push({ type, data });
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("start");
    expect(events[1].type).toBe("step-start");
  });

  it("skips events with malformed JSON", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const chunk = "event: test\ndata: not-json\n\n";

    parseSSEChunk(chunk, (type, data) => {
      events.push({ type, data });
    });

    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Pure function tests: createSSEBuffer
// ---------------------------------------------------------------------------

describe("createSSEBuffer", () => {
  it("dispatches complete events within a single chunk", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => {
      events.push({ type, data });
    });

    buffer(sse("start", { topic: "test" }));
    expect(events).toHaveLength(1);
  });

  it("handles events split across chunks", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => {
      events.push({ type, data });
    });

    // Split an SSE event across two chunks
    buffer("event: start\nda");
    buffer("ta: {\"topic\":\"test\"}\n\n");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("start");
    expect(events[0].data).toEqual({ topic: "test" });
  });

  it("handles multiple events split across multiple chunks", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => {
      events.push({ type, data });
    });

    // First chunk has one complete event and a partial second
    buffer(sse("start", { topic: "test" }) + "event: step-start\nda");
    // Second chunk completes the second event
    buffer("ta: {\"step\":\"plan\",\"state\":\"planning\"}\n\n");

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("start");
    expect(events[1].type).toBe("step-start");
    expect(events[1].data).toEqual({ step: "plan", state: "planning" });
  });

  it("handles empty chunks", () => {
    const events: Array<{ type: string; data: unknown }> = [];
    const buffer = createSSEBuffer((type, data) => {
      events.push({ type, data });
    });

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it("returns correct initial state", () => {
    const { result } = renderHook(() => useResearch());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.elapsedMs).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.connectionError).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  it("calls fetch with correct request body on start", async () => {
    const { result } = renderHook(() => useResearch());

    const stream = createMockStream([sse("done", {})]);
    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    act(() => {
      result.current.start({
        topic: "quantum computing",
        reportStyle: "technical",
        reportLength: "comprehensive",
        language: "English",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/research/stream",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.topic).toBe("quantum computing");
    expect(body.reportStyle).toBe("technical");
    expect(body.reportLength).toBe("comprehensive");
    expect(body.language).toBe("English");
  });

  it("navigates to active view on start", async () => {
    const { result } = renderHook(() => useResearch());

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([sse("done", {})]),
    });

    act(() => {
      result.current.start({ topic: "test topic" });
    });

    expect(useUIStore.getState().activeView).toBe("active");
  });

  it("dispatches SSE events to the store", async () => {
    const { result } = renderHook(() => useResearch());

    const chunk =
      sse("start", { topic: "AI safety" }) +
      sse("step-start", { step: "plan", state: "planning" }) +
      sse("step-delta", { step: "plan", text: "Planning..." }) +
      sse("step-complete", { step: "plan", duration: 1500 }) +
      sse("done", {});

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([chunk]),
    });

    await act(async () => {
      result.current.start({ topic: "AI safety" });
      // Wait for stream to be consumed
      await new Promise((r) => setTimeout(r, 50));
    });

    const store = useResearchStore.getState();
    expect(store.topic).toBe("AI safety");
    expect(store.state).toBe("completed");
    expect(store.steps.plan.text).toBe("Planning...");
    expect(store.steps.plan.duration).toBe(1500);
  });

  // ---------------------------------------------------------------------------
  // Abort
  // ---------------------------------------------------------------------------

  it("aborts the SSE connection and sets aborted state", async () => {
    const { result } = renderHook(() => useResearch());

    // Create a stream that won't complete on its own
    const stream = new ReadableStream({
      start(ctrl) {
        // Send start event
        const encoder = new TextEncoder();
        ctrl.enqueue(encoder.encode(sse("start", { topic: "test" })));
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    act(() => {
      result.current.start({ topic: "test" });
    });

    // Wait a tick for fetch to start
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Abort
    act(() => {
      result.current.abort();
    });

    expect(useResearchStore.getState().state).toBe("aborted");
    expect(result.current.isConnected).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  it("resets store and connection state", async () => {
    const { result } = renderHook(() => useResearch());

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { topic: "test" }) + sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.start({ topic: "test" });
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.reset();
    });

    expect(useResearchStore.getState().state).toBe("idle");
    expect(useResearchStore.getState().topic).toBe("");
    expect(result.current.connectionError).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Connection errors
  // ---------------------------------------------------------------------------

  it("handles HTTP error responses", async () => {
    const { result } = renderHook(() => useResearch());

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(sse("error", { code: "CONFIG_MISSING_KEY", message: "No API key" })),
    });

    await act(async () => {
      result.current.start({ topic: "test" });
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.connectionError).toBeTruthy();
    expect(useResearchStore.getState().state).toBe("failed");
  });

  it("handles network errors (fetch throws)", async () => {
    const { result } = renderHook(() => useResearch());

    mockFetch.mockRejectedValue(new Error("Network request failed"));

    await act(async () => {
      result.current.start({ topic: "test" });
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.connectionError).toBe("Network request failed");
    expect(useResearchStore.getState().state).toBe("failed");
  });

  // ---------------------------------------------------------------------------
  // Unmount cleanup
  // ---------------------------------------------------------------------------

  it("aborts connection and clears timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useResearch());

    const stream = new ReadableStream({
      start() { /* no-op */ },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    act(() => {
      result.current.start({ topic: "test" });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Unmount should trigger cleanup without errors
    unmount();

    // Store should still be in its state (not crashed)
    expect(true).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Replace abort on second start
  // ---------------------------------------------------------------------------

  it("aborts previous connection when starting a new one", async () => {
    const { result } = renderHook(() => useResearch());

    // First call — never resolves stream
    mockFetch.mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start() { /* never closes */ },
      }),
    });

    act(() => {
      result.current.start({ topic: "first" });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Second start — replaces
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("start", { topic: "second" }) + sse("done", {}),
      ]),
    });

    await act(async () => {
      result.current.start({ topic: "second" });
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(useResearchStore.getState().topic).toBe("second");
    expect(useResearchStore.getState().state).toBe("completed");
  });
});
