"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ClarifyPanel } from "./ClarifyPanel";
import { PlanPanel } from "./PlanPanel";
import { ResearchActions } from "./ResearchActions";
import type { ResearchStep } from "@/engine/provider/types";
import type { ResearchState } from "@/engine/research/types";
import { AlertTriangle, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActiveResearchCenterProps {
  className?: string;
  onSubmitFeedbackAndPlan: () => void;
  onApprovePlanAndResearch: () => void;
  onRequestMoreResearch: () => void;
  onGenerateReport: () => void;
}

// ---------------------------------------------------------------------------
// Step order
// ---------------------------------------------------------------------------

const STEP_ORDER: ResearchStep[] = [
  "clarify", "plan", "search", "analyze", "review", "report",
];

/** States that use the standard streaming + completed cards layout. */
const STREAMING_STATES: ResearchState[] = [
  "searching", "analyzing", "reviewing", "reporting",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActiveResearchCenter({
  className,
  onSubmitFeedbackAndPlan,
  onApprovePlanAndResearch,
  onRequestMoreResearch,
  onGenerateReport,
}: ActiveResearchCenterProps) {
  const t = useTranslations("Research");
  const steps = useResearchStore((s) => s.steps);
  const error = useResearchStore((s) => s.error);
  const searchResults = useResearchStore((s) => s.searchResults);
  const state = useResearchStore((s) => s.state);
  const connectionInterrupted = useResearchStore((s) => s.connectionInterrupted);
  const clearInterrupted = useResearchStore((s) => s.clearInterrupted);

  // Determine current step
  let currentStep: ResearchStep | null = null;
  for (const step of STEP_ORDER) {
    const s = steps[step];
    if (s.startTime && !s.endTime) {
      currentStep = step;
      break;
    }
  }

  const currentLabel = currentStep ? t(`steps.${currentStep}`) : null;
  const activeText = currentStep ? steps[currentStep].text : "";

  const isIdle = state === "idle";

  // -----------------------------------------------------------------------
  // Center content routing
  // -----------------------------------------------------------------------

  function renderCenterContent() {
    switch (state) {
      // ---- Clarify phase ----
      case "clarifying":
      case "awaiting_feedback":
        return (
          <ClarifyPanel onSubmitFeedbackAndPlan={onSubmitFeedbackAndPlan} />
        );

      // ---- Plan phase ----
      case "planning":
      case "awaiting_plan_review":
        return (
          <PlanPanel onApprovePlanAndResearch={onApprovePlanAndResearch} />
        );

      // ---- Research phase (streaming search/analyze/review) ----
      case "searching":
      case "analyzing":
      case "reviewing":
        return renderStreamingView();

      // ---- Awaiting results review ----
      case "awaiting_results_review":
        return (
          <div className="flex flex-col gap-8">
            {renderStreamingView()}
            <ResearchActions
              onRequestMoreResearch={onRequestMoreResearch}
              onGenerateReport={onGenerateReport}
            />
          </div>
        );

      // ---- Report phase (streaming) ----
      case "reporting":
        return renderStreamingView();

      // ---- Completed ----
      case "completed":
        return renderStreamingView();

      default:
        return null;
    }
  }

  /** Standard streaming view: accumulated search rounds + active streaming. */
  function renderStreamingView() {
    return (
      <>
        {/* Accumulated search rounds (completed analyze steps) */}
        {searchResults.length > 0 && (
          <div className="mb-8 space-y-6">
            {searchResults.map((result, idx) => (
              <div key={idx} className="rounded-lg bg-obsidian-surface-sheet p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-obsidian-on-surface-var">
                    {t("steps.analyze")} — Round {idx + 1}
                  </span>
                </div>
                <MarkdownRenderer content={result.learning} />
              </div>
            ))}
          </div>
        )}

        {/* Active streaming content */}
        {activeText && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-obsidian-primary-deep" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-obsidian-primary-deep">
                {currentLabel} — {t("streaming")}
              </span>
            </div>
            <div className="rounded-lg bg-obsidian-surface-sheet p-6">
              <MarkdownRenderer content={activeText} />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <section
      className={cn(
        "flex-1 overflow-y-auto bg-obsidian-surface-deck p-8",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        {/* Header for streaming states */}
        {STREAMING_STATES.includes(state) && currentLabel && (
          <div className="mb-10 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-obsidian-on-surface">
              {currentLabel}
            </h2>
            <div className="flex items-end gap-1 pb-1">
              <span className="h-1 w-1 animate-bounce rounded-full bg-obsidian-primary-deep" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-obsidian-primary-deep [animation-delay:0.2s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-obsidian-primary-deep [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mb-8 rounded-lg bg-obsidian-error-bg/30 p-6">
            <p className="text-sm text-obsidian-error">{error.message}</p>
          </div>
        )}

        {/* Connection interrupted banner */}
        {connectionInterrupted && (
          <div className="mb-8 flex items-start gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                Connection lost
              </p>
              <p className="mt-1 text-xs text-amber-200/60">
                Your research session was interrupted. Your progress has been saved — you can
                continue from where you left off by clicking the action button below.
              </p>
            </div>
            <button
              type="button"
              onClick={clearInterrupted}
              className="shrink-0 rounded p-1 text-amber-200/40 transition-colors hover:text-amber-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* State-routed center content */}
        {renderCenterContent()}

        {/* Idle state */}
        {isIdle && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-obsidian-on-surface-var/40">
              {t("idleText")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
