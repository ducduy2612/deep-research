/**
 * Zustand store for the active research session.
 *
 * Tracks: topic, orchestrator lifecycle state, streaming text per step,
 * search tasks/results, final result, errors, elapsed time, and activity log.
 * Consumes SSE events from /api/research/stream via handleEvent().
 *
 * Persistence: State is persisted to localforage on every change. On hydration,
 * streaming states are converted to their nearest checkpoint (awaiting_*) so the
 * user sees their last completed data and can re-trigger the interrupted phase.
 */

import { create } from "zustand";

import type {
  ResearchState,
  ResearchResult,
  SearchTask,
  SearchResult,
  Source,
  ImageSource,
  CheckpointPhase,
  ResearchCheckpoints,
} from "@/engine/research/types";
import type { ResearchStep } from "@/engine/provider/types";
import * as storage from "@/lib/storage";
import { persistedStateSchema, STORAGE_KEY } from "./research-store-persist";
import {
  createEventHandler,
  emptySteps,
  resetActivityCounter,
  setActivityCounter,
  type ActivityEntry,
  type StepStreamState,
} from "./research-store-events";

// Re-export types for barrel exports
export type { ActivityLevel, ActivityEntry, StepStreamState } from "./research-store-events";

// ---------------------------------------------------------------------------
// Store state & actions
// ---------------------------------------------------------------------------

export interface ResearchStoreState {
  readonly topic: string;
  readonly state: ResearchState;
  readonly steps: Readonly<Record<ResearchStep, StepStreamState>>;
  readonly searchTasks: readonly SearchTask[];
  readonly searchResults: readonly SearchResult[];
  readonly result: ResearchResult | null;
  readonly error: { code: string; message: string } | null;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly activityLog: readonly ActivityEntry[];
  // Multi-phase workspace fields (mutable — user can edit)
  readonly questions: string;
  readonly feedback: string;
  readonly plan: string;
  readonly suggestion: string;
  readonly manualQueries: readonly string[];
  readonly immediateRetryQuery: string | null;
  readonly reportFeedback: string;
  // Immutable phase checkpoints
  readonly checkpoints: ResearchCheckpoints;
  // Persistence
  readonly connectionInterrupted: boolean;
}

export interface ResearchStoreActions {
  setTopic: (topic: string) => void;
  handleEvent: (eventType: string, data: unknown) => void;
  reset: () => void;
  abort: () => void;
  // Multi-phase workspace setters
  setQuestions: (text: string) => void;
  setFeedback: (text: string) => void;
  setPlan: (text: string) => void;
  setSuggestion: (text: string) => void;
  setManualQueries: (queries: string[]) => void;
  setReportFeedback: (text: string) => void;
  // CRUD actions for research workspace
  removeSearchResult: (index: number) => void;
  retrySearchResult: (index: number) => string | null;
  clearImmediateRetry: () => void;
  clearSuggestion: () => void;
  // Checkpoint actions
  freeze: (phase: CheckpointPhase) => void;
  // Persistence
  hydrate: () => Promise<void>;
  clearInterrupted: () => void;
}

export type ResearchStore = ResearchStoreState & ResearchStoreActions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INITIAL_STATE: ResearchStoreState = {
  topic: "",
  state: "idle",
  steps: emptySteps(),
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
  manualQueries: [],
  immediateRetryQuery: null,
  reportFeedback: "",
  checkpoints: {},
  connectionInterrupted: false,
};

/** Strip a search result's data from accumulated state. */
function stripResultData(
  s: ResearchStoreState,
  index: number,
): { searchResults: readonly SearchResult[]; result: ResearchResult | null } {
  const target = s.searchResults[index];
  const remaining = s.searchResults.filter((_, i) => i !== index);

  const remainingSourceUrls = new Set(
    remaining.flatMap((r) => r.sources.map((src) => src.url)),
  );
  const remainingImageUrls = new Set(
    remaining.flatMap((r) => r.images.map((img) => img.url)),
  );

  const updatedResult = s.result
    ? {
        ...s.result,
        sources: s.result.sources.filter((src) =>
          remainingSourceUrls.has(src.url),
        ),
        images: s.result.images.filter((img) =>
          remainingImageUrls.has(img.url),
        ),
        learnings: target.learning
          ? (() => {
              const idx = s.result!.learnings.indexOf(target.learning);
              if (idx === -1) return s.result!.learnings;
              return [
                ...s.result!.learnings.slice(0, idx),
                ...s.result!.learnings.slice(idx + 1),
              ];
            })()
          : s.result.learnings,
      }
    : s.result;

  return { searchResults: remaining, result: updatedResult };
}

/** Append an activity log entry (used by freeze and other non-event actions). */
function makeLocalActivity(
  level: "info" | "success" | "warn" | "error",
  message: string,
  activityLog: readonly ActivityEntry[],
): ActivityEntry[] {
  // Reuse the counter from the events module
  // We import setActivityCounter to sync, but here we just push to the log
  // with a unique ID. The counter in events module will outpace this.
  const ts = Date.now();
  const id = `act-${ts}-local-${Math.random().toString(36).slice(2, 8)}`;
  return [...activityLog, { id, timestamp: ts, level, message }];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useResearchStore = create<ResearchStore>()((set) => ({
  ...INITIAL_STATE,

  handleEvent: createEventHandler(set),

  setTopic: (topic: string) => set({ topic }),
  setQuestions: (text: string) => set({ questions: text }),
  setFeedback: (text: string) => set({ feedback: text }),
  setPlan: (text: string) => set({ plan: text }),
  setSuggestion: (text: string) => set({ suggestion: text }),
  setManualQueries: (queries: string[]) => set({ manualQueries: queries }),
  setReportFeedback: (text: string) => set({ reportFeedback: text }),

  removeSearchResult: (index: number) => {
    set((s) => {
      if (index < 0 || index >= s.searchResults.length) return {};
      const patch = stripResultData(s, index);
      return {
        ...patch,
        activityLog: makeLocalActivity(
          "info",
          `Removed search result: ${s.searchResults[index].query}`,
          s.activityLog,
        ),
      };
    });
  },

  retrySearchResult: (index: number) => {
    let retryQuery: string | null = null;
    set((s) => {
      if (index < 0 || index >= s.searchResults.length) return {};
      const query = s.searchResults[index].query;
      retryQuery = query;
      const patch = stripResultData(s, index);
      return {
        ...patch,
        immediateRetryQuery: query,
        activityLog: makeLocalActivity(
          "info",
          `Retrying search: ${query}`,
          s.activityLog,
        ),
      };
    });
    return retryQuery;
  },

  clearImmediateRetry: () => set({ immediateRetryQuery: null }),

  clearSuggestion: () => set({ suggestion: "" }),

  freeze: (phase: CheckpointPhase) => {
    set((s) => {
      const frozenAt = Date.now();
      let updated: ResearchCheckpoints;

      switch (phase) {
        case "clarify":
          updated = { ...s.checkpoints, clarify: { frozenAt, questions: s.questions } };
          break;
        case "plan":
          updated = {
            ...s.checkpoints,
            plan: { frozenAt, plan: s.plan, searchTasks: [...s.searchTasks] },
          };
          break;
        case "research":
          updated = {
            ...s.checkpoints,
            research: { frozenAt, searchResults: [...s.searchResults], result: s.result },
          };
          break;
        case "report": {
          if (!s.result) return {};
          updated = { ...s.checkpoints, report: { frozenAt, result: s.result } };
          break;
        }
        default:
          return {};
      }

      return {
        checkpoints: updated,
        activityLog: makeLocalActivity("info", `Checkpoint frozen: ${phase}`, s.activityLog),
      };
    });
  },

  reset: () => {
    resetActivityCounter();
    set({ ...INITIAL_STATE, steps: emptySteps() });
    storage.remove(STORAGE_KEY).catch(() => {});
  },

  abort: () => {
    set((s) => ({
      state: "aborted" as ResearchState,
      completedAt: Date.now(),
      activityLog: makeLocalActivity("warn", "Research aborted", s.activityLog),
    }));
  },

  hydrate: async () => {
    const saved = await storage.get(STORAGE_KEY, persistedStateSchema);
    if (!saved) return;

    const terminalStates = ["idle", "completed", "failed", "aborted"];
    if (terminalStates.includes(saved.state)) return;

    let restoredState = saved.state as ResearchState;
    let connectionInterrupted = false;

    const streamingToCheckpoint: Record<string, ResearchState> = {
      clarifying: "awaiting_feedback",
      planning: "awaiting_plan_review",
      searching: "awaiting_results_review",
      analyzing: "awaiting_results_review",
      reviewing: "awaiting_results_review",
      reporting: "awaiting_results_review",
    };

    if (streamingToCheckpoint[saved.state]) {
      restoredState = streamingToCheckpoint[saved.state];
      connectionInterrupted = true;
    }

    const steps = emptySteps();
    for (const [key, val] of Object.entries(saved.steps)) {
      if (key in steps) {
        steps[key as ResearchStep] = val as StepStreamState;
      }
    }

    if (saved.activityLog.length > 0) {
      const maxId = saved.activityLog.reduce((max, entry) => {
        const match = entry.id.match(/^act-\d+-(\d+)$/);
        if (match) return Math.max(max, parseInt(match[1], 10));
        const legacy = entry.id.match(/^act-(\d+)$/);
        if (legacy) return Math.max(max, parseInt(legacy[1], 10));
        return max;
      }, 0);
      setActivityCounter(maxId);
    }

    set({
      topic: saved.topic,
      state: restoredState,
      steps,
      searchTasks: saved.searchTasks as SearchTask[],
      searchResults: saved.searchResults as SearchResult[],
      result: saved.result as ResearchResult | null,
      error: saved.error as { code: string; message: string } | null,
      startedAt: saved.startedAt,
      completedAt: saved.completedAt,
      activityLog: saved.activityLog as ActivityEntry[],
      questions: saved.questions,
      feedback: saved.feedback,
      plan: saved.plan,
      suggestion: saved.suggestion,
      manualQueries: saved.manualQueries ?? [],
      reportFeedback: saved.reportFeedback ?? "",
      checkpoints: saved.checkpoints ?? {},
      connectionInterrupted,
    });
  },

  clearInterrupted: () => {
    set({ connectionInterrupted: false });
  },
}));

// ---------------------------------------------------------------------------
// Auto-persist: save state to localforage on every change
// ---------------------------------------------------------------------------

useResearchStore.subscribe((state) => {
  if (state.state === "idle") {
    storage.remove(STORAGE_KEY).catch(() => {});
    return;
  }

  const persistData = {
    topic: state.topic,
    state: state.state,
    steps: state.steps,
    searchTasks: state.searchTasks,
    searchResults: state.searchResults,
    result: state.result,
    error: state.error,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    activityLog: state.activityLog,
    questions: state.questions,
    feedback: state.feedback,
    plan: state.plan,
    suggestion: state.suggestion,
    manualQueries: state.manualQueries,
    reportFeedback: state.reportFeedback,
    checkpoints: state.checkpoints,
  };

  storage.set(STORAGE_KEY, persistData as never, persistedStateSchema).catch((err) => {
    console.error("[research-store] Failed to persist state:", err);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectElapsedMs = (s: ResearchStoreState): number | null => {
  if (!s.startedAt) return null;
  return (s.completedAt ?? Date.now()) - s.startedAt;
};

export const selectStepText = (step: ResearchStep) => (s: ResearchStoreState): string =>
  s.steps[step].text;

export const selectIsActive = (s: ResearchStoreState): boolean =>
  !["idle", "completed", "failed", "aborted"].includes(s.state);

export const selectAllSources = (s: ResearchStoreState): Source[] =>
  s.searchResults.flatMap((r) => r.sources);

export const selectAllImages = (s: ResearchStoreState): ImageSource[] =>
  s.searchResults.flatMap((r) => r.images);
