"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Loader2,
  Circle,
  Pause,
  Timer,
} from "lucide-react";

import { cn } from "@/utils/style";
import type { ResearchStep } from "@/engine/provider/types";
import type { ResearchState } from "@/engine/research/types";
import { useResearchStore } from "@/stores/research-store";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface StepDef {
  step: ResearchStep;
  labelKey: string;
  /** States where this step is actively streaming. */
  activeStates: ResearchState[];
  /** States where this step is awaiting user input (checkpoint). */
  awaitingStates: ResearchState[];
}

const STEPS: StepDef[] = [
  {
    step: "clarify",
    labelKey: "topic",
    activeStates: ["clarifying"],
    awaitingStates: ["awaiting_feedback"],
  },
  {
    step: "plan",
    labelKey: "questions",
    activeStates: ["planning"],
    awaitingStates: ["awaiting_plan_review"],
  },
  {
    step: "search",
    labelKey: "research",
    activeStates: ["searching"],
    awaitingStates: [],
  },
  {
    step: "analyze",
    labelKey: "analyze",
    activeStates: ["analyzing"],
    awaitingStates: [],
  },
  {
    step: "review",
    labelKey: "review",
    activeStates: ["reviewing"],
    awaitingStates: ["awaiting_results_review"],
  },
  {
    step: "report",
    labelKey: "report",
    activeStates: ["reporting"],
    awaitingStates: [],
  },
];

/** Ordered list of all states for determining progress position. */
const STATE_ORDER: ResearchState[] = [
  "clarifying", "awaiting_feedback",
  "planning", "awaiting_plan_review",
  "searching",
  "analyzing",
  "reviewing", "awaiting_results_review",
  "reporting",
];

/** Terminal states. */
const TERMINAL_STATES: ResearchState[] = [
  "completed", "failed", "aborted", "idle",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkflowProgressProps {
  state: ResearchState;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowProgress({ state, className }: WorkflowProgressProps) {
  const t = useTranslations("Workflow");

  const isTerminal = TERMINAL_STATES.includes(state);
  const progressIdx = isTerminal ? -1 : STATE_ORDER.indexOf(state);

  // Elapsed timer — computed locally to avoid Date.now() in a store selector
  // (which causes useSyncExternalStore infinite loop)
  const elapsedMs = useElapsedMs();

  const isCompleted = state === "completed";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-8 bg-obsidian-surface-deck px-8 py-4",
        className,
      )}
    >
      {STEPS.map((s, idx) => {
        const isActive = s.activeStates.includes(state);
        const isAwaiting = s.awaitingStates.includes(state);
        // A step is completed if the progress index is past this step's states
        const stepStartIdx = STATE_ORDER.indexOf(s.activeStates[0]);
        const stepAwaitingIdx = s.awaitingStates.length > 0
          ? STATE_ORDER.indexOf(s.awaitingStates[0])
          : stepStartIdx;
        const isStepCompleted = progressIdx >= 0 &&
          progressIdx > Math.max(stepStartIdx, stepAwaitingIdx);

        return (
          <div key={s.step} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <StepIcon
                  completed={isStepCompleted || isCompleted}
                  active={isActive}
                  awaiting={isAwaiting}
                />
                <span
                  className={cn(
                    "font-mono text-[10px] font-bold uppercase tracking-[0.2em]",
                    isActive && "text-obsidian-primary-deep",
                    isAwaiting && "text-amber-400",
                    isStepCompleted && "text-obsidian-on-surface opacity-60",
                    !isStepCompleted && !isActive && !isAwaiting && "text-obsidian-on-surface opacity-30",
                  )}
                >
                  {t(`steps.${s.labelKey}`)}
                </span>
              </div>
              {(isActive || isAwaiting) && (
                <div className={cn(
                  "h-1 w-4 rounded-full",
                  isActive && "bg-obsidian-primary-deep",
                  isAwaiting && "bg-amber-400",
                )} />
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div className="h-px w-8 bg-obsidian-outline-ghost/30" />
            )}
          </div>
        );
      })}

      {/* Elapsed timer */}
      {elapsedMs !== null && elapsedMs > 0 && (
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-obsidian-on-surface-var/60">
          <Timer className="h-3 w-3" />
          <span>{formatElapsed(elapsedMs)}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step icon
// ---------------------------------------------------------------------------

function StepIcon({
  completed,
  active,
  awaiting,
}: {
  completed: boolean;
  active: boolean;
  awaiting: boolean;
}) {
  if (completed && !active && !awaiting) {
    return (
      <div className="flex h-5 w-5 items-center justify-center">
        <Check className="h-4 w-4 text-obsidian-primary-deep" />
      </div>
    );
  }
  if (active) {
    return (
      <div className="flex h-5 w-5 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-obsidian-primary-deep drop-shadow-[0_0_8px_rgba(192,193,255,0.4)]" />
      </div>
    );
  }
  if (awaiting) {
    return (
      <div className="flex h-5 w-5 items-center justify-center">
        <Pause className="h-4 w-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]" />
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center">
      <Circle className="h-4 w-4 text-obsidian-on-surface opacity-30" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elapsed timer hook (avoids Date.now() in store selector)
// ---------------------------------------------------------------------------

function useElapsedMs(): number | null {
  const startedAt = useResearchStore((s) => s.startedAt);
  const completedAt = useResearchStore((s) => s.completedAt);
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Only tick when research is active (no completedAt yet)
    if (!startedAt || completedAt) return;

    const tick = () => {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startedAt, completedAt]);

  if (!startedAt) return null;
  return (completedAt ?? now) - startedAt;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}
