"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Check, MessageSquare, Loader2 } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { useUIStore } from "@/stores/ui-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useResearch } from "@/hooks/use-research";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportWorkspace() {
  const t = useTranslations("ReportWorkspace");
  const navigate = useUIStore((s) => s.navigate);

  const result = useResearchStore((s) => s.result);
  const state = useResearchStore((s) => s.state);
  const reportFeedback = useResearchStore((s) => s.reportFeedback);
  const setReportFeedback = useResearchStore((s) => s.setReportFeedback);
  const freeze = useResearchStore((s) => s.freeze);

  const { regenerateReport } = useResearch();

  const isReporting = state === "reporting";
  const reportContent = result?.report ?? "";

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleFeedbackChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReportFeedback(e.target.value);
    },
    [setReportFeedback],
  );

  const handleRegenerate = useCallback(() => {
    regenerateReport();
  }, [regenerateReport]);

  const handleDone = useCallback(() => {
    freeze("report");
    navigate("report");
  }, [freeze, navigate]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Report content */}
      {reportContent ? (
        <div className="rounded-lg bg-obsidian-surface-sheet p-6">
          <MarkdownRenderer content={reportContent} />
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg bg-obsidian-surface-sheet/50 px-6 py-16">
          <p className="font-mono text-xs text-obsidian-on-surface-var/40">
            {t("emptyReport")}
          </p>
        </div>
      )}

      {/* Feedback textarea */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-obsidian-on-surface-var" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
            {t("feedbackLabel")}
          </span>
        </div>
        <textarea
          className={cn(
            "w-full rounded-lg bg-obsidian-surface-deck p-4 text-sm text-obsidian-on-surface",
            "border border-obsidian-outline-ghost/20",
            "focus:ring-1 focus:ring-obsidian-primary/40 focus:outline-none",
            "resize-y min-h-[100px]",
            "placeholder:text-obsidian-on-surface-var/40",
          )}
          placeholder={t("feedbackPlaceholder")}
          value={reportFeedback}
          onChange={handleFeedbackChange}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isReporting}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
            "bg-obsidian-surface-raised text-obsidian-on-surface-var",
            "hover:bg-obsidian-surface-float hover:text-obsidian-on-surface",
            "active:scale-[0.98]",
            "disabled:opacity-40 disabled:pointer-events-none",
          )}
        >
          {isReporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span>{isReporting ? t("regenerating") : t("regenerate")}</span>
        </button>

        {result && (
          <button
            type="button"
            onClick={handleDone}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg transition-all",
              "bg-gradient-to-br from-obsidian-primary to-obsidian-primary-deep",
              "text-[#1000a9]",
              "shadow-obsidian-primary/10",
              "active:scale-[0.98]",
            )}
          >
            <Check className="h-4 w-4" />
            <span>{t("done")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
