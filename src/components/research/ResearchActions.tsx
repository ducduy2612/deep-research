"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  BookOpen,
  Globe,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { ManualQueryInput } from "./ManualQueryInput";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResearchActionsProps {
  className?: string;
  onRequestMoreResearch: () => void;
  onFinalizeFindings: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResearchActions({
  className,
  onRequestMoreResearch,
  onFinalizeFindings,
}: ResearchActionsProps) {
  const t = useTranslations("ResearchActions");

  const state = useResearchStore((s) => s.state);
  const result = useResearchStore((s) => s.result);
  const suggestion = useResearchStore((s) => s.suggestion);
  const setSuggestion = useResearchStore((s) => s.setSuggestion);
  const pendingRetryQueries = useResearchStore((s) => s.pendingRetryQueries);
  const manualQueries = useResearchStore((s) => s.manualQueries);

  const isResearching =
    state === "searching" ||
    state === "analyzing" ||
    state === "reviewing";
  const isAwaitingReview = state === "awaiting_results_review";

  const learningsCount = result?.learnings?.length ?? 0;
  const sourcesCount = result?.sources?.length ?? 0;
  const pendingCount = pendingRetryQueries.length + manualQueries.length;

  const handleSuggestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSuggestion(e.target.value);
    },
    [setSuggestion],
  );

  const handleMoreResearch = useCallback(() => {
    onRequestMoreResearch();
  }, [onRequestMoreResearch]);

  const handleFinalizeFindings = useCallback(() => {
    onFinalizeFindings();
  }, [onFinalizeFindings]);

  // Only show during research or awaiting review states
  if (!isResearching && !isAwaitingReview) {
    return null;
  }

  // Loading state while still researching
  if (isResearching && !isAwaitingReview) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-obsidian-primary-deep" />
        <p className="mt-3 font-mono text-xs text-obsidian-on-surface-var">
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight text-obsidian-on-surface">
          {t("title")}
        </h3>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <StatBadge
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label={t("learnings", { count: learningsCount })}
          value={learningsCount}
        />
        <StatBadge
          icon={<Globe className="h-3.5 w-3.5" />}
          label={t("sources", { count: sourcesCount })}
          value={sourcesCount}
        />
      </div>

      {/* Manual query input */}
      <ManualQueryInput />

      {/* Suggestion textarea */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-obsidian-on-surface-var" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
            {t("suggestionLabel")}
          </span>
        </div>
        <textarea
          className={cn(
            "w-full rounded-lg bg-obsidian-surface-sheet p-4 text-sm text-obsidian-on-surface",
            "border border-obsidian-outline-ghost/20",
            "focus:ring-1 focus:ring-obsidian-primary/40 focus:outline-none",
            "resize-y min-h-[80px]",
            "placeholder:text-obsidian-on-surface-var/40",
          )}
          placeholder={t("suggestionPlaceholder")}
          value={suggestion}
          onChange={handleSuggestionChange}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleMoreResearch}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
            "bg-obsidian-surface-raised text-obsidian-on-surface-var",
            "hover:bg-obsidian-surface-float hover:text-obsidian-on-surface",
            "active:scale-[0.98]",
          )}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>{t("moreResearch")}</span>
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-obsidian-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-obsidian-primary-deep">
              {t("pendingQueries", { count: pendingCount })}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleFinalizeFindings}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg transition-all",
            "bg-gradient-to-br from-obsidian-primary to-obsidian-primary-deep",
            "text-[#1000a9]",
            "shadow-obsidian-primary/10",
            "active:scale-[0.98]",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{t("finalizeFindings")}</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat badge sub-component
// ---------------------------------------------------------------------------

function StatBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-obsidian-surface-sheet px-3 py-2">
      <span className="text-obsidian-on-surface-var">{icon}</span>
      <span className="font-mono text-xs font-bold text-obsidian-primary-deep">
        {value}
      </span>
      <span className="font-mono text-[10px] text-obsidian-on-surface-var">
        {label}
      </span>
    </div>
  );
}
