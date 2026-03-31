/**
 * Tests for useKnowledgeStore.
 * Validates: initial state, hydrate, CRUD, FIFO quota at 200,
 * Fuse.js search, corrupted data fallback, persistence, selectors.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

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
  remove: vi.fn((key: string) => { storage.delete(key); return Promise.resolve(); }),
  clear: vi.fn(() => { storage.clear(); return Promise.resolve(); }),
}));

import { useKnowledgeStore, selectItemCount, selectItemsByType } from "@/stores/knowledge-store";
import type { KnowledgeItem } from "@/engine/knowledge/types";

function makeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Document",
    content: "This is test content for the knowledge base item.",
    type: "file",
    fileType: "text/plain",
    fileName: "test.txt",
    fileSize: 42,
    chunkCount: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  useKnowledgeStore.setState({ items: [], loaded: false });
});

describe("useKnowledgeStore — initial state", () => {
  it("has correct defaults", () => {
    const s = useKnowledgeStore.getState();
    expect(s.items).toEqual([]);
    expect(s.loaded).toBe(false);
  });
});

describe("useKnowledgeStore — hydrate", () => {
  it("loads items from storage", async () => {
    const item = makeItem();
    storage.set("knowledge", { items: [item] });
    await useKnowledgeStore.getState().hydrate();
    const s = useKnowledgeStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.items).toHaveLength(1);
    expect(s.items[0].id).toBe(item.id);
  });

  it("handles empty storage gracefully", async () => {
    await useKnowledgeStore.getState().hydrate();
    expect(useKnowledgeStore.getState().loaded).toBe(true);
    expect(useKnowledgeStore.getState().items).toEqual([]);
  });

  it("handles corrupted storage data", async () => {
    storage.set("knowledge", { invalid: true });
    await useKnowledgeStore.getState().hydrate();
    expect(useKnowledgeStore.getState().loaded).toBe(true);
    expect(useKnowledgeStore.getState().items).toEqual([]);
  });

  it("handles malformed item entries", async () => {
    storage.set("knowledge", { items: [{ foo: "bar" }] });
    await useKnowledgeStore.getState().hydrate();
    expect(useKnowledgeStore.getState().loaded).toBe(true);
    expect(useKnowledgeStore.getState().items).toEqual([]);
  });
});

describe("useKnowledgeStore — add", () => {
  it("adds an item", () => {
    const item = makeItem();
    useKnowledgeStore.getState().add(item);
    expect(useKnowledgeStore.getState().items).toHaveLength(1);
    expect(useKnowledgeStore.getState().items[0].id).toBe(item.id);
  });

  it("prepends new item (most recent first)", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "old", createdAt: 1000 }));
    useKnowledgeStore.getState().add(makeItem({ id: "new", createdAt: 2000 }));
    expect(useKnowledgeStore.getState().items[0].id).toBe("new");
  });

  it("persists via storage.set()", async () => {
    const { set } = await import("@/lib/storage");
    useKnowledgeStore.getState().add(makeItem());
    await vi.waitFor(() => expect(vi.mocked(set)).toHaveBeenCalled());
  });
});

describe("useKnowledgeStore — FIFO quota", () => {
  it("removes oldest item at 200 limit", () => {
    for (let i = 0; i < 200; i++) {
      useKnowledgeStore.getState().add(makeItem({ id: `item-${i}`, createdAt: i * 1000 }));
    }
    expect(useKnowledgeStore.getState().items).toHaveLength(200);

    useKnowledgeStore.getState().add(makeItem({ id: "item-200", createdAt: 300000 }));
    expect(useKnowledgeStore.getState().items).toHaveLength(200);
    expect(useKnowledgeStore.getState().items.find((s) => s.id === "item-0")).toBeUndefined();
    expect(useKnowledgeStore.getState().items.find((s) => s.id === "item-200")).toBeDefined();
  });
});

describe("useKnowledgeStore — remove", () => {
  it("removes an item by id", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a" }));
    useKnowledgeStore.getState().add(makeItem({ id: "b" }));
    useKnowledgeStore.getState().remove("a");
    expect(useKnowledgeStore.getState().items).toHaveLength(1);
    expect(useKnowledgeStore.getState().items[0].id).toBe("b");
  });

  it("handles removing non-existent item", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a" }));
    useKnowledgeStore.getState().remove("nonexistent");
    expect(useKnowledgeStore.getState().items).toHaveLength(1);
  });
});

describe("useKnowledgeStore — update", () => {
  it("updates an item by id", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "target", title: "Old Title" }));
    useKnowledgeStore.getState().update("target", { title: "New Title" });
    expect(useKnowledgeStore.getState().items[0].title).toBe("New Title");
  });

  it("updates updatedAt timestamp", () => {
    const before = Date.now() - 1000;
    useKnowledgeStore.getState().add(makeItem({ id: "target", updatedAt: before }));
    useKnowledgeStore.getState().update("target", { title: "Updated" });
    expect(useKnowledgeStore.getState().items[0].updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("no-ops for non-existent id", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a" }));
    useKnowledgeStore.getState().update("nonexistent", { title: "X" });
    expect(useKnowledgeStore.getState().items).toHaveLength(1);
  });
});

describe("useKnowledgeStore — get", () => {
  it("gets an item by id", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "target" }));
    const found = useKnowledgeStore.getState().get("target");
    expect(found).toBeDefined();
    expect(found!.id).toBe("target");
  });

  it("returns undefined for non-existent id", () => {
    expect(useKnowledgeStore.getState().get("nonexistent")).toBeUndefined();
  });
});

describe("useKnowledgeStore — clearAll", () => {
  it("clears all items", () => {
    useKnowledgeStore.getState().add(makeItem());
    useKnowledgeStore.getState().add(makeItem());
    useKnowledgeStore.getState().clearAll();
    expect(useKnowledgeStore.getState().items).toEqual([]);
  });
});

describe("useKnowledgeStore — search", () => {
  it("returns all items for empty query", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a" }));
    useKnowledgeStore.getState().add(makeItem({ id: "b" }));
    expect(useKnowledgeStore.getState().search("")).toHaveLength(2);
  });

  it("returns matching items by title", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a", title: "Quantum Computing Advances" }));
    useKnowledgeStore.getState().add(makeItem({ id: "b", title: "Classical Machine Learning" }));
    const results = useKnowledgeStore.getState().search("quantum");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a");
  });

  it("returns matching items by content", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a", content: "Deep learning with neural networks" }));
    useKnowledgeStore.getState().add(makeItem({ id: "b", content: "Cooking recipes for beginners" }));
    const results = useKnowledgeStore.getState().search("neural networks");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a");
  });

  it("returns empty for gibberish query", () => {
    useKnowledgeStore.getState().add(makeItem({ title: "Real Title", content: "Real content" }));
    expect(useKnowledgeStore.getState().search("xyzzyqwert12345")).toHaveLength(0);
  });

  it("handles whitespace-only query as empty", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "a" }));
    expect(useKnowledgeStore.getState().search("   ")).toHaveLength(1);
  });
});

describe("useKnowledgeStore — selectors", () => {
  it("selectItemCount returns total count", () => {
    useKnowledgeStore.getState().add(makeItem());
    useKnowledgeStore.getState().add(makeItem());
    expect(selectItemCount(useKnowledgeStore.getState())).toBe(2);
  });

  it("selectItemsByType filters by type", () => {
    useKnowledgeStore.getState().add(makeItem({ id: "f1", type: "file" }));
    useKnowledgeStore.getState().add(makeItem({ id: "u1", type: "url" }));
    useKnowledgeStore.getState().add(makeItem({ id: "f2", type: "file" }));

    expect(selectItemsByType("file")(useKnowledgeStore.getState())).toHaveLength(2);
    const urls = selectItemsByType("url")(useKnowledgeStore.getState());
    expect(urls).toHaveLength(1);
    expect(urls[0].id).toBe("u1");
  });
});
