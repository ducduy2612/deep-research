"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Share2, Plus, Download } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { useUIStore } from "@/stores/ui-store";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import type { Source } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FinalReportProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FinalReport({ className }: FinalReportProps) {
  const t = useTranslations("Report");
  const result = useResearchStore((s) => s.result);
  const startedAt = useResearchStore((s) => s.startedAt);
  const completedAt = useResearchStore((s) => s.completedAt);
  const navigate = useUIStore((s) => s.navigate);

  // Extract table of contents from markdown headings
  const tocEntries = useMemo(() => {
    if (!result?.report) return [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const entries: { level: number; text: string; id: string }[] = [];
    let match;
    while ((match = headingRegex.exec(result.report)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      entries.push({ level, text, id });
    }
    return entries;
  }, [result?.report]);

  const durationSec = startedAt && completedAt
    ? Math.round((completedAt - startedAt) / 1000)
    : null;

  if (!result) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <p className="text-obsidian-on-surface-var/40">{t("noReport")}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 overflow-hidden", className)}>
      {/* Main editorial content */}
      <article className="flex-1 overflow-y-auto px-6 pb-32 pt-24">
        <div className="mx-auto max-w-[800px]">
          {/* Title */}
          <header className="mb-16">
            <h1 className="mb-8 text-[3.5rem] font-bold leading-[1.1] tracking-tight text-obsidian-on-surface">
              {result.title}
            </h1>
          </header>

          {/* Report body */}
          <div id="report-content">
            <MarkdownRenderer content={result.report} />
          </div>
        </div>
      </article>

      {/* Right sidebar */}
      <aside className="sticky top-24 hidden h-fit w-[320px] shrink-0 space-y-10 p-6 xl:block">
        {/* Table of Contents */}
        {tocEntries.length > 0 && (
          <section className="rounded-xl bg-obsidian-surface-well p-6">
            <h3 className="mb-6 font-sans text-xs font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
              {t("contents")}
            </h3>
            <nav className="space-y-4">
              {tocEntries.map((entry) => (
                <a
                  key={entry.id}
                  href={"#" + entry.id}
                  className={cn(
                    "flex items-center gap-3 text-sm transition-colors",
                    "text-obsidian-on-surface-var hover:text-obsidian-on-surface",
                    entry.level === 1 && "font-bold text-obsidian-primary",
                  )}
                >
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    entry.level === 1 ? "bg-obsidian-primary" : "bg-obsidian-outline",
                  )} />
                  {entry.text}
                </a>
              ))}
            </nav>
          </section>
        )}

        {/* Sources */}
        {result.sources.length > 0 && (
          <section className="rounded-xl bg-obsidian-surface-well p-6">
            <h3 className="mb-6 font-sans text-xs font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
              {t("sources")}
            </h3>
            <div className="space-y-4">
              {result.sources.map((src, idx) => (
                <SourceItem key={idx} source={src} index={idx + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Metadata */}
        <section className="border-t border-obsidian-outline-ghost/10 pt-6">
          <div className="grid grid-cols-2 gap-4 font-mono text-[10px] uppercase tracking-wider text-obsidian-on-surface-var">
            {startedAt && (
              <div>
                <span className="block opacity-40">{t("date")}</span>
                <span className="text-obsidian-on-surface">
                  {new Date(startedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div>
              <span className="block opacity-40">{t("sources")}</span>
              <span className="text-obsidian-on-surface">
                {result.sources.length} {t("verified")}
              </span>
            </div>
            {durationSec != null && (
              <div>
                <span className="block opacity-40">{t("processTime")}</span>
                <span className="text-obsidian-on-surface">
                  {Math.floor(durationSec / 60)}m {durationSec % 60}s
                </span>
              </div>
            )}
          </div>
        </section>
      </aside>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 z-40 w-full border-t border-obsidian-outline-ghost/5 bg-obsidian-surface/90 p-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-[800px] items-center justify-between xl:ml-[calc(50%-400px-160px)]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-obsidian-primary">
              {t("reportComplete")}
            </span>
            <p className="mt-1 text-[10px] text-obsidian-on-surface-var">
              {t("basedOn", { count: result.sources.length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-obsidian-on-surface-var"
              onClick={() => navigate("hub")}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("newResearch")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-obsidian-on-surface-var"
            >
              <Share2 className="mr-1 h-4 w-4" />
              {t("share")}
            </Button>
            <Button size="sm" className="bg-obsidian-primary font-bold text-[#1000a9]">
              <Download className="mr-1 h-4 w-4" />
              {t("export")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source item
// ---------------------------------------------------------------------------

function SourceItem({ source, index }: { source: Source; index: number }) {
  const domain = (() => {
    try {
      return new URL(source.url).hostname;
    } catch {
      return source.url;
    }
  })();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold text-obsidian-primary">
          SOURCE {String(index).padStart(2, "0")}
        </span>
      </div>
      <p className="text-xs font-bold leading-tight">{source.title || domain}</p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-obsidian-on-surface-var/40 hover:text-obsidian-primary"
      >
        <span className="truncate text-[10px]">{domain}</span>
        <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
      </a>
    </div>
  );
}
