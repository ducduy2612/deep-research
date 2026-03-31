"use client";

import { ExternalLink, Check, Loader2, Circle } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import type { Source } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActiveResearchLeftProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActiveResearchLeft({ className }: ActiveResearchLeftProps) {
  const searchTasks = useResearchStore((s) => s.searchTasks);
  const searchResults = useResearchStore((s) => s.searchResults);
  const steps = useResearchStore((s) => s.steps);
  const state = useResearchStore((s) => s.state);

  // Extract questions from plan text or search tasks
  const planText = steps.plan.text;
  const questions = searchTasks.length > 0
    ? searchTasks.map((t) => t.query)
    : extractQuestions(planText);

  // All sources from search results
  const sources = searchResults.flatMap((r) => r.sources);

  // Map questions to statuses
  const completedCount = searchResults.length;

  return (
    <aside
      className={cn(
        "flex h-full w-[280px] flex-col gap-y-6 overflow-y-auto px-4 py-6",
        "bg-obsidian-surface-deck",
        className,
      )}
    >
      {/* Research Questions */}
      <div className="px-2">
        <h3 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
          Research Questions
        </h3>
        <div className="space-y-2">
          {questions.length === 0 && (
            <p className="text-xs italic text-obsidian-on-surface-var/40">
              Waiting for research plan...
            </p>
          )}
          {questions.map((q, idx) => {
            const isSearching = state === "searching" || state === "analyzing";
            const status =
              idx < completedCount
                ? "completed" as const
                : idx === completedCount && isSearching
                  ? "active" as const
                  : "pending" as const;
            return <QuestionCard key={idx} question={q} status={status} />;
          })}
        </div>
      </div>

      {/* Search Sources */}
      {sources.length > 0 && (
        <div className="px-2 mt-4">
          <h3 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
            Search Sources
          </h3>
          <div className="space-y-3">
            {sources.slice(0, 20).map((src, idx) => (
              <SourceItem key={idx} source={src} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  status,
}: {
  question: string;
  status: "completed" | "active" | "pending";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg p-3 transition-all",
        status === "completed" && "bg-obsidian-surface-sheet",
        status === "active" && "bg-obsidian-surface-raised ring-1 ring-obsidian-primary-deep/20",
        status === "pending" && "bg-obsidian-surface-sheet/40",
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {status === "completed" && (
          <Check className="h-3.5 w-3.5 text-obsidian-primary-deep" />
        )}
        {status === "active" && (
          <Loader2 className="h-3.5 w-3.5 animate-pulse text-obsidian-primary-deep" />
        )}
        {status === "pending" && (
          <Circle className="h-3.5 w-3.5 text-obsidian-on-surface-var/30" />
        )}
      </div>
      <p
        className={cn(
          "text-xs leading-relaxed",
          status === "completed" && "text-obsidian-on-surface-var",
          status === "active" && "font-medium text-obsidian-on-surface",
          status === "pending" && "text-obsidian-on-surface-var/60",
        )}
      >
        {question}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source item
// ---------------------------------------------------------------------------

function SourceItem({ source }: { source: Source }) {
  const domain = (() => {
    try {
      return new URL(source.url).hostname;
    } catch {
      return source.url;
    }
  })();
  const initial = domain.charAt(0).toUpperCase();

  return (
    <div className="group flex cursor-pointer items-center justify-between">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-obsidian-surface-bright text-[10px] font-bold">
          {initial}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate font-mono text-[11px] text-obsidian-on-surface">
            {source.title || domain}
          </span>
          <span className="truncate font-mono text-[9px] text-obsidian-on-surface-var/50">
            {domain}
          </span>
        </div>
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 flex-shrink-0 text-obsidian-on-surface-var/40 hover:text-obsidian-primary"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractQuestions(planText: string): string[] {
  if (!planText) return [];
  const lines = planText.split("\n").filter((l) => l.trim());
  return lines
    .filter((l) => /^\d+[\.\)]\s/.test(l.trim()))
    .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);
}
