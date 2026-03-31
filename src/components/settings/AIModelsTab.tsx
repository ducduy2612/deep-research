"use client";

import { useState } from "react";
import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import type { ProviderId } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

const PROVIDERS: {
  id: ProviderId;
  name: string;
  supportsBaseUrl: boolean;
}[] = [
  { id: "google", name: "Google Gemini", supportsBaseUrl: false },
  { id: "openai", name: "OpenAI", supportsBaseUrl: true },
  { id: "deepseek", name: "DeepSeek", supportsBaseUrl: true },
  { id: "openrouter", name: "OpenRouter", supportsBaseUrl: false },
  { id: "groq", name: "Groq", supportsBaseUrl: true },
  { id: "xai", name: "xAI (Grok)", supportsBaseUrl: true },
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

function ProviderCard({ provider }: { provider: (typeof PROVIDERS)[number] }) {
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
            {provider.name}
          </span>
          {hasKey && (
            <span className="rounded-full bg-obsidian-primary/20 px-2 py-0.5 font-mono text-[10px] text-obsidian-primary">
              {enabled ? "active" : "key set"}
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
          API Key
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
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Base URL */}
      {provider.supportsBaseUrl && (
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            Base URL <span className="normal-case tracking-normal">(optional)</span>
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
          Save
        </button>
        {hasKey && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md px-3 py-1 text-[10px] text-obsidian-on-surface-var hover:bg-obsidian-surface-raised"
          >
            Remove
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
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
        Configure AI model providers and API keys
      </p>
      <div className="grid gap-3">
        {PROVIDERS.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </div>
  );
}
