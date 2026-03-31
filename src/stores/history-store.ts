/**
 * Zustand store for research history — persisted via localforage.
 *
 * Holds completed research sessions with Zod-validated persistence.
 * Uses the same fire-and-forget pattern as settings-store.ts.
 * FIFO quota management: max 100 sessions.
 */

import { create } from "zustand";
import { z } from "zod";

import type { ReportStyle, ReportLength } from "@/engine/research/types";
import { sourceSchema, imageSourceSchema } from "@/engine/research/types";
import * as storage from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistorySession {
  readonly id: string;
  readonly topic: string;
  readonly title: string;
  readonly state: "completed" | "failed" | "aborted";
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly report: string;
  readonly learnings: readonly string[];
  readonly sources: readonly z.infer<typeof sourceSchema>[];
  readonly images: readonly z.infer<typeof imageSourceSchema>[];
  readonly reportStyle: ReportStyle;
  readonly reportLength: ReportLength;
}

// ---------------------------------------------------------------------------
// Persistence schema
// ---------------------------------------------------------------------------

const historySessionSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  title: z.string().min(1),
  state: z.enum(["completed", "failed", "aborted"]),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
  report: z.string(),
  learnings: z.array(z.string()),
  sources: z.array(sourceSchema),
  images: z.array(imageSourceSchema),
  reportStyle: z.enum(["balanced", "executive", "technical", "concise"]),
  reportLength: z.enum(["brief", "standard", "comprehensive"]),
});

const historySchema = z.object({
  sessions: z.array(historySessionSchema),
});

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

export interface HistoryStoreState {
  readonly sessions: readonly HistorySession[];
  readonly loaded: boolean;
}

export interface HistoryStoreActions {
  hydrate: () => Promise<void>;
  save: (session: HistorySession) => void;
  remove: (id: string) => void;
  load: (id: string) => HistorySession | undefined;
  clearAll: () => void;
}

export type HistoryStore = HistoryStoreState & HistoryStoreActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "history";
const MAX_SESSIONS = 100;

const DEFAULT_STATE: HistoryStoreState = {
  sessions: [],
  loaded: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  ...DEFAULT_STATE,

  hydrate: async () => {
    const saved = await storage.get(STORAGE_KEY, historySchema);
    if (saved) {
      set({ sessions: saved.sessions, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  save: (session: HistorySession) => {
    set((s) => {
      // Remove existing session with same id, then prepend
      const filtered = s.sessions.filter((ses) => ses.id !== session.id);
      const updated = [session, ...filtered];

      // FIFO quota: remove oldest if over limit
      if (updated.length > MAX_SESSIONS) {
        const removed = updated.length - MAX_SESSIONS;
        console.warn(
          `[history-store] Quota reached (${MAX_SESSIONS}), removing ${removed} oldest session(s)`,
        );
        return { sessions: updated.slice(0, MAX_SESSIONS) };
      }

      return { sessions: updated };
    });
    persistHistory(get());
  },

  remove: (id: string) => {
    set((s) => ({
      sessions: s.sessions.filter((ses) => ses.id !== id),
    }));
    persistHistory(get());
  },

  load: (id: string) => {
    return get().sessions.find((ses) => ses.id === id);
  },

  clearAll: () => {
    set({ sessions: [] });
    persistHistory(get());
  },
}));

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

function persistHistory(state: HistoryStoreState): void {
  storage
    .set(STORAGE_KEY, { sessions: state.sessions }, historySchema)
    .catch(() => {
      // Silently ignore persistence failures — data still works in-memory
    });
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Total number of sessions. */
export const selectSessionCount = (s: HistoryStoreState): number =>
  s.sessions.length;

/** Filter sessions by state. */
export const selectSessionsByFilter = (
  filter: "all" | "completed" | "failed",
) => (s: HistoryStoreState): readonly HistorySession[] => {
  if (filter === "all") return s.sessions;
  return s.sessions.filter((ses) => ses.state === filter);
};
