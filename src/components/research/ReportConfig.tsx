"use client";

import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import type { ReportStyle, ReportLength } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const STYLE_OPTIONS: {
  value: ReportStyle;
  label: string;
  description: string;
}[] = [
  { value: "balanced", label: "Balanced", description: "Equal depth and readability" },
  { value: "executive", label: "Executive", description: "High-level strategic insights" },
  { value: "technical", label: "Technical", description: "Detailed technical analysis" },
  { value: "concise", label: "Concise", description: "Brief summary of key findings" },
];

const LENGTH_OPTIONS: {
  value: ReportLength;
  label: string;
  description: string;
}[] = [
  { value: "brief", label: "Brief", description: "Quick overview (~500 words)" },
  { value: "standard", label: "Standard", description: "Balanced depth (~1,500 words)" },
  { value: "comprehensive", label: "Comprehensive", description: "Deep analysis (~3,000+ words)" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportConfigProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportConfig({ className }: ReportConfigProps) {
  const reportStyle = useSettingsStore((s) => s.reportStyle);
  const reportLength = useSettingsStore((s) => s.reportLength);
  const setReportStyle = useSettingsStore((s) => s.setReportStyle);
  const setReportLength = useSettingsStore((s) => s.setReportLength);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Style selector */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          Style
        </h4>
        <div className="space-y-1">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReportStyle(opt.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                opt.value === reportStyle
                  ? "border-l-2 border-obsidian-primary bg-obsidian-surface-raised"
                  : "border-l-2 border-transparent hover:bg-obsidian-surface-sheet",
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-obsidian-on-surface">
                  {opt.label}
                </span>
                <span className="font-mono text-[10px] text-obsidian-on-surface-var/50">
                  {opt.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Length selector */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          Length
        </h4>
        <div className="space-y-1">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReportLength(opt.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                opt.value === reportLength
                  ? "border-l-2 border-obsidian-primary bg-obsidian-surface-raised"
                  : "border-l-2 border-transparent hover:bg-obsidian-surface-sheet",
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-obsidian-on-surface">
                  {opt.label}
                </span>
                <span className="font-mono text-[10px] text-obsidian-on-surface-var/50">
                  {opt.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
