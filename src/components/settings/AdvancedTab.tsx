"use client";

import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/stores/settings-store";
import type { PromptOverrideKey } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Prompt override keys
// ---------------------------------------------------------------------------

const PROMPT_KEYS: PromptOverrideKey[] = [
  "system",
  "clarify",
  "plan",
  "serpQueries",
  "analyze",
  "analyzeWithContent",
  "review",
  "report",
  "outputGuidelines",
];

// ---------------------------------------------------------------------------
// Tab component
// ---------------------------------------------------------------------------

export function AdvancedTab() {
  const t = useTranslations("Advanced");
  const promptOverrides = useSettingsStore((s) => s.promptOverrides);
  const setPromptOverride = useSettingsStore((s) => s.setPromptOverride);
  const reset = useSettingsStore((s) => s.reset);

  return (
    <div className="space-y-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
        {t("description")}
      </p>

      {/* Prompt override textareas */}
      <div className="space-y-4">
        {PROMPT_KEYS.map((key) => (
          <div key={key}>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
              {t(`prompts.${key}`)}
            </label>
            <textarea
              defaultValue={promptOverrides[key] ?? ""}
              onBlur={(e) => setPromptOverride(key, e.target.value || undefined)}
              placeholder={`Custom ${t(`prompts.${key}`).toLowerCase()} prompt...`}
              rows={3}
              className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 font-mono text-[11px] text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Reset all */}
      <div className="border-t border-obsidian-surface-raised pt-4">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
        >
          {t("resetAll")}
        </button>
        <p className="mt-1 font-mono text-[10px] text-obsidian-on-surface-var/50">
          {t("resetDesc")}
        </p>
      </div>
    </div>
  );
}
