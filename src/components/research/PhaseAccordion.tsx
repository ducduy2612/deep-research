"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type {
  CheckpointPhase,
  ResearchState,
  SearchTask,
  ClarifyCheckpoint,
  PlanCheckpoint,
  ResearchPhaseCheckpoint,
  ReportCheckpoint,
} from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Phase config
// ---------------------------------------------------------------------------

interface PhaseConfig {
  id: CheckpointPhase;
  titleKey: string;
  activeStates: ResearchState[];
  getSummary: (
    t: (key: string, params?: Record<string, number>) => string,
    checkpoint: unknown,
    store: {
      searchResults: readonly { learning: string; sources: { url: string; title?: string }[] }[];
      result: { learnings: string[]; sources: { url: string; title?: string }[] } | null;
    },
  ) => string;
  getFrozenContent: (checkpoint: unknown) => string;
}

const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: "clarify",
    titleKey: "clarifyTitle",
    activeStates: ["clarifying", "awaiting_feedback"],
    getSummary: (t, _cp) => {
      const cp = _cp as ClarifyCheckpoint;
      const count = cp.questions
        ? cp.questions.split(/\n/).filter((l) => l.trim().length > 0).length
        : 0;
      return t("clarifySummary", { count });
    },
    getFrozenContent: (cp) => (cp as ClarifyCheckpoint).questions ?? "",
  },
  {
    id: "plan",
    titleKey: "planTitle",
    activeStates: ["planning", "awaiting_plan_review"],
    getSummary: (t, _cp) => {
      const cp = _cp as PlanCheckpoint;
      return t("planSummary", { count: cp.searchTasks?.length ?? 0 });
    },
    getFrozenContent: (cp) => {
      const { plan, searchTasks } = cp as PlanCheckpoint;
      if (!searchTasks?.length) return plan ?? "";
      const tasksList = searchTasks
        .map((t: SearchTask, i: number) => `${i + 1}. **${t.query}** — ${t.researchGoal}`)
        .join("\n");
      return `${plan}\n\n---\n\n### Search Queries\n\n${tasksList}`;
    },
  },
  {
    id: "research",
    titleKey: "researchTitle",
    activeStates: [
      "searching",
      "analyzing",
      "reviewing",
      "awaiting_results_review",
    ],
    getSummary: (t, _cp, store) => {
      const results = store.searchResults;
      const learnings = results.filter((r) => r.learning).length;
      const sources = results.reduce((sum, r) => sum + r.sources.length, 0);
      return t("researchSummary", { learnings, sources });
    },
    getFrozenContent: (cp) => {
      const frozen = cp as ResearchPhaseCheckpoint;
      return frozen.searchResults
        ?.map(
          (r, i) =>
            `### Round ${i + 1}: ${r.query}\n\n${r.learning}\n\n*Sources: ${r.sources.length}*`,
        )
        .join("\n\n---\n\n");
    },
  },
  {
    id: "report",
    titleKey: "reportTitle",
    activeStates: ["reporting", "completed"],
    getSummary: (t) => t("reportSummary"),
    getFrozenContent: (cp) => {
      const frozen = cp as ReportCheckpoint;
      return frozen.result?.report ?? "";
    },
  },
];

/** Render props for active phase content. */
export interface PhaseAccordionRenderProps {
  onRenderClarify?: () => ReactNode;
  onRenderPlan?: () => ReactNode;
  onRenderStreaming?: () => ReactNode;
  onRenderResearchActions?: () => ReactNode;
  onRenderReport?: () => ReactNode;
}

interface PhaseAccordionProps extends PhaseAccordionRenderProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhaseAccordion({
  className,
  onRenderClarify,
  onRenderPlan,
  onRenderStreaming,
  onRenderResearchActions,
  onRenderReport,
}: PhaseAccordionProps) {
  const t = useTranslations("PhaseAccordion");
  const state = useResearchStore((s) => s.state);
  const checkpoints = useResearchStore((s) => s.checkpoints);
  const searchResults = useResearchStore((s) => s.searchResults);
  const result = useResearchStore((s) => s.result);
  const plan = useResearchStore((s) => s.plan);
  const searchTasks = useResearchStore((s) => s.searchTasks);

  // Determine the active phase ID
  let activePhaseId: CheckpointPhase | null = null;
  for (const phase of PHASE_CONFIG) {
    if (phase.activeStates.includes(state)) {
      activePhaseId = phase.id;
      break;
    }
  }

  // Phase ordering — used to infer "done" state when checkpoint hasn't landed yet
  const phaseOrder: CheckpointPhase[] = ["clarify", "plan", "research", "report"];

  // Helper: check if a phase is frozen (has a checkpoint)
  const isFrozen = (phaseId: CheckpointPhase) =>
    checkpoints[phaseId] !== undefined;

  // Helper: check if a phase is active
  const isActive = (phaseId: CheckpointPhase) => activePhaseId === phaseId;

  // Determine which accordion items are open by default — active phase expanded.
  // Also keep plan expanded while research is running but plan hasn't frozen yet,
  // so the user can see their plan while searches execute.
  const defaultValue = activePhaseId
    ? activePhaseId === "research" && !isFrozen("plan")
      ? ["plan", activePhaseId]
      : [activePhaseId]
    : [];

  // Helper: check if a phase is done (frozen, or a later phase is active/frozen)
  const isDone = (phaseId: CheckpointPhase) => {
    if (isFrozen(phaseId)) return true;
    const idx = phaseOrder.indexOf(phaseId);
    return phaseOrder.slice(idx + 1).some(
      (later) => isFrozen(later) || isActive(later),
    );
  };

  // Helper: check if a phase is pending (not done, not active)
  const isPending = (phaseId: CheckpointPhase) =>
    !isDone(phaseId) && !isActive(phaseId);

  // Helper: get summary badge text
  const getSummary = (phase: PhaseConfig) =>
    phase.getSummary(
      (key: string, params?: Record<string, number>) =>
        params ? t(key, params as never) : t(key),
      checkpoints[phase.id],
      { searchResults, result },
    );

  // Helper: render active phase content
  const renderActiveContent = (phaseId: CheckpointPhase): ReactNode => {
    switch (phaseId) {
      case "clarify":
        return onRenderClarify?.();
      case "plan":
        return onRenderPlan?.();
      case "research":
        return (
          <div className="flex flex-col gap-8">
            {onRenderStreaming?.()}
            {state === "awaiting_results_review" && onRenderResearchActions?.()}
          </div>
        );
      case "report":
        return (
          <div className="flex flex-col gap-8">
            {onRenderStreaming?.()}
            {onRenderReport?.()}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultValue}
      className={cn("flex flex-col gap-2", className)}
    >
      {PHASE_CONFIG.map((phase) => {
        const frozen = isFrozen(phase.id);
        const active = isActive(phase.id);
        const done = isDone(phase.id);
        const pending = isPending(phase.id);

        return (
          <AccordionItem
            key={phase.id}
            value={phase.id}
            disabled={pending}
            className={cn(
              "rounded-lg border-0",
              // Obsidian Deep tonal layering
              done && !active && "bg-obsidian-surface-well/40",
              active && "bg-obsidian-surface-deck ring-1 ring-obsidian-primary-deep/20",
              pending && "bg-obsidian-surface-well/20 opacity-40",
            )}
          >
            <AccordionTrigger
              className={cn(
                "px-5 py-3.5 hover:no-underline",
                // Done header styling
                done && !active && "[&>svg]:text-obsidian-on-surface-var/40",
              )}
            >
              <div className="flex flex-1 items-center gap-3">
                {/* Status icon */}
                {done && !active && (
                  <Check className="h-3.5 w-3.5 text-obsidian-primary-deep" />
                )}
                {active && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-obsidian-primary-deep" />
                )}
                {pending && (
                  <span className="h-3.5 w-3.5 rounded-full border border-obsidian-outline/30" />
                )}

                {/* Phase title */}
                <span
                  className={cn(
                    done &&
                      !active &&
                      "font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var/60",
                    active &&
                      "text-sm font-semibold text-obsidian-primary-deep",
                    pending &&
                      "font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var/30",
                  )}
                >
                  {t(phase.titleKey)}
                </span>

                {/* Summary badge for frozen phases (needs checkpoint data) */}
                {frozen && !active && (
                  <span className="rounded-full bg-obsidian-surface-raised px-2.5 py-0.5 font-mono text-[10px] text-obsidian-on-surface-var/60">
                    {getSummary(phase)}
                  </span>
                )}

                {/* Summary badge for plan that's done but not frozen yet — show live search task count */}
                {done && !frozen && !active && phase.id === "plan" && searchTasks.length > 0 && (
                  <span className="rounded-full bg-obsidian-surface-raised px-2.5 py-0.5 font-mono text-[10px] text-obsidian-on-surface-var/60">
                    {t("planSummary", { count: searchTasks.length } as never)}
                  </span>
                )}

                {/* Active label */}
                {active && (
                  <span className="ml-1 rounded-full bg-obsidian-primary-deep/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-obsidian-primary-deep">
                    {t("activeLabel")}
                  </span>
                )}

                {/* Pending label */}
                {pending && (
                  <span className="ml-1 font-mono text-[9px] uppercase tracking-widest text-obsidian-on-surface-var/30">
                    {t("pendingLabel")}
                  </span>
                )}
              </div>
            </AccordionTrigger>

            <AccordionContent className="border-0 pb-0">
              <div className="px-5 pb-5">
                {frozen && !active ? (
                  // Frozen: read-only content via MarkdownRenderer
                  <div className="opacity-60">
                    <MarkdownRenderer
                      content={phase.getFrozenContent(checkpoints[phase.id])}
                    />
                  </div>
                ) : active ? (
                  // Active: live editable workspace
                  <div className="mt-2">{renderActiveContent(phase.id)}</div>
                ) : done && phase.id === "plan" ? (
                  // Done but not frozen: plan is waiting for search tasks to freeze.
                  // Show the plan text + any search tasks that have arrived.
                  <div className="mt-2 opacity-80">
                    <MarkdownRenderer content={plan} />
                    {searchTasks.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-obsidian-primary-deep">
                            {t("searchTasksLabel")}
                          </span>
                          <span className="rounded-full bg-obsidian-surface-raised px-2 py-0.5 font-mono text-[10px] text-obsidian-on-surface-var/60">
                            {searchTasks.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {searchTasks.map((task, i) => (
                            <div
                              key={`${task.query}-${i}`}
                              className="flex items-start gap-2 rounded-md bg-obsidian-surface-sheet px-3 py-2"
                            >
                              <span className="shrink-0 font-mono text-[10px] text-obsidian-on-surface-var/40">
                                {i + 1}.
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-obsidian-on-surface">
                                  {task.query}
                                </p>
                                <p className="mt-0.5 font-mono text-[10px] text-obsidian-on-surface-var/50">
                                  {task.researchGoal}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
