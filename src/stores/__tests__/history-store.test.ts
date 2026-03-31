/**
 * Tests for useHistoryStore.
 *
 * Validates: initial state, hydrate from storage, save/remove/load sessions,
 * FIFO quota at 100, corrupted data fallback, persistence, clearAll, selectors.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

const storage = new Map<string, unknown>();

vi.mock("@/lib/storage", () => ({
  get: vi.fn((key: string, schema: { safeParse: (v: unknown) => { success: boolean } }) => {
    const raw = storage.get(key) ?? null;
    if (raw === null) return Promise.resolve(null);
    const result = schema.safeParse(raw);
    return Promise.resolve(result.success ? raw : null);
  }),
  set: vi.fn((key: string, value: unknown) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  remove: vi.fn((key: string) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
}));

import { useHistoryStore } from "@/stores/history-store";
import {
  selectSessionCount,
  selectSessionsByFilter,
} from "@/stores/history-store";
import type { HistorySession } from "@/stores/history-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<HistorySession> = {}): HistorySession {
  return {
    id: `sess-${Math.random().toString(36).slice(2, 8)}`,
    topic: "Test topic",
    title: "Test Title",
    state: "completed",
    startedAt: Date.now(),
    completedAt: Date.now() + 5000,
    report: "# Report\n\nContent here.",
    learnings: ["Learning 1", "Learning 2"],
    sources: [{ url: "https://example.com", title: "Example" }],
    images: [],
    reportStyle: "balanced",
    reportLength: "standard",
    ...overrides,
  };
}

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  useHistoryStore.setState({ sessions: [], loaded: false });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("useHistoryStore — initial state", () => {
  it("has correct defaults", () => {
    const s = useHistoryStore.getState();
    expect(s.sessions).toEqual([]);
    expect(s.loaded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hydrate
// ---------------------------------------------------------------------------

describe("useHistoryStore — hydrate", () => {
  it("loads sessions from storage", async () => {
    const session = makeSession();
    storage.set("history", { sessions: [session] });

    await useHistoryStore.getState().hydrate();
    const s = useHistoryStore.getState();

    expect(s.loaded).toBe(true);
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].id).toBe(session.id);
  });

  it("handles empty storage gracefully", async () => {
    await useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().loaded).toBe(true);
    expect(useHistoryStore.getState().sessions).toEqual([]);
  });

  it("handles corrupted storage data", async () => {
    storage.set("history", { invalid: true });
    await useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().loaded).toBe(true);
    expect(useHistoryStore.getState().sessions).toEqual([]);
  });

  it("handles malformed session entries", async () => {
    storage.set("history", {
      sessions: [{ foo: "bar" }],
    });
    await useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().loaded).toBe(true);
    expect(useHistoryStore.getState().sessions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

describe("useHistoryStore — save", () => {
  it("saves a session", () => {
    const session = makeSession();
    useHistoryStore.getState().save(session);
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useHistoryStore.getState().sessions[0].id).toBe(session.id);
  });

  it("prepends new session (most recent first)", () => {
    const older = makeSession({ id: "old", startedAt: 1000 });
    const newer = makeSession({ id: "new", startedAt: 2000 });
    useHistoryStore.getState().save(older);
    useHistoryStore.getState().save(newer);
    expect(useHistoryStore.getState().sessions[0].id).toBe("new");
  });

  it("updates existing session by id", () => {
    const session = makeSession({ id: "same", title: "Old Title" });
    useHistoryStore.getState().save(session);
    useHistoryStore.getState().save(
      makeSession({ id: "same", title: "New Title" }),
    );
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useHistoryStore.getState().sessions[0].title).toBe("New Title");
  });

  it("persists via storage.set()", async () => {
    const { set } = await import("@/lib/storage");
    useHistoryStore.getState().save(makeSession());
    await vi.waitFor(() => {
      expect(vi.mocked(set)).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// FIFO quota
// ---------------------------------------------------------------------------

describe("useHistoryStore — FIFO quota", () => {
  it("removes oldest session at 100 limit", () => {
    // Fill to 100 sessions
    for (let i = 0; i < 100; i++) {
      useHistoryStore.getState().save(
        makeSession({ id: `sess-${i}`, startedAt: i * 1000 }),
      );
    }
    expect(useHistoryStore.getState().sessions).toHaveLength(100);

    // Save one more — oldest should be removed
    useHistoryStore.getState().save(
      makeSession({ id: "sess-100", startedAt: 200000 }),
    );
    expect(useHistoryStore.getState().sessions).toHaveLength(100);
    // The oldest (sess-0) should be gone
    expect(
      useHistoryStore.getState().sessions.find((s) => s.id === "sess-0"),
    ).toBeUndefined();
    // The newest should be present
    expect(
      useHistoryStore.getState().sessions.find((s) => s.id === "sess-100"),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

describe("useHistoryStore — remove", () => {
  it("removes a session by id", () => {
    const s1 = makeSession({ id: "a" });
    const s2 = makeSession({ id: "b" });
    useHistoryStore.getState().save(s1);
    useHistoryStore.getState().save(s2);
    useHistoryStore.getState().remove("a");
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useHistoryStore.getState().sessions[0].id).toBe("b");
  });

  it("handles removing non-existent session", () => {
    useHistoryStore.getState().save(makeSession({ id: "a" }));
    useHistoryStore.getState().remove("nonexistent");
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

describe("useHistoryStore — load", () => {
  it("loads a session by id", () => {
    const session = makeSession({ id: "target" });
    useHistoryStore.getState().save(session);
    const loaded = useHistoryStore.getState().load("target");
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe("target");
  });

  it("returns undefined for non-existent id", () => {
    expect(useHistoryStore.getState().load("nonexistent")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ClearAll
// ---------------------------------------------------------------------------

describe("useHistoryStore — clearAll", () => {
  it("clears all sessions", () => {
    useHistoryStore.getState().save(makeSession());
    useHistoryStore.getState().save(makeSession());
    useHistoryStore.getState().clearAll();
    expect(useHistoryStore.getState().sessions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe("useHistoryStore — selectors", () => {
  it("selectSessionCount returns total count", () => {
    useHistoryStore.getState().save(makeSession());
    useHistoryStore.getState().save(makeSession());
    expect(selectSessionCount(useHistoryStore.getState())).toBe(2);
  });

  it("selectSessionsByFilter with 'all' returns all sessions", () => {
    useHistoryStore.getState().save(makeSession({ state: "completed" }));
    useHistoryStore.getState().save(makeSession({ state: "failed" }));
    const result = selectSessionsByFilter("all")(useHistoryStore.getState());
    expect(result).toHaveLength(2);
  });

  it("selectSessionsByFilter filters by state", () => {
    useHistoryStore.getState().save(makeSession({ id: "c1", state: "completed" }));
    useHistoryStore.getState().save(makeSession({ id: "f1", state: "failed" }));
    useHistoryStore.getState().save(makeSession({ id: "a1", state: "aborted" }));

    const completed = selectSessionsByFilter("completed")(useHistoryStore.getState());
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe("c1");

    const failed = selectSessionsByFilter("failed")(useHistoryStore.getState());
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe("f1");
  });
});
