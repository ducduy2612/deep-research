/**
 * Zustand store for application settings — persisted via localforage.
 *
 * Holds: provider API keys (not full ProviderConfig objects — those are
 * built server-side from env vars), search provider config, report
 * preferences, and domain filters. Uses the storage layer in src/lib/storage
 * for async load/save with Zod validation.
 */

import { create } from "zustand";

import type {
  SearchProviderConfig,
} from "@/engine/search/types";
import type {
  ReportStyle,
  ReportLength,
} from "@/engine/research/types";
import type { PromptOverrideKey } from "@/engine/research/types";
import type { ProviderId } from "@/engine/provider/types";
import * as storage from "@/lib/storage";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Provider key config (stored client-side, sent to server)
// ---------------------------------------------------------------------------

export interface ProviderKeyConfig {
  readonly id: ProviderId;
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly enabled: boolean;
}

// ---------------------------------------------------------------------------
// Settings state
// ---------------------------------------------------------------------------

export interface SettingsStoreState {
  // AI provider API keys
  readonly providers: readonly ProviderKeyConfig[];

  // Search provider
  readonly searchProvider: SearchProviderConfig | null;

  // Report preferences
  readonly reportStyle: ReportStyle;
  readonly reportLength: ReportLength;
  readonly language: string;

  // Domain filters
  readonly includeDomains: readonly string[];
  readonly excludeDomains: readonly string[];

  // Citation images
  readonly citationImages: boolean;

  // Prompt overrides
  readonly promptOverrides: Partial<Record<PromptOverrideKey, string>>;

  // Advanced settings
  readonly autoReviewRounds: number;
  readonly maxSearchQueries: number;

  // Hydration state
  readonly loaded: boolean;
}

export interface SettingsStoreActions {
  /** Load settings from localforage (call once at app startup). */
  hydrate: () => Promise<void>;

  // Provider keys
  setProvider: (config: ProviderKeyConfig) => void;
  removeProvider: (id: ProviderId) => void;

  // Search provider
  setSearchProvider: (config: SearchProviderConfig | null) => void;

  // Report preferences
  setReportStyle: (style: ReportStyle) => void;
  setReportLength: (length: ReportLength) => void;
  setLanguage: (language: string) => void;

  // Domain filters
  setIncludeDomains: (domains: string[]) => void;
  setExcludeDomains: (domains: string[]) => void;
  setDomainFilters: (include: string[], exclude: string[]) => void;

  // Citation images
  setCitationImages: (enabled: boolean) => void;

  // Prompt overrides
  setPromptOverrides: (overrides: Partial<Record<PromptOverrideKey, string>>) => void;
  setPromptOverride: (key: PromptOverrideKey, value: string | undefined) => void;

  // Advanced settings
  setAutoReviewRounds: (rounds: number) => void;
  setMaxSearchQueries: (max: number) => void;

  /** Reset all settings to defaults. */
  reset: () => Promise<void>;
}

export type SettingsStore = SettingsStoreState & SettingsStoreActions;

// ---------------------------------------------------------------------------
// Persistence schemas
// ---------------------------------------------------------------------------

const providerKeySchema = z.object({
  id: z.enum(["google", "openai", "deepseek", "openrouter", "groq", "xai"]),
  apiKey: z.string().min(1),
  baseURL: z.string().optional(),
  enabled: z.boolean(),
});

const settingsSchema = z.object({
  providers: z.array(providerKeySchema),
  searchProvider: z
    .object({
      id: z.enum([
        "tavily",
        "firecrawl",
        "exa",
        "brave",
        "searxng",
        "model-native",
      ]),
      apiKey: z.string().optional(),
      baseURL: z.string().optional(),
      scope: z.string().optional(),
      maxResults: z.number().int().min(1).optional(),
    })
    .nullable(),
  reportStyle: z.enum(["balanced", "executive", "technical", "concise"]),
  reportLength: z.enum(["brief", "standard", "comprehensive"]),
  language: z.string(),
  includeDomains: z.array(z.string()),
  excludeDomains: z.array(z.string()),
  citationImages: z.boolean(),
  promptOverrides: z.record(z.string(), z.string()).optional().default({}),
  autoReviewRounds: z.number().int().min(0).max(5).optional().default(0),
  maxSearchQueries: z.number().int().min(1).max(30).optional().default(8),
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const STORAGE_KEY = "settings";

const DEFAULT_STATE: SettingsStoreState = {
  providers: [],
  searchProvider: null,
  reportStyle: "balanced",
  reportLength: "standard",
  language: "English",
  includeDomains: [],
  excludeDomains: [],
  citationImages: true,
  promptOverrides: {},
  autoReviewRounds: 0,
  maxSearchQueries: 8,
  loaded: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ...DEFAULT_STATE,

  hydrate: async () => {
    const saved = await storage.get(STORAGE_KEY, settingsSchema);
    if (saved) {
      set({ ...saved, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  setProvider: (config: ProviderKeyConfig) => {
    set((s) => {
      const existing = s.providers.filter((p) => p.id !== config.id);
      return { providers: [...existing, config] };
    });
    persistSettings(get());
  },

  removeProvider: (id: ProviderId) => {
    set((s) => ({
      providers: s.providers.filter((p) => p.id !== id),
    }));
    persistSettings(get());
  },

  setSearchProvider: (config: SearchProviderConfig | null) => {
    set({ searchProvider: config });
    persistSettings(get());
  },

  setReportStyle: (style: ReportStyle) => {
    set({ reportStyle: style });
    persistSettings(get());
  },

  setReportLength: (length: ReportLength) => {
    set({ reportLength: length });
    persistSettings(get());
  },

  setLanguage: (language: string) => {
    set({ language });
    persistSettings(get());
  },

  setIncludeDomains: (domains: string[]) => {
    set({ includeDomains: domains });
    persistSettings(get());
  },

  setExcludeDomains: (domains: string[]) => {
    set({ excludeDomains: domains });
    persistSettings(get());
  },

  setDomainFilters: (include: string[], exclude: string[]) => {
    set({ includeDomains: include, excludeDomains: exclude });
    persistSettings(get());
  },

  setCitationImages: (enabled: boolean) => {
    set({ citationImages: enabled });
    persistSettings(get());
  },

  setPromptOverrides: (overrides: Partial<Record<PromptOverrideKey, string>>) => {
    set({ promptOverrides: overrides });
    persistSettings(get());
  },

  setPromptOverride: (key: PromptOverrideKey, value: string | undefined) => {
    set((s) => {
      const next = { ...s.promptOverrides };
      if (value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return { promptOverrides: next };
    });
    persistSettings(get());
  },

  setAutoReviewRounds: (rounds: number) => {
    set({ autoReviewRounds: rounds });
    persistSettings(get());
  },

  setMaxSearchQueries: (max: number) => {
    set({ maxSearchQueries: max });
    persistSettings(get());
  },

  reset: async () => {
    await storage.remove(STORAGE_KEY);
    set({ ...DEFAULT_STATE, loaded: true });
  },
}));

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

function persistSettings(state: SettingsStoreState): void {
  // Fire-and-forget — localforage is async but we don't want to block
  const toSave = {
    providers: state.providers,
    searchProvider: state.searchProvider,
    reportStyle: state.reportStyle,
    reportLength: state.reportLength,
    language: state.language,
    includeDomains: state.includeDomains,
    excludeDomains: state.excludeDomains,
    citationImages: state.citationImages,
    promptOverrides: state.promptOverrides,
    autoReviewRounds: state.autoReviewRounds,
    maxSearchQueries: state.maxSearchQueries,
  };
  storage.set(STORAGE_KEY, toSave, settingsSchema).catch(() => {
    // Silently ignore persistence failures — settings still work in-memory
  });
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Get only enabled providers with API keys. */
export const selectEnabledProviders = (
  s: SettingsStoreState,
): readonly ProviderKeyConfig[] => s.providers.filter((p) => p.enabled && p.apiKey);

/** Check if a specific provider is configured and enabled. */
export const selectProviderEnabled = (
  id: ProviderId,
) => (s: SettingsStoreState): boolean =>
  s.providers.some((p) => p.id === id && p.enabled && !!p.apiKey);

/** Get the search provider ID or null. */
export const selectSearchProviderId = (
  s: SettingsStoreState,
): string | null => s.searchProvider?.id ?? null;
