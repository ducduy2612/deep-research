/**
 * Zustand store for the knowledge base — persisted via localforage.
 *
 * Holds knowledge items (file uploads, URL crawls) with Zod-validated
 * persistence. Uses the same fire-and-forget pattern as settings-store.ts.
 * FIFO quota management: max 200 items.
 * Fuse.js fuzzy search over title and content fields.
 */

import { create } from "zustand";
import Fuse from "fuse.js";
import { z } from "zod";

import type { KnowledgeItem } from "@/engine/knowledge/types";
import { knowledgeItemSchema } from "@/engine/knowledge/types";
import * as storage from "@/lib/storage";

// ---------------------------------------------------------------------------
// Persistence schema
// ---------------------------------------------------------------------------

const knowledgeSchema = z.object({
  items: z.array(knowledgeItemSchema),
});

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

export interface KnowledgeStoreState {
  readonly items: readonly KnowledgeItem[];
  readonly loaded: boolean;
}

export interface KnowledgeStoreActions {
  hydrate: () => Promise<void>;
  add: (item: KnowledgeItem) => void;
  remove: (id: string) => void;
  update: (id: string, partial: Partial<KnowledgeItem>) => void;
  get: (id: string) => KnowledgeItem | undefined;
  clearAll: () => void;
  search: (query: string) => KnowledgeItem[];
}

export type KnowledgeStore = KnowledgeStoreState & KnowledgeStoreActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "knowledge";
const MAX_ITEMS = 200;

const DEFAULT_STATE: KnowledgeStoreState = {
  items: [],
  loaded: false,
};

// ---------------------------------------------------------------------------
// Fuse.js index helper
// ---------------------------------------------------------------------------

function buildFuseIndex(items: readonly KnowledgeItem[]): Fuse<KnowledgeItem> {
  return new Fuse([...items], {
    keys: ["title", "content"],
    threshold: 0.3,
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useKnowledgeStore = create<KnowledgeStore>()((set, get) => ({
  ...DEFAULT_STATE,

  hydrate: async () => {
    const saved = await storage.get(STORAGE_KEY, knowledgeSchema);
    if (saved) {
      set({ items: saved.items, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  add: (item: KnowledgeItem) => {
    set((s) => {
      const updated = [item, ...s.items];

      // FIFO quota: remove oldest if over limit
      if (updated.length > MAX_ITEMS) {
        const removed = updated.length - MAX_ITEMS;
        console.warn(
          `[knowledge-store] Quota reached (${MAX_ITEMS}), removing ${removed} oldest item(s)`,
        );
        return { items: updated.slice(0, MAX_ITEMS) };
      }

      return { items: updated };
    });
    persistKnowledge(get());
  },

  remove: (id: string) => {
    set((s) => ({
      items: s.items.filter((item) => item.id !== id),
    }));
    persistKnowledge(get());
  },

  update: (id: string, partial: Partial<KnowledgeItem>) => {
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id ? { ...item, ...partial, updatedAt: Date.now() } : item,
      ),
    }));
    persistKnowledge(get());
  },

  get: (id: string) => {
    return get().items.find((item) => item.id === id);
  },

  clearAll: () => {
    set({ items: [] });
    persistKnowledge(get());
  },

  search: (query: string) => {
    const { items } = get();
    if (!query.trim()) return [...items];
    const fuse = buildFuseIndex(items);
    return fuse.search(query).map((result) => result.item);
  },
}));

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

function persistKnowledge(state: KnowledgeStoreState): void {
  storage
    .set(STORAGE_KEY, { items: state.items }, knowledgeSchema)
    .catch(() => {
      // Silently ignore persistence failures — data still works in-memory
    });
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Total number of knowledge items. */
export const selectItemCount = (s: KnowledgeStoreState): number =>
  s.items.length;

/** Filter items by type (file or url). */
export const selectItemsByType =
  (type: "file" | "url") =>
  (s: KnowledgeStoreState): readonly KnowledgeItem[] =>
    s.items.filter((item) => item.type === type);
