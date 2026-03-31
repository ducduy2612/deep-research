"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import type { ProviderId } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

const PROVIDER_IDS: {
  id: ProviderId;
  supportsBaseUrl: boolean;
}[] = [
  { id: "google", supportsBaseUrl: false },
  { id: "openai", supportsBaseUrl: true },
  { id: "deepseek", supportsBaseUrl: true },
  { id: "openrouter", supportsBaseUrl: false },
  { id: "groq", supportsBaseUrl: true },
  { id: "xai", supportsBaseUrl: true },
];

// ---------------------------------------------------------------------------
// Masked key display
// ---------------------------------------------------------------------------

function maskKey(key: string): string {
  if (key.length <= 6) return "••••••";
  return key.slice(0, 3) + "••••••" + key.slice(-3);
}

// ---------------------------------------------------------------------------
// Provider card
// ---------------------------------------------------------------------------

function ProviderCard({ provider }: { provider: (typeof PROVIDER_IDS)[number] }) {
  const t = useTranslations("AIModels");
  const storeProviders = useSettingsStore((s) => s.providers);
  const setProvider = useSettingsStore((s) => s.setProvider);
  const removeProvider = useSettingsStore((s) => s.removeProvider);

  const existing = storeProviders.find((p) => p.id === provider.id);
  const enabled = existing?.enabled ?? false;
  const hasKey = !!existing?.apiKey;

  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseURL ?? "");
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      setProvider({
        id: provider.id,
        apiKey: apiKey.trim(),
        baseURL: baseUrl.trim() || undefined,
        enabled,
      });
    }
  };

  const handleToggle = () => {
    if (!enabled && !apiKey.trim() && existing?.apiKey) {
      setProvider({ id: provider.id, apiKey: existing.apiKey, baseURL: existing.baseURL, enabled: true });
    } else if (!enabled && apiKey.trim()) {
      setProvider({ id: provider.id, apiKey: apiKey.trim(), baseURL: baseUrl.trim() || undefined, enabled: true });
    } else {
      setProvider({ id: provider.id, apiKey: existing?.apiKey ?? apiKey.trim(), baseURL: (existing?.baseURL ?? baseUrl.trim()) || undefined, enabled: false });
    }
  };

  const handleRemove = () => {
    removeProvider(provider.id);
    setApiKey("");
    setBaseUrl("");
  };

  return (
    <div className="rounded-lg border border-obsidian-surface-raised bg-obsidian-surface-sheet p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-obsidian-on-surface">
            {t(`providers.${provider.id}`)}
          </span>
          {hasKey && (
            <span className="rounded-full bg-obsidian-primary/20 px-2 py-0.5 font-mono text-[10px] text-obsidian-primary">
              {enabled ? t("active") : t("keySet")}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "h-5 w-9 rounded-full transition-colors",
            enabled ? "bg-obsidian-primary" : "bg-obsidian-surface-raised",
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* API Key */}
      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("apiKey")}
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? maskKey(existing!.apiKey) : "sk-..."}
            className="flex-1 rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="rounded-md border border-obsidian-surface-raised px-2 text-[10px] text-obsidian-on-surface-var hover:bg-obsidian-surface-raised"
          >
            {showKey ? t("hide") : t("show")}
          </button>
        </div>
      </div>

      {/* Base URL */}
      {provider.supportsBaseUrl && (
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("baseUrl")} <span className="normal-case tracking-normal">{t("baseUrlOptional")}</span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-obsidian-primary/20 px-3 py-1 text-[10px] font-medium text-obsidian-primary hover:bg-obsidian-primary/30"
        >
          {t("save")}
        </button>
        {hasKey && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md px-3 py-1 text-[10px] text-obsidian-on-surface-var hover:bg-obsidian-surface-raised"
          >
            {t("remove")}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab component
// ---------------------------------------------------------------------------

export function AIModelsTab() {
  const t = useTranslations("AIModels");

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
        {t("subtitle")}
      </p>
      <div className="grid gap-3">
        {PROVIDER_IDS.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </div>
  );
}
