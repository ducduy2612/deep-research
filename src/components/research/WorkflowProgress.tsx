"use client";

import {
  Check,
  Loader2,
  Circle,
} from "lucide-react";

import { cn } from "@/utils/style";
import type { ResearchStep } from "@/engine/provider/types";
import type { ResearchState } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS: { step: ResearchStep; label: string; state: ResearchState }[] = [
  { step: "clarify", label: "TOPIC", state: "clarifying" },
  { step: "plan", label: "QUESTIONS", state: "planning" },
  { step: "search", label: "RESEARCH", state: "searching" },
  { step: "analyze", label: "ANALYZE", state: "analyzing" },
  { step: "review", label: "REVIEW", state: "reviewing" },
  { step: "report", label: "REPORT", state: "reporting" },
];

const STATE_ORDER: ResearchState[] = [
  "clarifying", "planning", "searching", "analyzing", "reviewing", "reporting",
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
  // Determine the progress index
  let progressIdx = -1;
  if (state === "completed" || state === "failed" || state === "aborted" || state === "idle") {
    progressIdx = -1;
  } else {
    progressIdx = STATE_ORDER.indexOf(state);
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-8 bg-obsidian-surface-deck px-8 py-4",
        className,
      )}
    >
      {STEPS.map((s, idx) => {
        const isCompleted = progressIdx >= 0 && idx < progressIdx;
        const isActive = idx === progressIdx;

        return (
          <div key={s.step} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <StepIcon
                  completed={isCompleted}
                  active={isActive}
                />
                <span
                  className={cn(
                    "font-mono text-[10px] font-bold uppercase tracking-[0.2em]",
                    isActive && "text-obsidian-primary-deep",
                    isCompleted && "text-obsidian-on-surface opacity-60",
                    !isCompleted && !isActive && "text-obsidian-on-surface opacity-30",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {isActive && (
                <div className="h-1 w-4 rounded-full bg-obsidian-primary-deep" />
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div className="h-px w-8 bg-obsidian-outline-ghost/30" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step icon
// ---------------------------------------------------------------------------

function StepIcon({ completed, active }: { completed: boolean; active: boolean }) {
  if (completed) {
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
  return (
    <div className="flex h-5 w-5 items-center justify-center">
      <Circle className="h-4 w-4 text-obsidian-on-surface opacity-30" />
    </div>
  );
}
