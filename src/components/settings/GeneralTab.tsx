"use client";

import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import type { ReportStyle, ReportLength } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const STYLE_OPTIONS: { value: ReportStyle; label: string; desc: string }[] = [
  { value: "balanced", label: "Balanced", desc: "Equal depth and readability" },
  { value: "executive", label: "Executive", desc: "High-level strategic insights" },
  { value: "technical", label: "Technical", desc: "Detailed technical analysis" },
  { value: "concise", label: "Concise", desc: "Brief summary of key findings" },
];

const LENGTH_OPTIONS: { value: ReportLength; label: string; desc: string }[] = [
  { value: "brief", label: "Brief", desc: "Quick overview (~500 words)" },
  { value: "standard", label: "Standard", desc: "Balanced depth (~1,500 words)" },
  { value: "comprehensive", label: "Comprehensive", desc: "Deep analysis (~3,000+ words)" },
];

// ---------------------------------------------------------------------------
// Option button (reused for style/length selectors)
// ---------------------------------------------------------------------------

function OptionButton<T extends string>({
  value,
  current,
  label,
  desc,
  onSelect,
}: {
  value: T;
  current: T;
  label: string;
  desc: string;
  onSelect: (v: T) => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        active
          ? "border-l-2 border-obsidian-primary bg-obsidian-surface-raised"
          : "border-l-2 border-transparent hover:bg-obsidian-surface-sheet",
      )}
    >
      <div className="flex flex-col">
        <span className="text-xs font-medium text-obsidian-on-surface">{label}</span>
        <span className="font-mono text-[10px] text-obsidian-on-surface-var/50">{desc}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tab component
// ---------------------------------------------------------------------------

export function GeneralTab() {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const reportStyle = useSettingsStore((s) => s.reportStyle);
  const setReportStyle = useSettingsStore((s) => s.setReportStyle);
  const reportLength = useSettingsStore((s) => s.reportLength);
  const setReportLength = useSettingsStore((s) => s.setReportLength);
  const autoReviewRounds = useSettingsStore((s) => s.autoReviewRounds);
  const setAutoReviewRounds = useSettingsStore((s) => s.setAutoReviewRounds);
  const maxSearchQueries = useSettingsStore((s) => s.maxSearchQueries);
  const setMaxSearchQueries = useSettingsStore((s) => s.setMaxSearchQueries);

  return (
    <div className="space-y-6">
      {/* Language */}
      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          Report Language
        </label>
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="English"
          className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
        />
      </div>

      {/* Report style */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          Style
        </h4>
        <div className="space-y-1">
          {STYLE_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              value={opt.value}
              current={reportStyle}
              label={opt.label}
              desc={opt.desc}
              onSelect={setReportStyle}
            />
          ))}
        </div>
      </div>

      {/* Report length */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          Length
        </h4>
        <div className="space-y-1">
          {LENGTH_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              value={opt.value}
              current={reportLength}
              label={opt.label}
              desc={opt.desc}
              onSelect={setReportLength}
            />
          ))}
        </div>
      </div>

      {/* Auto-review rounds slider */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            Auto-Review Rounds
          </label>
          <span className="font-mono text-[10px] text-obsidian-primary">
            {autoReviewRounds}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={autoReviewRounds}
          onChange={(e) => setAutoReviewRounds(parseInt(e.target.value, 10))}
          className="w-full accent-obsidian-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] text-obsidian-on-surface-var/40">
          <span>0 (off)</span>
          <span>5</span>
        </div>
      </div>

      {/* Max search queries slider */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            Max Search Queries
          </label>
          <span className="font-mono text-[10px] text-obsidian-primary">
            {maxSearchQueries}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={maxSearchQueries}
          onChange={(e) => setMaxSearchQueries(parseInt(e.target.value, 10))}
          className="w-full accent-obsidian-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] text-obsidian-on-surface-var/40">
          <span>1</span>
          <span>30</span>
        </div>
      </div>
    </div>
  );
}
