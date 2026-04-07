"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  getSystemPromptBody,
  getOutputGuidelinesPrompt,
} from "@/engine/research/prompts";
import type { PromptOverrideKey } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Prompt configuration — only static-text prompts are user-editable
// ---------------------------------------------------------------------------

interface PromptConfig {
  key: PromptOverrideKey;
  getDefault: () => string;
}

const PROMPT_CONFIGS: PromptConfig[] = [
  { key: "system", getDefault: getSystemPromptBody },
  { key: "outputGuidelines", getDefault: getOutputGuidelinesPrompt },
];

// ---------------------------------------------------------------------------
// Prompt editor — pre-filled with default text, editable by user
// ---------------------------------------------------------------------------

function PromptEditor({
  config,
  override,
  onSave,
  label,
}: {
  config: PromptConfig;
  override: string | undefined;
  onSave: (key: PromptOverrideKey, value: string | undefined) => void;
  label: string;
}) {
  const isOverride = override !== undefined && override !== "";
  const [value, setValue] = useState(override ?? config.getDefault());
  const [dirty, setDirty] = useState(false);

  // Sync from external reset (e.g. "Reset all" button)
  useEffect(() => {
    if (!override) {
      setValue(config.getDefault());
      setDirty(false);
    }
  }, [override, config]);

  const handleBlur = () => {
    setDirty(false);
    const trimmed = value.trim();
    if (!trimmed) {
      onSave(config.key, undefined);
      setValue(config.getDefault());
    } else {
      onSave(config.key, trimmed);
    }
  };

  const handleReset = () => {
    const defaultText = config.getDefault();
    setValue(defaultText);
    setDirty(false);
    onSave(config.key, undefined);
  };

  const rows = Math.max(8, Math.min(30, value.split("\n").length + 1));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {label}
        </label>
        {isOverride && (
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-[10px] uppercase tracking-widest text-obsidian-primary hover:text-obsidian-on-surface transition-colors"
          >
            Reset to default
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={handleBlur}
        rows={rows}
        className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 font-mono text-[11px] text-obsidian-on-surface focus:border-obsidian-primary focus:outline-none"
      />
    </div>
  );
}

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

      {/* Prompt editors — system + output guidelines */}
      <div className="space-y-4">
        {PROMPT_CONFIGS.map((config) => (
          <PromptEditor
            key={config.key}
            config={config}
            override={promptOverrides[config.key]}
            onSave={setPromptOverride}
            label={t("prompts." + config.key)}
          />
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
