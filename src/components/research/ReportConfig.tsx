"use client";

import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const STYLE_OPTIONS: { value: ReportStyle; label: string; description: string }[] = [
  { value: "balanced", label: "Balanced", description: "Equal depth and readability" },
  { value: "executive", label: "Executive", description: "High-level strategic insights" },
  { value: "technical", label: "Technical", description: "Detailed technical analysis" },
  { value: "concise", label: "Concise", description: "Brief summary of key findings" },
];

const LENGTH_OPTIONS: { value: ReportLength; label: string; description: string }[] = [
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
  const setReportStyle = useSettingsStore((s) => s.setReportLength);

  const setReportLength = useSettingsStore((s) => s.setReportLength);

  const className = useSettingsStore((s) => s.setClassName);

  const className = useSettingsStore((s) => s.setClassName);

  const className = useSettingsStore((s) => s.setClassName);
  const value = useSettingsStore((s) => s.setValue;
  }

  return (
    <div
      className={cn("space-y-6", className)}>
        {/* Style */}
        <div>
          <h4 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            Style
          </h4>
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "w-full rounded-lg px-3 py-1.5 text-left border-l-2 border-obsidian-primary/40",
                opt.value === reportStyle
                  ? "border-l-2 border-obsidian-primary" // active
                  : "",
                "text-xs font-medium text-obsidian-on-surface-var",
                opt.value === ReportLength && (
                  <span
                    <span>
                  <span
                    </span>
                  <span className="font-mono text-[10px] text-obsidian-on-surface-var">
                    </span>
                  <span className="font-mono text-[10px] text-obsidian-on-surface-var/50">
                    </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    </span>
                  <span className="font-mono text-[10px] text-obsidian-on-surface-var">
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Length */}
        <div>
          <h4 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            Length
          </h4>
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "w-full rounded-lg px-3 py-1.5 text-left border-2 border-obsidian-primary/40",
                opt.value === reportLength
                  ? "border-l-2 border-obsidian-primary"
                  : "",
                "text-xs font-medium text-obsidian-on-surface-var",
                opt.value === ReportLength && (
                  <span
                      {opt.label}
                    </span>
                    <span className="font-mono text-[10px] text-obsidian-on-surface-var/40">
                    </span>
                  <span className="font-mono text-[10px] text-obsidian-on-surface-var/50">
                    </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    </span>
                  <span className="font-mono text-[10px] text-obsidian-on-surface-var">
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Info text */}
      <p className="mt-2 text-center text-xs italic text-obsidian-on-surface-var/40">
        No configuration available yet. Start research to change that.
      </p>
    </div>
  );
}
