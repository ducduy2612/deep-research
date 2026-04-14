/**
 * Tests for auto-review round tracking in the research store.
 *
 * Covers: initial state, persistence, hydration, round reset in review-result
 * handler, and boundary conditions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useResearchStore } from "@/stores/research-store";
import * as storage from "@/lib/storage";

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

let storedData: Record<string, unknown> = {};

vi.mock("@/lib/storage", async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { persistedStateSchema: schema } = await import("@/stores/research-store-persist");

  return {
    get: vi.fn(async (key: string, schema?: unknown) => {
      const raw = storedData[key];
      if (!raw) return null;
      if (schema && typeof schema === "object" && "parse" in (schema as { parse: unknown })) {
        try {
          return (schema as { parse: (d: unknown) => unknown }).parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      storedData[key] = value;
    }),
    remove: vi.fn(async (key: string) => {
      delete storedData[key];
    }),
    clear: vi.fn(async () => {
      storedData = {};
    }),
    localforage: {},
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  useResearchStore.getState().reset();
  storedData = {};
  vi.clearAllMocks();
});

function dispatch(eventType: string, data: unknown) {
  useResearchStore.getState().handleEvent(eventType, data);
}

// Advance to awaiting_results_review with a single learning
function advanceToAwaitingResultsReview() {
  dispatch("start", { topic: "Test topic", phase: "clarify" });
  dispatch("step-start", { step: "clarify", state: "clarifying" });
  dispatch("step-complete", { step: "clarify", duration: 500 });
  dispatch("clarify-result", { questions: "Q1?" });
  useResearchStore.getState().setFeedback("A1");
  dispatch("step-start", { step: "plan", state: "planning" });
  dispatch("step-complete", { step: "plan", duration: 500 });
  dispatch("plan-result", { plan: "# Plan\n1. Search X" });
  dispatch("step-start", { step: "search", state: "searching" });
  dispatch("step-complete", { step: "search", duration: 1000 });
  dispatch("research-result", {
    learnings: ["Learning 1"],
    sources: [{ url: "https://example.com", title: "Example" }],
    images: [],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auto-review round tracking", () => {
  describe("initial state", () => {
    it("has autoReviewCurrentRound=0 in INITIAL_STATE", () => {
      expect(useResearchStore.getState().autoReviewCurrentRound).toBe(0);
    });

    it("has autoReviewTotalRounds=0 in INITIAL_STATE", () => {
      expect(useResearchStore.getState().autoReviewTotalRounds).toBe(0);
    });

    it("has autoReviewRoundsRemaining=0 in INITIAL_STATE", () => {
      expect(useResearchStore.getState().autoReviewRoundsRemaining).toBe(0);
    });
  });

  describe("persistence", () => {
    it("persists autoReviewCurrentRound to storage", async () => {
      useResearchStore.setState({
        topic: "test",
        state: "reviewing" as never,
        autoReviewCurrentRound: 2,
        autoReviewTotalRounds: 3,
        autoReviewRoundsRemaining: 1,
      });

      await vi.waitFor(() => expect(storage.set).toHaveBeenCalled());

      const lastCall = (storage.set as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      const data = lastCall?.[1] as Record<string, unknown>;
      expect(data.autoReviewCurrentRound).toBe(2);
      expect(data.autoReviewTotalRounds).toBe(3);
      expect(data.autoReviewRoundsRemaining).toBe(1);
    });
  });

  describe("hydration", () => {
    it("restores autoReviewCurrentRound and autoReviewTotalRounds from persisted data", async () => {
      // Build persisted state with non-zero round fields
      advanceToAwaitingResultsReview();
      useResearchStore.setState({
        autoReviewCurrentRound: 2,
        autoReviewTotalRounds: 3,
        autoReviewRoundsRemaining: 1,
      });

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.autoReviewCurrentRound).toBe(2);
      expect(state.autoReviewTotalRounds).toBe(3);
      expect(state.autoReviewRoundsRemaining).toBe(1);
    });

    it("falls back to 0 when persisted data is missing autoReview fields", async () => {
      // Build minimal persisted state without auto-review fields
      advanceToAwaitingResultsReview();
      const savedData = storedData["research-state"] as Record<string, unknown>;

      // Remove auto-review fields
      delete savedData.autoReviewCurrentRound;
      delete savedData.autoReviewTotalRounds;
      delete savedData.autoReviewRoundsRemaining;

      useResearchStore.getState().reset();
      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.autoReviewCurrentRound).toBe(0);
      expect(state.autoReviewTotalRounds).toBe(0);
      expect(state.autoReviewRoundsRemaining).toBe(0);
    });

    it("falls back to 0 when persisted auto-review values are non-numeric (malformed)", async () => {
      advanceToAwaitingResultsReview();
      const savedData = storedData["research-state"] as Record<string, unknown>;

      // Corrupt the values — Zod schema validates and defaults to 0
      savedData.autoReviewCurrentRound = "not-a-number";
      savedData.autoReviewTotalRounds = null;
      savedData.autoReviewRoundsRemaining = undefined;

      useResearchStore.getState().reset();
      storedData["research-state"] = savedData;

      // The Zod schema should coerce/validate — with .int().min(0).optional().default(0),
      // non-numeric values should fail validation, causing storage.get to return null
      // OR the schema defaults kick in. Let's just verify the store doesn't crash
      // and falls back gracefully.
      // Since the schema uses z.number().int().min(0), passing a string will fail
      // Zod validation and storage.get returns null, so hydrate() does nothing.
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      // Hydrate should either succeed with defaults or no-op — in either case,
      // the store should have safe values (not NaN or undefined)
      expect(state.autoReviewCurrentRound).toBe(0);
      expect(state.autoReviewTotalRounds).toBe(0);
    });
  });

  describe("review-result handler", () => {
    it("resets autoReviewCurrentRound and autoReviewTotalRounds when autoReviewRoundsRemaining=0", () => {
      // Set up state simulating last auto-review round just finishing
      advanceToAwaitingResultsReview();
      useResearchStore.setState({
        state: "reviewing" as never,
        autoReviewCurrentRound: 2,
        autoReviewTotalRounds: 2,
        autoReviewRoundsRemaining: 0, // Already decremented
      });

      dispatch("review-result", {
        learnings: ["New learning"],
        sources: [],
        images: [],
      });

      const state = useResearchStore.getState();
      expect(state.autoReviewCurrentRound).toBe(0);
      expect(state.autoReviewTotalRounds).toBe(0);
    });

    it("does NOT reset round fields when autoReviewRoundsRemaining > 0", () => {
      advanceToAwaitingResultsReview();
      useResearchStore.setState({
        state: "reviewing" as never,
        autoReviewCurrentRound: 1,
        autoReviewTotalRounds: 2,
        autoReviewRoundsRemaining: 1, // Still 1 more round to go
      });

      dispatch("review-result", {
        learnings: ["New learning"],
        sources: [],
        images: [],
      });

      const state = useResearchStore.getState();
      expect(state.autoReviewCurrentRound).toBe(1);
      expect(state.autoReviewTotalRounds).toBe(2);
    });

    it("resets round fields correctly on boundary: reviewing with autoReviewRoundsRemaining=0", () => {
      advanceToAwaitingResultsReview();
      useResearchStore.setState({
        state: "reviewing" as never,
        autoReviewCurrentRound: 1,
        autoReviewTotalRounds: 1,
        autoReviewRoundsRemaining: 0,
      });

      dispatch("review-result", {
        learnings: ["L1"],
        sources: [{ url: "https://example.com/2", title: "Source 2" }],
        images: [],
      });

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_results_review");
      expect(state.autoReviewCurrentRound).toBe(0);
      expect(state.autoReviewTotalRounds).toBe(0);
    });
  });

  describe("reset", () => {
    it("resets all auto-review fields on store reset", () => {
      useResearchStore.setState({
        state: "reviewing" as never,
        autoReviewCurrentRound: 3,
        autoReviewTotalRounds: 5,
        autoReviewRoundsRemaining: 2,
      });

      useResearchStore.getState().reset();

      const state = useResearchStore.getState();
      expect(state.autoReviewCurrentRound).toBe(0);
      expect(state.autoReviewTotalRounds).toBe(0);
      expect(state.autoReviewRoundsRemaining).toBe(0);
    });
  });

  describe("boundary: manual review (no auto-review)", () => {
    it("autoReviewCurrentRound=0 with state=reviewing → no auto-review fields set", () => {
      advanceToAwaitingResultsReview();

      // Manually trigger a review (not auto-review)
      useResearchStore.setState({
        state: "reviewing" as never,
        autoReviewCurrentRound: 0,
        autoReviewTotalRounds: 0,
      });

      dispatch("review-result", {
        learnings: ["Manual learning"],
        sources: [],
        images: [],
      });

      const state = useResearchStore.getState();
      expect(state.autoReviewCurrentRound).toBe(0);
      expect(state.autoReviewTotalRounds).toBe(0);
    });
  });
});
