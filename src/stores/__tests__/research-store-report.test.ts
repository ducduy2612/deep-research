/**
 * Tests for research store reportFeedback persistence.
 *
 * Verifies: setReportFeedback updates, persistence round-trip,
 * backward compatibility with old state missing reportFeedback.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useResearchStore } from "@/stores/research-store";
import { STORAGE_KEY } from "@/stores/research-store-persist";

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

beforeEach(() => {
  useResearchStore.getState().reset();
  storedData = {};
  vi.clearAllMocks();
});

function dispatch(eventType: string, data: unknown) {
  useResearchStore.getState().handleEvent(eventType, data);
}

describe("reportFeedback", () => {
  it("initializes to empty string", () => {
    expect(useResearchStore.getState().reportFeedback).toBe("");
  });

  it("setReportFeedback updates state", () => {
    useResearchStore.getState().setReportFeedback("Focus on cost analysis");
    expect(useResearchStore.getState().reportFeedback).toBe("Focus on cost analysis");
  });

  it("persists reportFeedback to storage", async () => {
    // Must advance to non-idle state so auto-persist saves instead of removes
    dispatch("start", { topic: "Test topic", phase: "clarify" });
    dispatch("step-start", { step: "clarify", state: "clarifying" });

    useResearchStore.getState().setReportFeedback("Updated feedback");

    await new Promise((r) => setTimeout(r, 10));
    const persisted = storedData[STORAGE_KEY] as Record<string, unknown>;
    expect(persisted).toBeDefined();
    expect((persisted as { reportFeedback: string }).reportFeedback).toBe("Updated feedback");
  });

  it("hydrates reportFeedback from persisted state", async () => {
    storedData[STORAGE_KEY] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
      searchTasks: [],
      searchResults: [],
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
      activityLog: [],
      questions: "",
      feedback: "",
      plan: "",
      suggestion: "",
      reportFeedback: "Persisted feedback",
      checkpoints: {},
    };

    await useResearchStore.getState().hydrate();
    expect(useResearchStore.getState().reportFeedback).toBe("Persisted feedback");
  });

  it("defaults to empty string for old state without reportFeedback", async () => {
    storedData[STORAGE_KEY] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
      searchTasks: [],
      searchResults: [],
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
      activityLog: [],
      questions: "",
      feedback: "",
      plan: "",
      suggestion: "",
    };

    await useResearchStore.getState().hydrate();
    expect(useResearchStore.getState().reportFeedback).toBe("");
  });

  it("reset clears reportFeedback", () => {
    useResearchStore.getState().setReportFeedback("Some feedback");
    expect(useResearchStore.getState().reportFeedback).toBe("Some feedback");

    useResearchStore.getState().reset();
    expect(useResearchStore.getState().reportFeedback).toBe("");
  });
});
