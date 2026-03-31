"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import { Switch } from "@/components/ui/switch";
import type { ReportStyle, ReportLength } from "@/engine/research/types";

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
  const t = useTranslations("ReportConfig");
  const reportStyle = useSettingsStore((s) => s.reportStyle);
  const reportLength = useSettingsStore((s) => s.reportLength);
  const localOnlyMode = useSettingsStore((s) => s.localOnlyMode);
  const setReportStyle = useSettingsStore((s) => s.setReportStyle);
  const setReportLength = useSettingsStore((s) => s.setReportLength);
  const setLocalOnlyMode = useSettingsStore((s) => s.setLocalOnlyMode);

  const STYLE_OPTIONS: {
    value: ReportStyle;
    label: string;
    description: string;
  }[] = [
    { value: "balanced", label: t("styles.balanced"), description: t("styles.balancedDesc") },
    { value: "executive", label: t("styles.executive"), description: t("styles.executiveDesc") },
    { value: "technical", label: t("styles.technical"), description: t("styles.technicalDesc") },
    { value: "concise", label: t("styles.concise"), description: t("styles.conciseDesc") },
  ];

  const LENGTH_OPTIONS: {
    value: ReportLength;
    label: string;
    description: string;
  }[] = [
    { value: "brief", label: t("lengths.brief"), description: t("lengths.briefDesc") },
    { value: "standard", label: t("lengths.standard"), description: t("lengths.standardDesc") },
    { value: "comprehensive", label: t("lengths.comprehensive"), description: t("lengths.comprehensiveDesc") },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Style selector */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("style")}
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
          {t("length")}
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

      {/* Local-only mode toggle */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("knowledgeMode")}
        </h4>
        <div className="flex items-center justify-between rounded-lg border border-obsidian-surface-raised px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-obsidian-on-surface">
                {t("localOnly")}
              </span>
              {localOnlyMode && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-amber-400">
                  {t("noWebSearch")}
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] text-obsidian-on-surface-var/50">
              {t("localOnlyDesc")}
            </span>
          </div>
          <Switch
            checked={localOnlyMode}
            onCheckedChange={setLocalOnlyMode}
            className="data-[state=checked]:bg-obsidian-primary"
          />
        </div>
      </div>
    </div>
  );
}
