"use client";

import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle, X } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ClarifyPanel } from "./ClarifyPanel";
import { PlanPanel } from "./PlanPanel";
import { ResearchActions } from "./ResearchActions";
import { SearchResultCard } from "./SearchResultCard";
import { PhaseAccordion } from "./PhaseAccordion";
import { ReportWorkspace } from "./ReportWorkspace";
import type { ResearchStep } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActiveResearchCenterProps {
  className?: string;
  onSubmitFeedbackAndPlan: () => void;
  onApprovePlanAndResearch: () => void;
  onRequestMoreResearch: () => void;
  onFinalizeFindings: () => void;
}

// ---------------------------------------------------------------------------
// Step order (for streaming label resolution)
// ---------------------------------------------------------------------------

const STEP_ORDER: ResearchStep[] = [
  "clarify", "plan", "search", "analyze", "review", "report",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActiveResearchCenter({
  className,
  onSubmitFeedbackAndPlan,
  onApprovePlanAndResearch,
  onRequestMoreResearch,
  onFinalizeFindings,
}: ActiveResearchCenterProps) {
  const t = useTranslations("Research");
  const steps = useResearchStore((s) => s.steps);
  const error = useResearchStore((s) => s.error);
  const searchResults = useResearchStore((s) => s.searchResults);
  const state = useResearchStore((s) => s.state);
  const connectionInterrupted = useResearchStore((s) => s.connectionInterrupted);
  const clearInterrupted = useResearchStore((s) => s.clearInterrupted);

  // Determine current step for streaming label
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
  // Streaming view — reused by PhaseAccordion render prop
  // -----------------------------------------------------------------------

  function renderStreamingView() {
    return (
      <>
        {/* Accumulated search rounds (completed analyze steps) */}
        {searchResults.length > 0 && (
          <div className="mb-8 space-y-4">
            {searchResults.map((result, idx) => (
              <SearchResultCard key={`${result.query}-${idx}`} result={result} index={idx} />
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

        {/* Phase accordion handles all content routing */}
        {!isIdle && (
          <PhaseAccordion
            onRenderClarify={() => (
              <ClarifyPanel onSubmitFeedbackAndPlan={onSubmitFeedbackAndPlan} />
            )}
            onRenderPlan={() => (
              <PlanPanel onApprovePlanAndResearch={onApprovePlanAndResearch} />
            )}
            onRenderStreaming={renderStreamingView}
            onRenderResearchActions={() => (
              <ResearchActions
                onRequestMoreResearch={onRequestMoreResearch}
                onFinalizeFindings={onFinalizeFindings}
              />
            )}
            onRenderReport={() => <ReportWorkspace />}
          />
        )}

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
