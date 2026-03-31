"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/utils/style";
import { useSettingsStore } from "@/stores/settings-store";
import type { SearchProviderId } from "@/engine/search/types";

// ---------------------------------------------------------------------------
// Search provider options
// ---------------------------------------------------------------------------

const SEARCH_PROVIDER_IDS: { id: SearchProviderId; needsApiKey: boolean; needsBaseUrl: boolean }[] = [
  { id: "tavily", needsApiKey: true, needsBaseUrl: false },
  { id: "firecrawl", needsApiKey: true, needsBaseUrl: false },
  { id: "exa", needsApiKey: true, needsBaseUrl: false },
  { id: "brave", needsApiKey: true, needsBaseUrl: false },
  { id: "searxng", needsApiKey: false, needsBaseUrl: true },
  { id: "model-native", needsApiKey: false, needsBaseUrl: false },
];

// ---------------------------------------------------------------------------
// Helper: array ↔ textarea conversion
// ---------------------------------------------------------------------------

function domainsToText(domains: readonly string[]): string {
  return domains.join("\n");
}

function textToDomains(text: string): string[] {
  return text
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tab component
// ---------------------------------------------------------------------------

export function SearchTab() {
  const t = useTranslations("SearchTab");
  const searchProvider = useSettingsStore((s) => s.searchProvider);
  const setSearchProvider = useSettingsStore((s) => s.setSearchProvider);
  const includeDomains = useSettingsStore((s) => s.includeDomains);
  const excludeDomains = useSettingsStore((s) => s.excludeDomains);
  const setDomainFilters = useSettingsStore((s) => s.setDomainFilters);
  const citationImages = useSettingsStore((s) => s.citationImages);
  const setCitationImages = useSettingsStore((s) => s.setCitationImages);

  const currentId = searchProvider?.id ?? "tavily";
  const providerDef = SEARCH_PROVIDER_IDS.find((p) => p.id === currentId)!;

  const updateProvider = (partial: Record<string, unknown>) => {
    setSearchProvider({
      id: currentId,
      apiKey: searchProvider?.apiKey,
      baseURL: searchProvider?.baseURL,
      scope: searchProvider?.scope,
      maxResults: searchProvider?.maxResults,
      ...partial,
    });
  };

  return (
    <div className="space-y-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
        {t("subtitle")}
      </p>

      {/* Provider selector */}
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
          {t("provider")}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {SEARCH_PROVIDER_IDS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                setSearchProvider({
                  id: p.id,
                  apiKey: p.needsApiKey ? searchProvider?.apiKey : undefined,
                  baseURL: p.needsBaseUrl ? searchProvider?.baseURL : undefined,
                })
              }
              className={cn(
                "rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                p.id === currentId
                  ? "border-l-2 border-obsidian-primary bg-obsidian-surface-raised text-obsidian-on-surface"
                  : "border-l-2 border-transparent text-obsidian-on-surface-var hover:bg-obsidian-surface-sheet",
              )}
            >
              {t(`providers.${p.id}`)}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      {providerDef.needsApiKey && (
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("apiKey")}
          </label>
          <input
            type="password"
            value={searchProvider?.apiKey ?? ""}
            onChange={(e) => updateProvider({ apiKey: e.target.value })}
            placeholder="Enter API key..."
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
        </div>
      )}

      {/* Base URL */}
      {providerDef.needsBaseUrl && (
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("baseUrl")}
          </label>
          <input
            type="text"
            value={searchProvider?.baseURL ?? ""}
            onChange={(e) => updateProvider({ baseURL: e.target.value })}
            placeholder="http://localhost:8080"
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
        </div>
      )}

      {/* Scope & Max Results */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("scope")}
          </label>
          <input
            type="text"
            value={searchProvider?.scope ?? ""}
            onChange={(e) => updateProvider({ scope: e.target.value })}
            placeholder="general"
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("maxResults")}
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={searchProvider?.maxResults ?? 10}
            onChange={(e) => updateProvider({ maxResults: parseInt(e.target.value, 10) || 10 })}
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 text-xs text-obsidian-on-surface focus:border-obsidian-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Domain filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("includeDomains")}
          </label>
          <textarea
            value={domainsToText(includeDomains)}
            onChange={(e) => setDomainFilters(textToDomains(e.target.value), excludeDomains as string[])}
            placeholder="example.com&#10;wikipedia.org"
            rows={4}
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 font-mono text-[11px] text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var">
            {t("excludeDomains")}
          </label>
          <textarea
            value={domainsToText(excludeDomains)}
            onChange={(e) => setDomainFilters(includeDomains as string[], textToDomains(e.target.value))}
            placeholder="spam.com&#10;ads.net"
            rows={4}
            className="w-full rounded-md border border-obsidian-surface-raised bg-obsidian-surface-well px-3 py-1.5 font-mono text-[11px] text-obsidian-on-surface placeholder:text-obsidian-on-surface-var/40 focus:border-obsidian-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Citation images toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-obsidian-on-surface">
            {t("citationImages")}
          </span>
          <p className="font-mono text-[10px] text-obsidian-on-surface-var/50">
            {t("citationImagesDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCitationImages(!citationImages)}
          className={cn(
            "h-5 w-9 rounded-full transition-colors",
            citationImages ? "bg-obsidian-primary" : "bg-obsidian-surface-raised",
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full bg-white shadow transition-transform",
              citationImages ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
