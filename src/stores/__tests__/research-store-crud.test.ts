/**
 * Tests for research store CRUD actions: removeSearchResult, retrySearchResult,
 * clearSuggestion, and pendingRetryQueries persistence.
 *
 * Uses the same mock pattern as research-store-freeze.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useResearchStore } from "@/stores/research-store";

// ---------------------------------------------------------------------------
// Mock storage
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

/** Set up 3 search results with learnings and an accumulated result. */
function setupSearchResults() {
  dispatch("start", { topic: "Test topic", phase: "full" });
  dispatch("search-result", {
    query: "quantum computing basics",
    sources: [
      { url: "https://example.com/a", title: "Intro to QC" },
      { url: "https://example.com/shared", title: "Shared Resource" },
    ],
    images: [{ url: "https://img.example.com/quantum.png", description: "QC diagram" }],
  });
  dispatch("search-result", {
    query: "quantum error correction",
    sources: [
      { url: "https://example.com/b", title: "Error Correction" },
      { url: "https://example.com/shared", title: "Shared Resource" },
    ],
    images: [],
  });
  dispatch("search-result", {
    query: "quantum algorithms",
    sources: [{ url: "https://example.com/c", title: "Algorithms" }],
    images: [{ url: "https://img.example.com/algo.png", description: "Circuit" }],
  });

  // Set learnings via analyze step
  dispatch("step-start", { step: "analyze", state: "analyzing" });
  dispatch("step-delta", { step: "analyze", text: "QC uses qubits" });
  dispatch("step-complete", { step: "analyze", duration: 100 });
  dispatch("step-start", { step: "analyze", state: "analyzing" });
  dispatch("step-delta", { step: "analyze", text: "Surface codes correct errors" });
  dispatch("step-complete", { step: "analyze", duration: 100 });
  dispatch("step-start", { step: "analyze", state: "analyzing" });
  dispatch("step-delta", { step: "analyze", text: "Grover searches faster" });
  dispatch("step-complete", { step: "analyze", duration: 100 });

  // Set accumulated result
  dispatch("research-result", {
    learnings: ["QC uses qubits", "Surface codes correct errors", "Grover searches faster"],
    sources: [
      { url: "https://example.com/a", title: "Intro to QC" },
      { url: "https://example.com/shared", title: "Shared Resource" },
      { url: "https://example.com/b", title: "Error Correction" },
      { url: "https://example.com/c", title: "Algorithms" },
    ],
    images: [
      { url: "https://img.example.com/quantum.png", description: "QC diagram" },
      { url: "https://img.example.com/algo.png", description: "Circuit" },
    ],
  });
}

// ---------------------------------------------------------------------------
// removeSearchResult
// ---------------------------------------------------------------------------

describe("removeSearchResult", () => {
  it("removes the correct item from searchResults", () => {
    setupSearchResults();
    useResearchStore.getState().removeSearchResult(1);

    const results = useResearchStore.getState().searchResults;
    expect(results).toHaveLength(2);
    expect(results[0].query).toBe("quantum computing basics");
    expect(results[1].query).toBe("quantum algorithms");
  });

  it("strips learning from result.learnings", () => {
    setupSearchResults();
    useResearchStore.getState().removeSearchResult(0);

    const learnings = useResearchStore.getState().result!.learnings;
    expect(learnings).not.toContain("QC uses qubits");
    expect(learnings).toContain("Surface codes correct errors");
    expect(learnings).toContain("Grover searches faster");
  });

  it("strips sources from result.sources (only URLs not in remaining results)", () => {
    setupSearchResults();
    useResearchStore.getState().removeSearchResult(1);

    const sourceUrls = useResearchStore.getState().result!.sources.map((s) => s.url);
    // example.com/b was only in the removed result
    expect(sourceUrls).not.toContain("https://example.com/b");
    // example.com/shared is in remaining result 0
    expect(sourceUrls).toContain("https://example.com/shared");
    expect(sourceUrls).toContain("https://example.com/a");
    expect(sourceUrls).toContain("https://example.com/c");
  });

  it("strips images from result.images", () => {
    setupSearchResults();
    // Remove "quantum computing basics" which has an image
    useResearchStore.getState().removeSearchResult(0);

    const imageUrls = useResearchStore.getState().result!.images.map((i) => i.url);
    expect(imageUrls).not.toContain("https://img.example.com/quantum.png");
    expect(imageUrls).toContain("https://img.example.com/algo.png");
  });

  it("with out-of-bounds index is no-op", () => {
    setupSearchResults();
    const before = useResearchStore.getState().searchResults.length;

    useResearchStore.getState().removeSearchResult(-1);
    useResearchStore.getState().removeSearchResult(99);
    useResearchStore.getState().removeSearchResult(3);

    expect(useResearchStore.getState().searchResults).toHaveLength(before);
  });

  it("when result is null still removes from searchResults", () => {
    // Set up search results without an accumulated result
    dispatch("start", { topic: "Test", phase: "full" });
    dispatch("search-result", {
      query: "test query",
      sources: [{ url: "https://example.com/x", title: "X" }],
      images: [],
    });

    useResearchStore.getState().removeSearchResult(0);
    expect(useResearchStore.getState().searchResults).toHaveLength(0);
    expect(useResearchStore.getState().result).toBeNull();
  });

  it("logs activity on removal", () => {
    setupSearchResults();
    useResearchStore.getState().removeSearchResult(1);

    const log = useResearchStore.getState().activityLog;
    const entry = log.find((e) => e.message.includes("Removed search result"));
    expect(entry).toBeDefined();
    expect(entry!.message).toContain("quantum error correction");
  });
});

// ---------------------------------------------------------------------------
// retrySearchResult
// ---------------------------------------------------------------------------

describe("retrySearchResult", () => {
  it("stores query in pendingRetryQueries and removes from searchResults", () => {
    setupSearchResults();
    useResearchStore.getState().retrySearchResult(1);

    expect(useResearchStore.getState().pendingRetryQueries).toEqual([
      "quantum error correction",
    ]);
    expect(useResearchStore.getState().searchResults).toHaveLength(2);
  });

  it("strips learning/sources/images same as delete", () => {
    setupSearchResults();
    useResearchStore.getState().retrySearchResult(0);

    // Learning removed
    const learnings = useResearchStore.getState().result!.learnings;
    expect(learnings).not.toContain("QC uses qubits");

    // Image removed (was only in result 0)
    const imageUrls = useResearchStore.getState().result!.images.map((i) => i.url);
    expect(imageUrls).not.toContain("https://img.example.com/quantum.png");

    // Source unique to result 0 removed
    const sourceUrls = useResearchStore.getState().result!.sources.map((s) => s.url);
    expect(sourceUrls).not.toContain("https://example.com/a"); // unique to removed result
    expect(sourceUrls).toContain("https://example.com/shared"); // shared with remaining results
  });

  it("with invalid index is no-op", () => {
    setupSearchResults();
    const before = useResearchStore.getState().searchResults.length;

    useResearchStore.getState().retrySearchResult(-1);
    useResearchStore.getState().retrySearchResult(99);

    expect(useResearchStore.getState().searchResults).toHaveLength(before);
    expect(useResearchStore.getState().pendingRetryQueries).toEqual([]);
  });

  it("logs activity on retry", () => {
    setupSearchResults();
    useResearchStore.getState().retrySearchResult(1);

    const log = useResearchStore.getState().activityLog;
    const entry = log.find((e) => e.message.includes("Queued retry for"));
    expect(entry).toBeDefined();
    expect(entry!.message).toContain("quantum error correction");
  });

  it("accumulates multiple pending retries", () => {
    setupSearchResults();

    useResearchStore.getState().retrySearchResult(0);
    useResearchStore.getState().retrySearchResult(0); // was index 1, now 0 after first removal

    expect(useResearchStore.getState().pendingRetryQueries).toEqual([
      "quantum computing basics",
      "quantum error correction",
    ]);
    expect(useResearchStore.getState().searchResults).toHaveLength(1);
    expect(useResearchStore.getState().searchResults[0].query).toBe("quantum algorithms");
  });
});

// ---------------------------------------------------------------------------
// pendingRetryQueries persistence
// ---------------------------------------------------------------------------

describe("pendingRetryQueries persistence", () => {
  it("persists across hydrate round-trip", async () => {
    setupSearchResults();
    useResearchStore.getState().retrySearchResult(0);

    const savedData = storedData["research-state"];
    useResearchStore.getState().reset();
    storedData["research-state"] = savedData;
    await useResearchStore.getState().hydrate();

    expect(useResearchStore.getState().pendingRetryQueries).toEqual([
      "quantum computing basics",
    ]);
  });

  it("defaults to empty array on old state without field", async () => {
    storedData["research-state"] = {
      topic: "Test",
      state: "awaiting_feedback",
      steps: {},
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
      // No pendingRetryQueries field
    };

    await useResearchStore.getState().hydrate();

    expect(useResearchStore.getState().pendingRetryQueries).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// clearSuggestion
// ---------------------------------------------------------------------------

describe("clearSuggestion", () => {
  it("sets suggestion to empty string", () => {
    setupSearchResults();
    useResearchStore.getState().setSuggestion("Focus on practical applications");
    expect(useResearchStore.getState().suggestion).toBe("Focus on practical applications");

    useResearchStore.getState().clearSuggestion();
    expect(useResearchStore.getState().suggestion).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Delete all results
// ---------------------------------------------------------------------------

describe("delete all results", () => {
  it("leaves empty arrays after deleting all results", () => {
    setupSearchResults();

    useResearchStore.getState().removeSearchResult(0);
    useResearchStore.getState().removeSearchResult(0);
    useResearchStore.getState().removeSearchResult(0);

    const state = useResearchStore.getState();
    expect(state.searchResults).toHaveLength(0);
    expect(state.result!.learnings).toEqual([]);
    expect(state.result!.sources).toEqual([]);
    expect(state.result!.images).toEqual([]);
  });
});
