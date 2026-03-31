/**
 * Tests for useSettingsStore.
 *
 * Validates: initial state, hydrate from storage, provider management,
 * report preferences, domain filters, persistence, reset, and selectors.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock localforage
// ---------------------------------------------------------------------------

const storage = new Map<string, unknown>();

vi.mock("@/lib/storage", () => ({
  get: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
  set: vi.fn((key: string, value: unknown) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  remove: vi.fn((key: string) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
}));

import { useSettingsStore } from "@/stores/settings-store";
import {
  selectEnabledProviders,
  selectProviderEnabled,
  selectSearchProviderId,
} from "@/stores/settings-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  // Reset store to defaults
  useSettingsStore.setState({
    providers: [],
    searchProvider: null,
    reportStyle: "balanced",
    reportLength: "standard",
    language: "English",
    includeDomains: [],
    excludeDomains: [],
    citationImages: true,
    loaded: false,
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("useSettingsStore — initial state", () => {
  it("has correct defaults", () => {
    const s = useSettingsStore.getState();
    expect(s.providers).toEqual([]);
    expect(s.searchProvider).toBeNull();
    expect(s.reportStyle).toBe("balanced");
    expect(s.reportLength).toBe("standard");
    expect(s.language).toBe("English");
    expect(s.includeDomains).toEqual([]);
    expect(s.excludeDomains).toEqual([]);
    expect(s.citationImages).toBe(true);
    expect(s.loaded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hydrate
// ---------------------------------------------------------------------------

describe("useSettingsStore — hydrate", () => {
  it("loads settings from storage", async () => {
    storage.set("settings", {
      providers: [
        { id: "google", apiKey: "test-key", enabled: true },
      ],
      searchProvider: null,
      reportStyle: "executive",
      reportLength: "brief",
      language: "Japanese",
      includeDomains: ["example.com"],
      excludeDomains: ["spam.com"],
      citationImages: false,
    });

    await useSettingsStore.getState().hydrate();
    const s = useSettingsStore.getState();

    expect(s.loaded).toBe(true);
    expect(s.providers).toHaveLength(1);
    expect(s.providers[0].id).toBe("google");
    expect(s.reportStyle).toBe("executive");
    expect(s.reportLength).toBe("brief");
    expect(s.language).toBe("Japanese");
    expect(s.includeDomains).toEqual(["example.com"]);
    expect(s.excludeDomains).toEqual(["spam.com"]);
    expect(s.citationImages).toBe(false);
  });

  it("handles empty storage gracefully", async () => {
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(useSettingsStore.getState().providers).toEqual([]);
  });

  it("handles corrupted storage data", async () => {
    storage.set("settings", { invalid: true });
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().loaded).toBe(true);
    // Falls back to defaults
    expect(useSettingsStore.getState().reportStyle).toBe("balanced");
  });
});

// ---------------------------------------------------------------------------
// Provider management
// ---------------------------------------------------------------------------

describe("useSettingsStore — provider management", () => {
  it("adds a provider", () => {
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "g-key",
      enabled: true,
    });
    expect(useSettingsStore.getState().providers).toHaveLength(1);
    expect(useSettingsStore.getState().providers[0].apiKey).toBe("g-key");
  });

  it("updates existing provider by id", () => {
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "key-1",
      enabled: true,
    });
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "key-2",
      enabled: false,
    });

    const providers = useSettingsStore.getState().providers;
    expect(providers).toHaveLength(1);
    expect(providers[0].apiKey).toBe("key-2");
    expect(providers[0].enabled).toBe(false);
  });

  it("manages multiple providers", () => {
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "g-key",
      enabled: true,
    });
    useSettingsStore.getState().setProvider({
      id: "openai",
      apiKey: "o-key",
      enabled: true,
    });

    expect(useSettingsStore.getState().providers).toHaveLength(2);
  });

  it("removes a provider", () => {
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "g-key",
      enabled: true,
    });
    useSettingsStore.getState().removeProvider("google");
    expect(useSettingsStore.getState().providers).toHaveLength(0);
  });

  it("persists on provider change", async () => {
    const { set } = await import("@/lib/storage");
    useSettingsStore.getState().setProvider({
      id: "openai",
      apiKey: "test",
      enabled: true,
    });
    // Allow fire-and-forget persist to run
    await vi.waitFor(() => {
      expect(vi.mocked(set)).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Search provider
// ---------------------------------------------------------------------------

describe("useSettingsStore — search provider", () => {
  it("sets search provider config", () => {
    useSettingsStore.getState().setSearchProvider({
      id: "tavily",
      apiKey: "t-key",
    });
    expect(useSettingsStore.getState().searchProvider).toEqual({
      id: "tavily",
      apiKey: "t-key",
    });
  });

  it("clears search provider with null", () => {
    useSettingsStore.getState().setSearchProvider({
      id: "tavily",
      apiKey: "t-key",
    });
    useSettingsStore.getState().setSearchProvider(null);
    expect(useSettingsStore.getState().searchProvider).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Report preferences
// ---------------------------------------------------------------------------

describe("useSettingsStore — report preferences", () => {
  it("sets report style", () => {
    useSettingsStore.getState().setReportStyle("technical");
    expect(useSettingsStore.getState().reportStyle).toBe("technical");
  });

  it("sets report length", () => {
    useSettingsStore.getState().setReportLength("comprehensive");
    expect(useSettingsStore.getState().reportLength).toBe("comprehensive");
  });

  it("sets language", () => {
    useSettingsStore.getState().setLanguage("French");
    expect(useSettingsStore.getState().language).toBe("French");
  });
});

// ---------------------------------------------------------------------------
// Domain filters
// ---------------------------------------------------------------------------

describe("useSettingsStore — domain filters", () => {
  it("sets include domains", () => {
    useSettingsStore.getState().setIncludeDomains(["a.com", "b.com"]);
    expect(useSettingsStore.getState().includeDomains).toEqual([
      "a.com",
      "b.com",
    ]);
  });

  it("sets exclude domains", () => {
    useSettingsStore.getState().setExcludeDomains(["spam.com"]);
    expect(useSettingsStore.getState().excludeDomains).toEqual(["spam.com"]);
  });

  it("sets both domain filters at once", () => {
    useSettingsStore.getState().setDomainFilters(
      ["good.com"],
      ["bad.com"],
    );
    const s = useSettingsStore.getState();
    expect(s.includeDomains).toEqual(["good.com"]);
    expect(s.excludeDomains).toEqual(["bad.com"]);
  });
});

// ---------------------------------------------------------------------------
// Citation images
// ---------------------------------------------------------------------------

describe("useSettingsStore — citation images", () => {
  it("toggles citation images", () => {
    useSettingsStore.getState().setCitationImages(false);
    expect(useSettingsStore.getState().citationImages).toBe(false);
    useSettingsStore.getState().setCitationImages(true);
    expect(useSettingsStore.getState().citationImages).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("useSettingsStore — reset", () => {
  it("resets all settings to defaults", async () => {
    useSettingsStore.getState().setReportStyle("technical");
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "test",
      enabled: true,
    });

    await useSettingsStore.getState().reset();

    const s = useSettingsStore.getState();
    expect(s.providers).toEqual([]);
    expect(s.reportStyle).toBe("balanced");
    expect(s.loaded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe("useSettingsStore — selectors", () => {
  it("selectEnabledProviders filters to enabled+keyed", () => {
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "g-key",
      enabled: true,
    });
    useSettingsStore.getState().setProvider({
      id: "openai",
      apiKey: "",
      enabled: true,
    });
    useSettingsStore.getState().setProvider({
      id: "deepseek",
      apiKey: "d-key",
      enabled: false,
    });

    const enabled = selectEnabledProviders(useSettingsStore.getState());
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("google");
  });

  it("selectProviderEnabled checks specific provider", () => {
    useSettingsStore.getState().setProvider({
      id: "google",
      apiKey: "g-key",
      enabled: true,
    });
    expect(
      selectProviderEnabled("google")(useSettingsStore.getState()),
    ).toBe(true);
    expect(
      selectProviderEnabled("openai")(useSettingsStore.getState()),
    ).toBe(false);
  });

  it("selectSearchProviderId returns id or null", () => {
    expect(selectSearchProviderId(useSettingsStore.getState())).toBeNull();

    useSettingsStore.getState().setSearchProvider({
      id: "tavily",
      apiKey: "key",
    });
    expect(selectSearchProviderId(useSettingsStore.getState())).toBe("tavily");
  });
});
