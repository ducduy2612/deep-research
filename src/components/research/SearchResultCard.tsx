"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  X,
  RotateCw,
  ExternalLink,
  Download,
  Database,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { downloadBlob } from "@/utils/download";
import { sanitizeFilename } from "@/utils/export-pdf";
import {
  serializeSearchResultAsMd,
  serializeSearchResultsAsJson,
  searchResultToKnowledgeItem,
} from "@/utils/export-search";
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
  const [imagesExpanded, setImagesExpanded] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for export dropdown
  useEffect(() => {
    if (!exportOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setExportOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  const handleDelete = useCallback(() => {
    useResearchStore.getState().removeSearchResult(index);
  }, [index]);

  const handleRetry = useCallback(() => {
    useResearchStore.getState().retrySearchResult(index);
  }, [index]);

  const safeName = sanitizeFilename(result.query);

  const handleExportMd = useCallback(() => {
    downloadBlob(
      safeName + ".md",
      serializeSearchResultAsMd(result),
      "text/markdown;charset=utf-8",
    );
    setExportOpen(false);
  }, [result, safeName]);

  const handleExportJson = useCallback(() => {
    downloadBlob(
      safeName + ".json",
      serializeSearchResultsAsJson([result]),
      "application/json;charset=utf-8",
    );
    setExportOpen(false);
  }, [result, safeName]);

  const handleAddToKb = useCallback(() => {
    const item = searchResultToKnowledgeItem(result);
    useKnowledgeStore.getState().add(item);
    toast.success(t("addedToKb"));
  }, [result, t]);

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

        {/* Export dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            title={t("exportMarkdown")}
            className="shrink-0 rounded p-1 text-obsidian-on-surface-var transition-colors hover:text-obsidian-primary-deep"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-obsidian-outline-ghost/20 bg-obsidian-surface-raised py-1 shadow-lg">
              <button
                type="button"
                onClick={handleExportMd}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-obsidian-on-surface transition-colors hover:bg-obsidian-surface-well"
              >
                {t("exportMarkdown")}
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-obsidian-on-surface transition-colors hover:bg-obsidian-surface-well"
              >
                {t("exportJson")}
              </button>
            </div>
          )}
        </div>

        {/* Add to KB */}
        <button
          type="button"
          onClick={handleAddToKb}
          title={t("addToKb")}
          className="shrink-0 rounded p-1 text-obsidian-on-surface-var transition-colors hover:text-obsidian-primary-deep"
        >
          <Database className="h-3.5 w-3.5" />
        </button>

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

      {/* Related images */}
      {result.images.length > 0 && (
        <div className="border-t border-obsidian-outline-ghost/10">
          <button
            type="button"
            onClick={() => setImagesExpanded(!imagesExpanded)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-obsidian-on-surface-var transition-colors hover:text-obsidian-on-surface"
          >
            {imagesExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="font-mono text-[10px]">
              {t("images", { count: result.images.length })}
            </span>
          </button>
          {imagesExpanded && (
            <div className="flex flex-wrap gap-3 px-4 pb-3">
              {result.images.map((img, i) => (
                <picture
                  key={i}
                  className="h-28 w-28"
                >
                  <img
                    className="h-full w-full rounded object-cover"
                    src={img.url}
                    title={img.description ?? undefined}
                    alt={img.description ?? undefined}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </picture>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
