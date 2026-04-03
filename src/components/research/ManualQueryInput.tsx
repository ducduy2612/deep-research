"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManualQueryInput() {
  const t = useTranslations("ManualQueryInput");
  const [inputValue, setInputValue] = useState("");

  const manualQueries = useResearchStore((s) => s.manualQueries);

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const current = useResearchStore.getState().manualQueries;
    useResearchStore.getState().setManualQueries([...current, trimmed]);
    setInputValue("");
  }, [inputValue]);

  const handleRemove = useCallback((idx: number) => {
    const current = useResearchStore.getState().manualQueries;
    useResearchStore
      .getState()
      .setManualQueries(current.filter((_, i) => i !== idx));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className={cn(
            "flex-1 rounded-lg bg-obsidian-surface-sheet px-3 py-2 text-sm text-obsidian-on-surface",
            "border border-obsidian-outline-ghost/20",
            "focus:ring-1 focus:ring-obsidian-primary/40 focus:outline-none",
            "placeholder:text-obsidian-on-surface-var/40",
          )}
          placeholder={t("placeholder")}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            "bg-obsidian-surface-raised text-obsidian-on-surface-var",
            "hover:bg-obsidian-surface-float hover:text-obsidian-on-surface",
            "active:scale-[0.98]",
            "disabled:opacity-40 disabled:pointer-events-none",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("add")}</span>
        </button>
      </div>

      {/* Pending query chips */}
      {manualQueries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {manualQueries.map((query, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full bg-obsidian-surface-raised px-3 py-1 text-xs text-obsidian-on-surface"
            >
              {query}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-obsidian-on-surface-var transition-colors hover:text-obsidian-error"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
