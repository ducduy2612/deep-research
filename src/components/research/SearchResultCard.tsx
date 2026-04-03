"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, X, RotateCw, ExternalLink } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { SearchResult } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchResultCardProps {
  result: SearchResult;
  index: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchResultCard({ result, index }: SearchResultCardProps) {
  const t = useTranslations("SearchResultCard");
  const [expanded, setExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const handleDelete = useCallback(() => {
    useResearchStore.getState().removeSearchResult(index);
  }, [index]);

  const handleRetry = useCallback(() => {
    useResearchStore.getState().retrySearchResult(index);
  }, [index]);

  return (
    <div
      className={cn(
        "rounded-lg border border-obsidian-outline-ghost/20 bg-obsidian-surface-sheet",
        "overflow-hidden transition-colors",
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="truncate font-mono text-sm font-medium text-obsidian-on-surface">
            {result.query}
          </p>
          <span className="mt-1 inline-block rounded-full bg-obsidian-surface-raised px-2 py-0.5 font-mono text-[10px] text-obsidian-on-surface-var">
            {t("sources", { count: result.sources.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          title={t("retry")}
          className="shrink-0 rounded p-1 text-obsidian-on-surface-var transition-colors hover:text-obsidian-primary-deep"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          title={t("delete")}
          className="shrink-0 rounded p-1 text-obsidian-on-surface-var transition-colors hover:text-obsidian-error"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Collapsible learning */}
      <div className="border-t border-obsidian-outline-ghost/10">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-obsidian-on-surface-var transition-colors hover:text-obsidian-on-surface"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em]">
            {t("learning")}
          </span>
        </button>
        {expanded && (
          <div className="px-4 pb-3">
            <MarkdownRenderer
              content={result.learning}
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Source list */}
      {result.sources.length > 0 && (
        <div className="border-t border-obsidian-outline-ghost/10">
          <button
            type="button"
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-obsidian-on-surface-var transition-colors hover:text-obsidian-on-surface"
          >
            {sourcesExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="font-mono text-[10px]">
              {t("sources", { count: result.sources.length })}
            </span>
          </button>
          {sourcesExpanded && (
            <ul className="space-y-1 px-4 pb-3">
              {result.sources.map((src, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <ExternalLink className="h-3 w-3 shrink-0 text-obsidian-on-surface-var" />
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-obsidian-primary hover:underline"
                  >
                    {src.title ?? src.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
