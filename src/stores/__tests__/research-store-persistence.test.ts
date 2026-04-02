/**
 * Tests for research store persistence — hydrate, auto-persist,
 * connection interrupted state recovery.
 *
 * Uses a mock for localforage storage to verify persistence behavior
 * without needing IndexedDB/LocalStorage.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useResearchStore } from "@/stores/research-store";
import * as storage from "@/lib/storage";

// ---------------------------------------------------------------------------
// Mock storage — capture writes and provide reads
// ---------------------------------------------------------------------------

let storedData: Record<string, unknown> = {};

vi.mock("@/lib/storage", () => ({
  get: vi.fn(async (key: string) => storedData[key] ?? null),
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
}));

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

// Advance through clarify phase to awaiting_feedback
function advanceToAwaitingFeedback() {
  dispatch("start", { topic: "Quantum computing", phase: "clarify" });
  dispatch("step-start", { step: "clarify", state: "clarifying" });
  dispatch("step-delta", { step: "clarify", text: "1. What area?" });
  dispatch("step-complete", { step: "clarify", duration: 1000 });
  dispatch("clarify-result", { questions: "1. What area of quantum computing?" });
}

function advanceToAwaitingPlanReview() {
  advanceToAwaitingFeedback();
  useResearchStore.getState().setFeedback("Focus on error correction");
  dispatch("step-start", { step: "plan", state: "planning" });
  dispatch("step-delta", { step: "plan", text: "# Plan\n1. Background" });
  dispatch("step-complete", { step: "plan", duration: 2000 });
  dispatch("plan-result", { plan: "# Plan\n1. Background\n2. Error correction" });
}

function advanceToAwaitingResultsReview() {
  advanceToAwaitingPlanReview();
  dispatch("step-start", { step: "search", state: "searching" });
  dispatch("step-complete", { step: "search", duration: 3000 });
  dispatch("research-result", {
    learnings: ["Surface codes are promising"],
    sources: [{ url: "https://arxiv.org/paper1", title: "Surface Codes" }],
    images: [],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("research store persistence", () => {
  describe("auto-persist on state changes", () => {
    it("persists state to storage on handleEvent", async () => {
      dispatch("start", { topic: "Test topic" });

      // Wait for async persist
      await vi.waitFor(() => {
        expect(storage.set).toHaveBeenCalled();
      });

      const lastCall = (storage.set as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall?.[0]).toBe("research-state");
      expect((lastCall?.[1] as Record<string, unknown>)?.topic).toBe("Test topic");
    });

    it("removes persisted state on reset", async () => {
      dispatch("start", { topic: "Test topic" });
      await vi.waitFor(() => expect(storage.set).toHaveBeenCalled());

      useResearchStore.getState().reset();
      await vi.waitFor(() => expect(storage.remove).toHaveBeenCalledWith("research-state"));
    });

    it("does not persist idle state", async () => {
      // Reset sets idle state
      useResearchStore.getState().reset();

      // The remove call should happen, but set should NOT be called for idle
      const setCalls = (storage.set as ReturnType<typeof vi.fn>).mock.calls;
      const researchSetCalls = setCalls.filter((c: unknown[]) => c[0] === "research-state");
      expect(researchSetCalls.length).toBe(0);
    });

    it("persists multi-phase checkpoint fields", async () => {
      advanceToAwaitingFeedback();
      useResearchStore.getState().setFeedback("My feedback");

      await vi.waitFor(() => expect(storage.set).toHaveBeenCalled());

      const lastCall = (storage.set as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      const data = lastCall?.[1] as Record<string, unknown>;
      expect(data.feedback).toBe("My feedback");
      expect(data.questions).toBe("1. What area of quantum computing?");
    });
  });

  describe("hydrate", () => {
    it("restores awaiting_feedback state from persisted data", async () => {
      advanceToAwaitingFeedback();

      // Reset the store to simulate page refresh
      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();
      expect(useResearchStore.getState().state).toBe("idle");

      // Put data back and hydrate
      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_feedback");
      expect(state.topic).toBe("Quantum computing");
      expect(state.questions).toBe("1. What area of quantum computing?");
      expect(state.connectionInterrupted).toBe(false);
    });

    it("restores awaiting_plan_review state from persisted data", async () => {
      advanceToAwaitingPlanReview();

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_plan_review");
      expect(state.plan).toBe("# Plan\n1. Background\n2. Error correction");
      expect(state.feedback).toBe("Focus on error correction");
      expect(state.connectionInterrupted).toBe(false);
    });

    it("restores awaiting_results_review state from persisted data", async () => {
      advanceToAwaitingResultsReview();

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_results_review");
      expect(state.result?.learnings).toEqual(["Surface codes are promising"]);
      expect(state.connectionInterrupted).toBe(false);
    });

    it("converts interrupted clarifying state to awaiting_feedback", async () => {
      // Simulate mid-stream interruption — store has clarifying state
      dispatch("start", { topic: "Quantum computing", phase: "clarify" });
      dispatch("step-start", { step: "clarify", state: "clarifying" });
      dispatch("step-delta", { step: "clarify", text: "Partial..." });

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_feedback");
      expect(state.connectionInterrupted).toBe(true);
    });

    it("converts interrupted planning state to awaiting_plan_review", async () => {
      advanceToAwaitingFeedback();
      dispatch("step-start", { step: "plan", state: "planning" });
      dispatch("step-delta", { step: "plan", text: "Partial plan..." });

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_plan_review");
      expect(state.connectionInterrupted).toBe(true);
    });

    it("converts interrupted searching state to awaiting_results_review", async () => {
      advanceToAwaitingPlanReview();
      dispatch("step-start", { step: "search", state: "searching" });
      dispatch("step-delta", { step: "search", text: "Searching..." });

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_results_review");
      expect(state.connectionInterrupted).toBe(true);
    });

    it("converts interrupted reporting state to awaiting_results_review", async () => {
      advanceToAwaitingResultsReview();
      dispatch("step-start", { step: "report", state: "reporting" });
      dispatch("step-delta", { step: "report", text: "Generating..." });

      const savedData = storedData["research-state"];
      useResearchStore.getState().reset();

      storedData["research-state"] = savedData;
      await useResearchStore.getState().hydrate();

      const state = useResearchStore.getState();
      expect(state.state).toBe("awaiting_results_review");
      expect(state.connectionInterrupted).toBe(true);
    });

    it("does not restore idle state", async () => {
      // Idle state is the initial state
      storedData["research-state"] = {
        topic: "",
        state: "idle",
        steps: {},
        searchTasks: [],
        searchResults: [],
        result: null,
        error: null,
        startedAt: null,
        completedAt: null,
        activityLog: [],
        questions: "",
        feedback: "",
        plan: "",
        suggestion: "",
      };

      await useResearchStore.getState().hydrate();
      expect(useResearchStore.getState().state).toBe("idle");
    });

    it("does not restore completed state", async () => {
      storedData["research-state"] = {
        topic: "Test",
        state: "completed",
        steps: {},
        searchTasks: [],
        searchResults: [],
        result: null,
        error: null,
        startedAt: 1000,
        completedAt: 2000,
        activityLog: [],
        questions: "",
        feedback: "",
        plan: "",
        suggestion: "",
      };

      await useResearchStore.getState().hydrate();
      expect(useResearchStore.getState().state).toBe("idle");
    });

    it("does not restore failed state", async () => {
      storedData["research-state"] = {
        topic: "Test",
        state: "failed",
        steps: {},
        searchTasks: [],
        searchResults: [],
        result: null,
        error: { code: "TEST", message: "test" },
        startedAt: 1000,
        completedAt: 2000,
        activityLog: [],
        questions: "",
        feedback: "",
        plan: "",
        suggestion: "",
      };

      await useResearchStore.getState().hydrate();
      expect(useResearchStore.getState().state).toBe("idle");
    });

    it("does nothing when no persisted state exists", async () => {
      storedData = {};
      await useResearchStore.getState().hydrate();
      expect(useResearchStore.getState().state).toBe("idle");
    });
  });

  describe("connectionInterrupted flag", () => {
    it("is false by default", () => {
      expect(useResearchStore.getState().connectionInterrupted).toBe(false);
    });

    it("clears when new research starts", () => {
      // First, hydrate with interrupted state
      storedData["research-state"] = {
        topic: "Test",
        state: "clarifying",
        steps: { clarify: { text: "", reasoning: "", progress: 0, startTime: 1000, endTime: null, duration: null } },
        searchTasks: [],
        searchResults: [],
        result: null,
        error: null,
        startedAt: 1000,
        completedAt: null,
        activityLog: [],
        questions: "",
        feedback: "",
        plan: "",
        suggestion: "",
      };

      // Hydrate — sets connectionInterrupted = true
      // (this won't work with sync mock but let's just set it directly for test)
      useResearchStore.setState({ connectionInterrupted: true });
      expect(useResearchStore.getState().connectionInterrupted).toBe(true);

      // Start new clarify phase
      dispatch("start", { topic: "New topic", phase: "clarify" });
      expect(useResearchStore.getState().connectionInterrupted).toBe(false);
    });

    it("clearInterrupted sets flag to false", () => {
      useResearchStore.setState({ connectionInterrupted: true } as any);
      useResearchStore.getState().clearInterrupted();
      expect(useResearchStore.getState().connectionInterrupted).toBe(false);
    });

    it("clears when intermediate phase starts", () => {
      useResearchStore.setState({ connectionInterrupted: true } as any);

      // Simulate intermediate phase start (plan)
      dispatch("start", { phase: "plan" });
      expect(useResearchStore.getState().connectionInterrupted).toBe(false);
    });
  });
});
