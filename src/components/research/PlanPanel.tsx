"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  PenLine,
  Play,
  RotateCcw,
} from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanPanelProps {
  className?: string;
  onApprovePlanAndResearch: () => void;
  onRewritePlan: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanPanel({
  className,
  onApprovePlanAndResearch,
  onRewritePlan,
}: PlanPanelProps) {
  const t = useTranslations("PlanPanel");
  const state = useResearchStore((s) => s.state);
  const plan = useResearchStore((s) => s.plan);
  const planText = useResearchStore((s) => s.steps.plan.text);
  const setPlan = useResearchStore((s) => s.setPlan);

  const [isEditing, setIsEditing] = useState(false);

  const isPlanning = state === "planning";
  const isAwaitingReview = state === "awaiting_plan_review";

  // Show streaming text while planning, finalized plan once it arrives
  const displayText = isPlanning ? planText : plan;

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const handlePlanChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPlan(e.target.value);
    },
    [setPlan],
  );

  const handleApprove = useCallback(() => {
    if (isEditing) setIsEditing(false);
    // Plan is frozen later when the research phase generates search tasks
    // (see search-task handler in research-store-events.ts)
    onApprovePlanAndResearch();
  }, [isEditing, onApprovePlanAndResearch]);

  // Loading state while still streaming
  if (isPlanning && !displayText) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-obsidian-primary-deep" />
        <p className="mt-4 font-mono text-xs text-obsidian-on-surface-var">
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-obsidian-on-surface">
          {t("title")}
        </h2>
        <p className="font-mono text-[11px] text-obsidian-on-surface-var">
          {t("subtitle")}
        </p>
      </div>

      {/* Plan content */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
            {t("planLabel")}
          </span>
          {isAwaitingReview && (
            <button
              type="button"
              onClick={handleToggleEdit}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isEditing
                  ? "bg-obsidian-primary-deep/20 text-obsidian-primary-deep"
                  : "bg-obsidian-surface-raised text-obsidian-on-surface-var hover:text-obsidian-primary",
              )}
            >
              <PenLine className="h-3 w-3" />
              {isEditing ? t("preview") : t("editHint")}
            </button>
          )}
        </div>

        {isEditing ? (
          <textarea
            className={cn(
              "w-full rounded-lg bg-obsidian-surface-sheet p-4 text-sm text-obsidian-on-surface",
              "border border-obsidian-outline-ghost/20",
              "focus:ring-1 focus:ring-obsidian-primary/40 focus:outline-none",
              "resize-y min-h-[200px]",
              "font-mono leading-relaxed",
            )}
            value={plan}
            onChange={handlePlanChange}
          />
        ) : (
          <div
            className={cn(
              "rounded-lg bg-obsidian-surface-sheet p-6",
              isAwaitingReview && "cursor-pointer hover:bg-obsidian-surface-raised transition-colors",
            )}
            onClick={isAwaitingReview ? handleToggleEdit : undefined}
          >
            <MarkdownRenderer content={displayText} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isAwaitingReview && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (isEditing) setIsEditing(false);
              // Rewrite: re-submit to plan phase to regenerate with current edits
              onRewritePlan();
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
              "bg-obsidian-surface-raised text-obsidian-on-surface-var",
              "hover:bg-obsidian-surface-float hover:text-obsidian-on-surface",
              "active:scale-[0.98]",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("rewritePlan")}</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isPlanning}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg transition-all",
              "bg-gradient-to-br from-obsidian-primary to-obsidian-primary-deep",
              "text-[#1000a9]",
              "shadow-obsidian-primary/10",
              "active:scale-[0.98]",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <Play className="h-4 w-4" />
            <span>{t("startResearch")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
