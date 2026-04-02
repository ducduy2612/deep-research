"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, PenLine, MessageSquare, ArrowRight } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClarifyPanelProps {
  className?: string;
  onSubmitFeedbackAndPlan: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClarifyPanel({
  className,
  onSubmitFeedbackAndPlan,
}: ClarifyPanelProps) {
  const t = useTranslations("ClarifyPanel");
  const state = useResearchStore((s) => s.state);
  const questions = useResearchStore((s) => s.questions);
  const clarifyText = useResearchStore((s) => s.steps.clarify.text);
  const setQuestions = useResearchStore((s) => s.setQuestions);
  const feedback = useResearchStore((s) => s.feedback);
  const setFeedback = useResearchStore((s) => s.setFeedback);

  const [isEditing, setIsEditing] = useState(false);

  const isClarifying = state === "clarifying";
  const isAwaitingFeedback = state === "awaiting_feedback";

  // Display the step-streamed text while clarifying, then the finalized
  // questions once they arrive via clarify-result event
  const displayText = isClarifying ? clarifyText : questions;

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const handleQuestionsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuestions(e.target.value);
    },
    [setQuestions],
  );

  const handleFeedbackChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFeedback(e.target.value);
    },
    [setFeedback],
  );

  const handleSubmit = useCallback(() => {
    // Persist edited questions before submitting
    if (isEditing) setIsEditing(false);
    onSubmitFeedbackAndPlan();
  }, [isEditing, onSubmitFeedbackAndPlan]);

  // Loading state while still streaming
  if (isClarifying && !displayText) {
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

      {/* Questions section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
            {t("questionsLabel")}
          </span>
          {isAwaitingFeedback && (
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
              {isEditing ? "Preview" : t("editHint")}
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
            value={questions}
            onChange={handleQuestionsChange}
          />
        ) : (
          <div
            className={cn(
              "rounded-lg bg-obsidian-surface-sheet p-6",
              isAwaitingFeedback && "cursor-pointer hover:bg-obsidian-surface-raised transition-colors",
            )}
            onClick={isAwaitingFeedback ? handleToggleEdit : undefined}
          >
            <MarkdownRenderer content={displayText} />
          </div>
        )}
      </div>

      {/* Feedback textarea */}
      {isAwaitingFeedback && (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-obsidian-on-surface-var" />
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
                {t("feedbackLabel")}
              </span>
            </div>
            <textarea
              className={cn(
                "w-full rounded-lg bg-obsidian-surface-sheet p-4 text-sm text-obsidian-on-surface",
                "border border-obsidian-outline-ghost/20",
                "focus:ring-1 focus:ring-obsidian-primary/40 focus:outline-none",
                "resize-y min-h-[100px]",
                "placeholder:text-obsidian-on-surface-var/40",
              )}
              placeholder={t("feedbackPlaceholder")}
              value={feedback}
              onChange={handleFeedbackChange}
            />
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isClarifying}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg transition-all",
                "bg-gradient-to-br from-obsidian-primary to-obsidian-primary-deep",
                "text-[#1000a9]",
                "shadow-obsidian-primary/10",
                "active:scale-[0.98]",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <span>{t("submitPlan")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
