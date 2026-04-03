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

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export type ActivityLevel = "info" | "success" | "warn" | "error";

export interface ActivityEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: ActivityLevel;
  readonly message: string;
  readonly step?: ResearchStep;
}

// ---------------------------------------------------------------------------
// Per-step streaming state
// ---------------------------------------------------------------------------

export interface StepStreamState {
  readonly text: string;
  readonly reasoning: string;
  readonly progress: number;
  readonly startTime: number | null;
  readonly endTime: number | null;
  readonly duration: number | null;
}

const EMPTY_STEP: StepStreamState = {
  text: "",
  reasoning: "",
  progress: 0,
  startTime: null,
  endTime: null,
  duration: null,
};

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

let activityCounter = 0;

function makeActivity(
  level: ActivityLevel,
  message: string,
  step?: ResearchStep,
): ActivityEntry {
  activityCounter += 1;
  const ts = Date.now();
  return { id: `act-${ts}-${activityCounter}`, timestamp: ts, level, message, step };
}

const ALL_STEPS: ResearchStep[] = [
  "clarify", "plan", "search", "analyze", "review", "report",
];

function emptySteps(): Record<ResearchStep, StepStreamState> {
  return Object.fromEntries(
    ALL_STEPS.map((s) => [s, { ...EMPTY_STEP }]),
  ) as Record<ResearchStep, StepStreamState>;
}

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
  // Multi-phase workspace fields
  questions: "",
  feedback: "",
  plan: "",
  suggestion: "",
  manualQueries: [],
  // Immutable checkpoints
  checkpoints: {},
  // Persistence
  connectionInterrupted: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useResearchStore = create<ResearchStore>()((set) => ({
  ...INITIAL_STATE,

  setTopic: (topic: string) => set({ topic }),

  setQuestions: (text: string) => set({ questions: text }),
  setFeedback: (text: string) => set({ feedback: text }),
  setPlan: (text: string) => set({ plan: text }),
  setSuggestion: (text: string) => set({ suggestion: text }),
  setManualQueries: (queries: string[]) => set({ manualQueries: queries }),

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
        activityLog: [
          ...s.activityLog,
          makeActivity("info", `Checkpoint frozen: ${phase}`),
        ],
      };
    });
  },

  handleEvent: (eventType: string, data: unknown) => {
    switch (eventType) {
      case "start": {
        const d = data as { topic?: string; phase?: string };
        // Full pipeline or initial clarify: full reset
        if (!d.phase || d.phase === "full" || d.phase === "clarify") {
          set({
            topic: d.topic ?? "",
            state: "clarifying" as ResearchState,
            startedAt: Date.now(),
            completedAt: null,
            steps: emptySteps(),
            searchTasks: [],
            searchResults: [],
            result: null,
            error: null,
            activityLog: [makeActivity("info", `Starting research: ${d.topic ?? ""}`)],
            connectionInterrupted: false,
          });
        } else {
          // Intermediate phase (plan/research/report): don't reset accumulated state
          set((s) => ({
            activityLog: [...s.activityLog, makeActivity("info", `Starting ${d.phase} phase`)],
            connectionInterrupted: false,
          }));
        }
        break;
      }
      case "step-start": {
        const d = data as { step: ResearchStep; state: ResearchState };
        set((s) => ({
          state: d.state,
          steps: { ...s.steps, [d.step]: { ...EMPTY_STEP, startTime: Date.now() } },
          activityLog: [...s.activityLog, makeActivity("info", `Starting ${d.step} step`, d.step)],
        }));
        break;
      }
      case "step-delta": {
        const d = data as { step: ResearchStep; text: string };
        set((s) => ({
          steps: { ...s.steps, [d.step]: { ...s.steps[d.step], text: s.steps[d.step].text + d.text } },
        }));
        break;
      }
      case "step-reasoning": {
        const d = data as { step: ResearchStep; text: string };
        set((s) => ({
          steps: { ...s.steps, [d.step]: { ...s.steps[d.step], reasoning: s.steps[d.step].reasoning + d.text } },
        }));
        break;
      }
      case "step-complete": {
        const d = data as { step: ResearchStep; duration: number };
        set((s) => {
          const updatedSteps = {
            ...s.steps,
            [d.step]: { ...s.steps[d.step], progress: 100, endTime: Date.now(), duration: d.duration },
          };

          // When analyze completes, update the corresponding searchResult with the learning
          let updatedSearchResults = s.searchResults;
          if (d.step === "analyze" && updatedSteps.analyze.text) {
            // Find the last searchResult without a learning and fill it in
            const lastEmptyIdx = s.searchResults.findIndex(
              (r) => !r.learning,
            );
            if (lastEmptyIdx >= 0) {
              updatedSearchResults = s.searchResults.map((r, i) =>
                i === lastEmptyIdx
                  ? { ...r, learning: updatedSteps.analyze.text }
                  : r,
              );
            } else {
              // No matching search-result event — create a standalone entry
              updatedSearchResults = [
                ...s.searchResults,
                {
                  query: "",
                  researchGoal: "",
                  learning: updatedSteps.analyze.text,
                  sources: [] as Source[],
                  images: [] as ImageSource[],
                },
              ];
            }
          }

          return {
            steps: updatedSteps,
            searchResults: updatedSearchResults,
            activityLog: [
              ...s.activityLog,
              makeActivity("success", `Completed ${d.step} in ${(d.duration / 1000).toFixed(1)}s`, d.step),
            ],
          };
        });
        break;
      }
      case "search-task": {
        const d = data as { tasks: SearchTask[] };
        set((s) => ({
          searchTasks: d.tasks,
          activityLog: [
            ...s.activityLog,
            makeActivity("info", `Generated ${d.tasks.length} search queries`),
          ],
        }));
        break;
      }
      case "search-result": {
        const d = data as { query: string; sources: Source[]; images: ImageSource[] };
        set((s) => ({
          searchResults: [
            ...s.searchResults,
            {
              query: d.query,
              researchGoal: "",
              learning: "",
              sources: d.sources,
              images: d.images,
            },
          ],
          activityLog: [
            ...s.activityLog,
            makeActivity("info", `Found ${d.sources.length} sources for "${d.query}"`),
          ],
        }));
        break;
      }
      case "step-error": {
        const d = data as { step: ResearchStep; error: { code: string; message: string } };
        set((s) => ({
          steps: { ...s.steps, [d.step]: { ...s.steps[d.step], endTime: Date.now() } },
          activityLog: [...s.activityLog, makeActivity("error", `${d.step} failed: ${d.error.message}`, d.step)],
        }));
        break;
      }
      case "progress": {
        const d = data as { step: ResearchStep; progress: number };
        set((s) => ({
          steps: { ...s.steps, [d.step]: { ...s.steps[d.step], progress: d.progress } },
        }));
        break;
      }
      case "result": {
        const result = data as ResearchResult;
        set((s) => ({
          state: "reporting" as ResearchState,
          result,
          activityLog: [...s.activityLog, makeActivity("success", `Report generated: ${result.title}`)],
        }));
        break;
      }
      case "done": {
        set((s) => {
          // Intermediate phases (clarify/plan/research) set awaiting_ states
          // before done arrives — don't overwrite those.
          const awaitingStates: ResearchState[] = [
            "awaiting_feedback",
            "awaiting_plan_review",
            "awaiting_results_review",
          ];
          if (awaitingStates.includes(s.state)) {
            return {
              activityLog: [...s.activityLog, makeActivity("success", "Phase complete")],
            };
          }
          return {
            state: s.state === "failed" ? "failed" : "completed" as ResearchState,
            completedAt: Date.now(),
            activityLog: [...s.activityLog, makeActivity("success", "Research complete")],
          };
        });
        break;
      }
      case "error": {
        const d = data as { code: string; message: string };
        set((s) => ({
          state: "failed" as ResearchState,
          error: { code: d.code, message: d.message },
          completedAt: Date.now(),
          activityLog: [...s.activityLog, makeActivity("error", `Error: ${d.message}`)],
        }));
        break;
      }
      case "clarify-result": {
        const d = data as { questions: string };
        set((s) => ({
          questions: d.questions,
          state: "awaiting_feedback" as ResearchState,
          activityLog: [...s.activityLog, makeActivity("info", "Clarification questions received — awaiting feedback")],
        }));
        break;
      }
      case "plan-result": {
        const d = data as { plan: string };
        set((s) => ({
          plan: d.plan,
          state: "awaiting_plan_review" as ResearchState,
          activityLog: [...s.activityLog, makeActivity("info", "Research plan generated — awaiting review")],
        }));
        break;
      }
      case "research-result": {
        const d = data as { learnings: string[]; sources: Source[]; images: ImageSource[] };
        set((s) => ({
          state: "awaiting_results_review" as ResearchState,
          result: s.result
            ? s.result
            : { title: "", report: "", learnings: d.learnings, sources: d.sources, images: d.images },
          activityLog: [...s.activityLog, makeActivity("info", "Research phase complete — awaiting review")],
        }));
        break;
      }
      default: break;
    }
  },

  reset: () => {
    activityCounter = 0;
    set({ ...INITIAL_STATE, steps: emptySteps() });
    // Clear persisted state on explicit reset
    storage.remove(STORAGE_KEY).catch(() => {});
  },

  abort: () => {
    set((s) => ({
      state: "aborted" as ResearchState,
      completedAt: Date.now(),
      activityLog: [...s.activityLog, makeActivity("warn", "Research aborted")],
    }));
  },

  hydrate: async () => {
    const saved = await storage.get(STORAGE_KEY, persistedStateSchema);
    if (!saved) return;

    // Don't restore idle or terminal states — nothing useful to recover
    const terminalStates = ["idle", "completed", "failed", "aborted"];
    if (terminalStates.includes(saved.state)) return;

    // Convert streaming states to nearest checkpoint on rehydration
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

    // Restore steps with proper typing
    const steps = emptySteps();
    for (const [key, val] of Object.entries(saved.steps)) {
      if (key in steps) {
        steps[key as ResearchStep] = val as StepStreamState;
      }
    }

    // Seed activityCounter from restored log to avoid duplicate act-N keys
    if (saved.activityLog.length > 0) {
      const maxId = saved.activityLog.reduce((max, entry) => {
        // Format: act-{timestamp}-{counter} — extract the counter suffix
        const match = entry.id.match(/^act-\d+-(\d+)$/);
        if (match) return Math.max(max, parseInt(match[1], 10));
        // Legacy format: act-{counter}
        const legacy = entry.id.match(/^act-(\d+)$/);
        if (legacy) return Math.max(max, parseInt(legacy[1], 10));
        return max;
      }, 0);
      activityCounter = maxId;
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
  // Don't persist idle state — nothing to recover
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
    checkpoints: state.checkpoints,
  };

  storage.set(STORAGE_KEY, persistData as unknown as z.infer<typeof persistedStateSchema>, persistedStateSchema).catch((err) => {
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
