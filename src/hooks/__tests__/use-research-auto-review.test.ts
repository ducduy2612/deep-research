/**
 * @vitest-environment jsdom
 * Tests for auto-review round tracking in useResearch hook — trigger writing
 * round data to store, and abort behavior during auto-review.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResearch } from "@/hooks/use-research";
import { useResearchStore } from "@/stores/research-store";

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

beforeEach(() => {
  useResearchStore.getState().reset();
  mockFetch.mockReset();
});

afterEach(() => {
  useResearchStore.getState().reset();
});

describe("useResearch auto-review round tracking", () => {
  it("auto-review trigger sets autoReviewCurrentRound to correct round number", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ autoReviewRounds: 2 });

    renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test",
      plan: "# Plan",
      state: "awaiting_results_review",
      autoReviewRoundsRemaining: 1, // Only 1 remaining → round 2 of 2
      result: {
        title: "",
        report: "",
        learnings: ["L1"],
        sources: [{ url: "https://example.com", title: "Example" }],
        images: [],
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      await wait(100);
    });

    // currentRound = totalRounds - remaining + 1 = 2 - 1 + 1 = 2
    expect(useResearchStore.getState().autoReviewCurrentRound).toBe(2);
    expect(useResearchStore.getState().autoReviewTotalRounds).toBe(2);
    useSettingsStore.setState({ autoReviewRounds: 0 });
  });

  it("auto-review trigger sets autoReviewTotalRounds from settings.autoReviewRounds", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ autoReviewRounds: 3 });

    renderHook(() => useResearch());

    useResearchStore.setState({
      topic: "test",
      plan: "# Plan",
      state: "awaiting_results_review",
      autoReviewRoundsRemaining: 1,
      result: {
        title: "",
        report: "",
        learnings: ["L1"],
        sources: [],
        images: [],
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([sse("done", {})]),
    });

    await act(async () => {
      await wait(100);
    });

    expect(useResearchStore.getState().autoReviewTotalRounds).toBe(3);
    useSettingsStore.setState({ autoReviewRounds: 0 });
  });

  it("research-result with remainingQueries keeps state as researching (blocks auto-review)", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ autoReviewRounds: 2 });

    renderHook(() => useResearch());

    // Simulate research hitting cycle cap with remaining queries
    // The store handler keeps state="researching" when remainingQueries exist
    useResearchStore.setState({
      topic: "test",
      plan: "# Plan",
      state: "researching",
      autoReviewRoundsRemaining: 2,
      pendingRemainingQueries: [{ query: "remaining query", scope: "general" }],
      result: {
        title: "",
        report: "",
        learnings: ["L1"],
        sources: [],
        images: [],
      },
    });

    // Auto-reconnect will consume pendingRemainingQueries
    // Return research-result with NO remaining → transitions to awaiting_results_review
    // Then auto-review fires. We just verify the FIRST call is research (not review).
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([
        sse("research-result", { learnings: ["L2"], sources: [], images: [] }),
        sse("done", {}),
      ]),
    });

    await act(async () => {
      await wait(200);
    });

    // The first call must be research (auto-reconnect), not review (auto-review)
    const firstBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(firstBody.phase).toBe("research");
    useSettingsStore.setState({ autoReviewRounds: 0 });
  });

  it("auto-review fires only after all remainingQueries are consumed", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    useSettingsStore.setState({ autoReviewRounds: 2 });

    renderHook(() => useResearch());

    // Start with pending remaining queries — state stays "researching"
    useResearchStore.setState({
      topic: "test",
      plan: "# Plan",
      state: "researching",
      autoReviewRoundsRemaining: 2,
      pendingRemainingQueries: [{ query: "remaining query", scope: "general" }],
      result: {
        title: "",
        report: "",
        learnings: ["L1"],
        sources: [],
        images: [],
      },
    });

    // All fetch calls return SSE streams
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([sse("review-result", {
        learnings: ["L-reviewed"],
        sources: [],
        images: [],
      }), sse("done", {})]),
    });

    // First call: auto-reconnect (phase: research) returns no remaining
    // Need to override for first call only
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: createMockStream([
        sse("research-result", {
          learnings: ["L2"],
          sources: [],
          images: [],
          // No remainingQueries → state transitions to awaiting_results_review
        }),
        sse("done", {}),
      ]),
    });

    await act(async () => {
      await wait(600);
    });

    // Should have 3 calls: research (auto-reconnect), review (round 1), review (round 2)
    const phases = mockFetch.mock.calls.map(
      (call: unknown[]) => JSON.parse((call as RequestInit[])[1].body as string).phase
    );
    expect(phases[0]).toBe("research");
    expect(phases[1]).toBe("review");
    expect(phases[2]).toBe("review");
    expect(phases.length).toBe(3);
    useSettingsStore.setState({ autoReviewRounds: 0 });
  });

  it("abort during auto-review sets state to aborted (store-level abort)", async () => {
    const { result } = renderHook(() => useResearch());

    useResearchStore.setState({
      state: "reviewing" as never,
      autoReviewRoundsRemaining: 2,
      autoReviewCurrentRound: 1,
      autoReviewTotalRounds: 3,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStream([]),
    });

    await act(async () => {
      result.current.abort();
      await wait(50);
    });

    // Store-level abort marks state=aborted but does NOT reset autoReviewRoundsRemaining.
    // Page-level handleAbortAutoReview is responsible for resetting round fields.
    expect(useResearchStore.getState().state).toBe("aborted");
    expect(useResearchStore.getState().autoReviewRoundsRemaining).toBe(2);
  });
});
