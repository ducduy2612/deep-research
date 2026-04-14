/**
 * SSE event handler for the research store.
 *
 * Extracted from research-store.ts to keep the main store under the 500-line
 * ESLint limit. Contains the handleEvent switch that dispatches SSE events
 * into Zustand state mutations.
 */

import type {
  ResearchCheckpoints,
  ResearchState,
  ResearchResult,
  SearchTask,
  Source,
  ImageSource,
} from "@/engine/research/types";
import type { ResearchStep } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Types (defined here to avoid circular dependency with research-store.ts)
// ---------------------------------------------------------------------------

export type ActivityLevel = "info" | "success" | "warn" | "error";

export interface ActivityEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: ActivityLevel;
  readonly message: string;
  readonly step?: ResearchStep;
}

export interface StepStreamState {
  readonly text: string;
  readonly reasoning: string;
  readonly progress: number;
  readonly startTime: number | null;
  readonly endTime: number | null;
  readonly duration: number | null;
}

// Minimal state shape needed by the handler's set() calls
interface HandlerState {
  readonly topic: string;
  readonly state: ResearchState;
  readonly steps: Readonly<Record<ResearchStep, StepStreamState>>;
  readonly searchTasks: readonly SearchTask[];
  readonly searchResults: readonly {
    query: string;
    researchGoal: string;
    learning: string;
    sources: Source[];
    images: ImageSource[];
  }[];
  readonly result: ResearchResult | null;
  readonly error: { code: string; message: string } | null;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly activityLog: readonly ActivityEntry[];
  readonly questions: string;
  readonly plan: string;
  readonly connectionInterrupted: boolean;
  readonly checkpoints: ResearchCheckpoints;
  readonly autoReviewRoundsRemaining: number;
  readonly autoReviewCurrentRound: number;
  readonly autoReviewTotalRounds: number;
}

type StoreSet = (
  fn:
    | Partial<HandlerState>
    | ((s: HandlerState) => Partial<HandlerState>),
) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let activityCounter = 0;

export function resetActivityCounter() {
  activityCounter = 0;
}

export function setActivityCounter(val: number) {
  activityCounter = val;
}

function makeActivity(
  level: ActivityLevel,
  message: string,
  step?: ResearchStep,
): ActivityEntry {
  activityCounter += 1;
  const ts = Date.now();
  return { id: `act-${ts}-${activityCounter}`, timestamp: ts, level, message, step };
}

const EMPTY_STEP: StepStreamState = {
  text: "",
  reasoning: "",
  progress: 0,
  startTime: null,
  endTime: null,
  duration: null,
};

export const ALL_STEPS: ResearchStep[] = [
  "clarify", "plan", "search", "analyze", "review", "report",
];

export function emptySteps(): Record<ResearchStep, StepStreamState> {
  return Object.fromEntries(
    ALL_STEPS.map((s) => [s, { ...EMPTY_STEP }]),
  ) as Record<ResearchStep, StepStreamState>;
}

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

export function createEventHandler(set: StoreSet) {
  return (eventType: string, data: unknown) => {
    switch (eventType) {
      case "start": {
        const d = data as { topic?: string; phase?: string };
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

          let updatedSearchResults = s.searchResults;
          if (d.step === "analyze" && updatedSteps.analyze.text) {
            const lastEmptyIdx = s.searchResults.findIndex((r) => !r.learning);
            if (lastEmptyIdx >= 0) {
              updatedSearchResults = s.searchResults.map((r, i) =>
                i === lastEmptyIdx
                  ? { ...r, learning: updatedSteps.analyze.text }
                  : r,
              );
            } else {
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
        set((s) => {
          // Auto-freeze plan checkpoint when search tasks are generated.
          // This ensures the frozen plan has the actual searchTasks populated
          // rather than an empty array.
          if (!s.checkpoints.plan) {
            return {
              searchTasks: d.tasks,
              checkpoints: {
                ...s.checkpoints,
                plan: {
                  frozenAt: Date.now(),
                  plan: s.plan,
                  searchTasks: d.tasks,
                },
              },
              activityLog: [
                ...s.activityLog,
                makeActivity("info", `Generated ${d.tasks.length} search queries`),
                makeActivity("info", `Checkpoint frozen: plan`),
              ],
            };
          }

          return {
            searchTasks: d.tasks,
            activityLog: [
              ...s.activityLog,
              makeActivity("info", `Generated ${d.tasks.length} search queries`),
            ],
          };
        });
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
        const d = data as {
          learnings: string[];
          sources: Source[];
          images: ImageSource[];
          remainingQueries?: SearchTask[];
        };
        set((s) => {
          // Accumulate learnings/sources/images across continuation rounds
          const prevResult = s.result;
          const mergedLearnings = [...(prevResult?.learnings ?? []), ...d.learnings];
          const mergedSources = [...(prevResult?.sources ?? []), ...d.sources];
          const mergedImages = [...(prevResult?.images ?? []), ...d.images];

          return {
            state: "awaiting_results_review" as ResearchState,
            result: {
              title: prevResult?.title ?? "",
              report: prevResult?.report ?? "",
              learnings: mergedLearnings,
              sources: mergedSources,
              images: mergedImages,
            },
            pendingRemainingQueries: d.remainingQueries ?? [],
            activityLog: [
              ...s.activityLog,
              ...(d.remainingQueries && d.remainingQueries.length > 0
                ? [makeActivity("warn", `Time budget reached — ${d.remainingQueries.length} queries pending, auto-continuing...`)]
                : [makeActivity("info", "Research phase complete — awaiting review")]),
            ],
          };
        });
        break;
      }
      case "review-result": {
        const d = data as {
          learnings: string[];
          sources: Source[];
          images: ImageSource[];
          remainingQueries?: SearchTask[];
        };
        set((s) => {
          // Accumulate review learnings/sources/images into existing result
          const prevResult = s.result;
          const mergedLearnings = [...(prevResult?.learnings ?? []), ...d.learnings];
          const mergedSources = [...(prevResult?.sources ?? []), ...d.sources];
          const mergedImages = [...(prevResult?.images ?? []), ...d.images];

          // When all auto-review rounds are consumed, reset round progress fields
          const roundReset =
            s.autoReviewRoundsRemaining <= 0
              ? { autoReviewCurrentRound: 0, autoReviewTotalRounds: 0 }
              : {};

          return {
            state: "awaiting_results_review" as ResearchState,
            result: {
              title: prevResult?.title ?? "",
              report: prevResult?.report ?? "",
              learnings: mergedLearnings,
              sources: mergedSources,
              images: mergedImages,
            },
            activityLog: [
              ...s.activityLog,
              makeActivity("success", `Review complete — ${d.learnings.length} new learnings, ${d.sources.length} sources`),
            ],
            ...roundReset,
          };
        });
        break;
      }
      default: break;
    }
  };
}
