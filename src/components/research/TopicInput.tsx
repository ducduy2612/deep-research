"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Rocket,
  Map,
  FileText,
  ArrowLeftRight,
} from "lucide-react";

import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import { useResearchStore } from "@/stores/research-store";
import { useResearch } from "@/hooks/use-research";
import type { ReportStyle, ReportLength } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopicInputProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopicInput({ className }: TopicInputProps) {
  const t = useTranslations("TopicInput");
  const [topic, setTopic] = useState("");
  const isActive = useResearchStore((s) => s.state !== "idle" && s.state !== "completed" && s.state !== "failed" && s.state !== "aborted");

  const reportStyle = useSettingsStore((s) => s.reportStyle);
  const reportLength = useSettingsStore((s) => s.reportLength);
  const language = useSettingsStore((s) => s.language);

  const { start } = useResearch();

  const FRAMEWORKS = [
    { icon: Map, label: t("marketMap"), topic: "Comprehensive market analysis of " },
    { icon: FileText, label: t("techDive"), topic: "Technical deep dive into " },
    { icon: ArrowLeftRight, label: t("compare"), topic: "Detailed comparison of " },
  ];

  const handleStart = useCallback(() => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    start({
      topic: trimmed,
      reportStyle: reportStyle as ReportStyle,
      reportLength: reportLength as ReportLength,
      language,
    });
  }, [topic, reportStyle, reportLength, language, start]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleStart();
      }
    },
    [handleStart],
  );

  return (
    <section className={cn("w-full max-w-2xl", className)}>
      {/* Glassmorphism input panel */}
      <div className="space-y-6 rounded-xl bg-[rgba(32,31,34,0.6)] p-6 shadow-2xl backdrop-blur-[20px]">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-obsidian-on-surface">
            {t("title")}
          </h1>
          <p className="font-mono text-[11px] text-obsidian-on-surface-var">
            {t("subtitle")}
          </p>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            className={cn(
              "w-full resize-none rounded-lg bg-obsidian-surface-deck p-4 text-sm text-obsidian-on-surface",
              "placeholder:text-zinc-600",
              "focus:ring-1 focus:ring-obsidian-primary/40 focus:outline-none transition-all",
              "border-none",
            )}
            placeholder={t("placeholder")}
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isActive}
          />
        </div>

        {/* Suggested frameworks */}
        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {t("frameworksLabel")}
          </span>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.label}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-obsidian-surface-sheet px-3 py-1.5 text-xs font-medium",
                  "text-obsidian-on-surface-var transition-colors duration-200",
                  "hover:bg-obsidian-surface-float hover:text-obsidian-primary",
                  "group",
                )}
                onClick={() => setTopic(fw.topic)}
                disabled={isActive}
              >
                <fw.icon className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                {fw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-1 rounded-lg bg-obsidian-surface-well p-1">
            <span className="px-2 py-1 font-mono text-[10px] text-zinc-600">
              {t("attachSources")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!topic.trim() || isActive}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-lg transition-all",
              "bg-gradient-to-br from-obsidian-primary to-obsidian-primary-deep",
              "text-[#1000a9]",
              "shadow-obsidian-primary/10",
              "active:scale-[0.98]",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <span>{t("startResearch")}</span>
            <Rocket className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Help text */}
      <p className="mt-6 text-center text-xs font-medium tracking-tight text-zinc-700">
        {t("helpPrefix")}{" "}
        <kbd className="rounded bg-obsidian-surface-sheet px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
          Ctrl+Enter
        </kbd>{" "}
        {t("helpSuffix")}
      </p>
    </section>
  );
}
