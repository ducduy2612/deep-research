"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import type { ReportStyle, ReportLength } from "@/engine/research/types";

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
  const t = useTranslations("General");

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
  const proxyMode = useSettingsStore((s) => s.proxyMode);
  const setProxyMode = useSettingsStore((s) => s.setProxyMode);
  const accessPassword = useSettingsStore((s) => s.accessPassword);
  const setAccessPassword = useSettingsStore((s) => s.setAccessPassword);
  const uiLocale = useSettingsStore((s) => s.uiLocale);
  const setUiLocale = useSettingsStore((s) => s.setUiLocale);

  const STYLE_OPTIONS: { value: ReportStyle; label: string; desc: string }[] = [
    { value: "balanced", label: t("balanced"), desc: t("balancedDesc") },
    { value: "executive", label: t("executive"), desc: t("executiveDesc") },
    { value: "technical", label: t("technical"), desc: t("technicalDesc") },
    { value: "concise", label: t("concise"), desc: t("conciseDesc") },
  ];

  const LENGTH_OPTIONS: { value: ReportLength; label: string; desc: string }[] = [
    { value: "brief", label: t("brief"), desc: t("briefDesc") },
    { value: "standard", label: t("standard"), desc: t("standardDesc") },
    { value: "comprehensive", label: t("comprehensive"), desc: t("comprehensiveDesc") },
  ];

  return (
    <div className="space-y-6">
      {/* Connection / API Key Configuration */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("connection")}
        </h4>
        <div className="space-y-3 rounded-lg border border-obsidian-outline-ghost/20 bg-obsidian-surface-deck p-3">
          {/* Server-Side Keys option */}
          <button
            type="button"
            onClick={() => setProxyMode(true)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              proxyMode
                ? "border border-obsidian-primary/40 bg-obsidian-surface-raised"
                : "border border-transparent hover:bg-obsidian-surface-sheet",
            )}
          >
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  proxyMode ? "bg-obsidian-primary" : "border border-obsidian-on-surface-var/30",
                )}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-obsidian-on-surface">
                {t("connectionServerTitle")}
              </span>
              <span className="text-[10px] text-obsidian-on-surface-var/50">
                {t("connectionServerDesc")}
              </span>
            </div>
          </button>

          {/* Client-Side Keys / BYOK option */}
          <button
            type="button"
            onClick={() => setProxyMode(false)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              !proxyMode
                ? "border border-obsidian-primary/40 bg-obsidian-surface-raised"
                : "border border-transparent hover:bg-obsidian-surface-sheet",
            )}
          >
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  !proxyMode ? "bg-obsidian-primary" : "border border-obsidian-on-surface-var/30",
                )}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-obsidian-on-surface">
                {t("connectionClientTitle")}
                <span className="ml-1.5 rounded bg-obsidian-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase text-obsidian-primary">
                  BYOK
                </span>
              </span>
              <span className="text-[10px] text-obsidian-on-surface-var/50">
                {t("connectionClientDesc")}
              </span>
            </div>
          </button>

          {/* Access password (visible when server-side keys selected) */}
          {proxyMode && (
            <div className="pt-1">
              <label className="mb-1 block font-mono text-[10px] text-obsidian-on-surface-var/60">
                {t("accessPassword")}
              </label>
              <input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder={t("accessPasswordPlaceholder")}
                className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-obsidian-on-surface-var/40">
                {t("accessPasswordHint")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Report Language */}
      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("reportLanguage")}
        </label>
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="English"
          className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
        />
      </div>

      {/* UI Language */}
      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("uiLanguage")}
        </label>
        <select
          value={uiLocale}
          onChange={(e) => setUiLocale(e.target.value)}
          className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface focus:border-obsidian-primary focus:outline-none"
        >
          <option value="en">{t("uiLanguageEn")}</option>
          <option value="vi">{t("uiLanguageVi")}</option>
        </select>
      </div>

      {/* Report style */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("style")}
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
          {t("length")}
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
            {t("autoReview")}
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
            {t("maxSearch")}
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
