"use client";

import { Loader2, ExternalLink } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { ResearchStep } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActiveResearchCenterProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Step metadata
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<ResearchStep, string> = {
  clarify: "Clarifying topic",
  plan: "Planning research",
  search: "Searching sources",
  analyze: "Analyzing findings",
  review: "Reviewing report",
  report: "Generating report",
};

const STEP_ORDER: ResearchStep[] = [
  "clarify", "plan", "search", "analyze", "review", "report",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActiveResearchCenter({ className }: ActiveResearchCenterProps) {
  const steps = useResearchStore((s) => s.steps);
  const error = useResearchStore((s) => s.error);
  const searchResults = useResearchStore((s) => s.searchResults);
  const state = useResearchStore((s) => s.state);

  // Determine current step
  let currentStep: ResearchStep | null = null;
  for (const step of STEP_ORDER) {
    const s = steps[step];
    if (s.startTime && !s.endTime) {
      currentStep = step;
      break;
    }
  }

  const currentLabel = currentStep ? STEP_LABELS[currentStep] : null;
  const activeText = currentStep ? steps[currentStep].text : "";

  // Completed steps
  const completedSteps = STEP_ORDER.filter(
    (s) => steps[s].endTime !== null,
  );

  // Idle state
  const isIdle = state === "idle";

  return (
    <section
      className={cn(
        "flex-1 overflow-y-auto bg-obsidian-surface-well p-12",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        {currentLabel && (
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

        {/* Completed step cards */}
        {completedSteps.map((step) => {
          const stepData = steps[step];
          if (!stepData.text) return null;
          return (
            <div key={step} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-obsidian-on-surface-var">
                  {STEP_LABELS[step]}
                </span>
                {stepData.duration && (
                  <span className="font-mono text-[10px] text-obsidian-on-surface-var/40">
                    {(stepData.duration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-obsidian-surface-sheet p-6">
                <MarkdownRenderer content={stepData.text} />
              </div>
            </div>
          );
        })}

        {/* Active streaming content */}
        {activeText && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-obsidian-primary-deep" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-obsidian-primary-deep">
                {currentLabel} — streaming
              </span>
            </div>
            <div className="rounded-lg bg-obsidian-surface-sheet p-6">
              <MarkdownRenderer content={activeText} />
            </div>
          </div>
        )}

        {/* Search result cards */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {searchResults.map((result, idx) => (
              <SearchResultCard
                key={idx}
                query={result.query}
                learning={result.learning}
                sources={result.sources}
              />
            ))}
          </div>
        )}

        {/* Idle state */}
        {isIdle && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-obsidian-on-surface-var/40">
              Enter a topic to begin research.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Search result card
// ---------------------------------------------------------------------------

function SearchResultCard({
  query,
  learning,
  sources,
}: {
  query: string;
  learning: string;
  sources: { url: string; title?: string }[];
}) {
  const domain = sources[0]
    ? (() => {
        try {
          return new URL(sources[0].url).hostname;
        } catch {
          return sources[0].url;
        }
      })()
    : null;

  return (
    <div className="rounded-lg bg-obsidian-surface-sheet p-6 transition-all hover:bg-obsidian-surface-raised">
      <div className="mb-4 flex items-start justify-between">
        {domain && (
          <span className="font-mono text-[10px] uppercase tracking-tighter text-obsidian-on-surface-var">
            {domain}
          </span>
        )}
      </div>
      <h4 className="mb-3 text-sm font-bold leading-snug text-obsidian-on-surface">
        {query}
      </h4>
      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-obsidian-on-surface-var">
        {learning}
      </p>
      {sources[0] && (
        <div className="flex items-center gap-2">
          <ExternalLink className="h-3 w-3 text-obsidian-on-surface-var/40" />
          <span className="truncate font-mono text-[10px] text-obsidian-on-surface-var/40">
            {sources[0].url}
          </span>
        </div>
      )}
    </div>
  );
}
