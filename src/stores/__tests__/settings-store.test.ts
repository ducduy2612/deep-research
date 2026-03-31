/** Tests for useSettingsStore: state, hydrate, providers, search, reports, domains, citations, prompts, advanced, reset, selectors. */
import { describe, it, expect, beforeEach, vi } from "vitest";

const storage = new Map<string, unknown>();
vi.mock("@/lib/storage", () => ({
  get: vi.fn((k: string) => Promise.resolve(storage.get(k) ?? null)),
  set: vi.fn((k: string, v: unknown) => { storage.set(k, v); return Promise.resolve(); }),
  remove: vi.fn((k: string) => { storage.delete(k); return Promise.resolve(); }),
  clear: vi.fn(() => { storage.clear(); return Promise.resolve(); }),
}));

import { useSettingsStore, selectEnabledProviders, selectProviderEnabled, selectSearchProviderId } from "@/stores/settings-store";
const S = () => useSettingsStore.getState();

beforeEach(() => {
  storage.clear(); vi.clearAllMocks();
  useSettingsStore.setState({
    providers: [], searchProvider: null, reportStyle: "balanced", reportLength: "standard",
    language: "English", includeDomains: [], excludeDomains: [], citationImages: true,
    promptOverrides: {}, autoReviewRounds: 0, maxSearchQueries: 8, loaded: false,
  });
});

describe("initial state", () => {
  it("has correct defaults", () => {
    const s = S();
    expect(s.providers).toEqual([]);
    expect(s.searchProvider).toBeNull();
    expect(s.reportStyle).toBe("balanced");
    expect(s.reportLength).toBe("standard");
    expect(s.language).toBe("English");
    expect(s.includeDomains).toEqual([]);
    expect(s.excludeDomains).toEqual([]);
    expect(s.citationImages).toBe(true);
    expect(s.promptOverrides).toEqual({});
    expect(s.autoReviewRounds).toBe(0);
    expect(s.maxSearchQueries).toBe(8);
    expect(s.loaded).toBe(false);
  });
});

describe("hydrate", () => {
  it("loads from storage", async () => {
    storage.set("settings", {
      providers: [{ id: "google", apiKey: "test-key", enabled: true }],
      searchProvider: null, reportStyle: "executive", reportLength: "brief",
      language: "Japanese", includeDomains: ["example.com"], excludeDomains: ["spam.com"],
      citationImages: false, promptOverrides: { system: "Custom" }, autoReviewRounds: 3, maxSearchQueries: 12,
    });
    await S().hydrate();
    const s = S();
    expect(s.loaded).toBe(true);
    expect(s.providers).toHaveLength(1);
    expect(s.reportStyle).toBe("executive");
    expect(s.promptOverrides).toEqual({ system: "Custom" });
    expect(s.autoReviewRounds).toBe(3);
    expect(s.maxSearchQueries).toBe(12);
  });

  it("handles empty storage", async () => {
    await S().hydrate();
    expect(S().loaded).toBe(true);
  });

  it("handles corrupted data", async () => {
    storage.set("settings", { invalid: true });
    await S().hydrate();
    expect(S().loaded).toBe(true);
    expect(S().reportStyle).toBe("balanced");
  });
});

describe("provider management", () => {
  it("adds a provider", () => {
    S().setProvider({ id: "google", apiKey: "g-key", enabled: true });
    expect(S().providers).toHaveLength(1);
  });

  it("updates existing provider", () => {
    S().setProvider({ id: "google", apiKey: "key-1", enabled: true });
    S().setProvider({ id: "google", apiKey: "key-2", enabled: false });
    expect(S().providers).toHaveLength(1);
    expect(S().providers[0].apiKey).toBe("key-2");
  });

  it("manages multiple providers", () => {
    S().setProvider({ id: "google", apiKey: "g", enabled: true });
    S().setProvider({ id: "openai", apiKey: "o", enabled: true });
    expect(S().providers).toHaveLength(2);
  });

  it("removes a provider", () => {
    S().setProvider({ id: "google", apiKey: "g", enabled: true });
    S().removeProvider("google");
    expect(S().providers).toHaveLength(0);
  });

  it("persists on provider change", async () => {
    const { set } = await import("@/lib/storage");
    S().setProvider({ id: "openai", apiKey: "test", enabled: true });
    await vi.waitFor(() => expect(vi.mocked(set)).toHaveBeenCalled());
  });
});

describe("search provider", () => {
  it("sets search provider config", () => {
    S().setSearchProvider({ id: "tavily", apiKey: "t-key" });
    expect(S().searchProvider).toEqual({ id: "tavily", apiKey: "t-key" });
  });

  it("clears with null", () => {
    S().setSearchProvider({ id: "tavily", apiKey: "t-key" });
    S().setSearchProvider(null);
    expect(S().searchProvider).toBeNull();
  });
});

describe("report preferences", () => {
  it("sets report style", () => { S().setReportStyle("technical"); expect(S().reportStyle).toBe("technical"); });
  it("sets report length", () => { S().setReportLength("comprehensive"); expect(S().reportLength).toBe("comprehensive"); });
  it("sets language", () => { S().setLanguage("French"); expect(S().language).toBe("French"); });
});

describe("domain filters", () => {
  it("sets include", () => { S().setIncludeDomains(["a.com", "b.com"]); expect(S().includeDomains).toEqual(["a.com", "b.com"]); });
  it("sets exclude", () => { S().setExcludeDomains(["spam.com"]); expect(S().excludeDomains).toEqual(["spam.com"]); });
  it("sets both at once", () => {
    S().setDomainFilters(["good.com"], ["bad.com"]);
    expect(S().includeDomains).toEqual(["good.com"]);
    expect(S().excludeDomains).toEqual(["bad.com"]);
  });
});

describe("citation images", () => {
  it("toggles", () => {
    S().setCitationImages(false); expect(S().citationImages).toBe(false);
    S().setCitationImages(true); expect(S().citationImages).toBe(true);
  });
});

describe("prompt overrides", () => {
  it("has empty defaults", () => { expect(S().promptOverrides).toEqual({}); });

  it("sets all overrides", () => {
    S().setPromptOverrides({ system: "Custom", clarify: "Custom clarify" });
    expect(S().promptOverrides).toEqual({ system: "Custom", clarify: "Custom clarify" });
  });

  it("sets individual override", () => {
    S().setPromptOverride("system", "Custom system");
    expect(S().promptOverrides.system).toBe("Custom system");
  });

  it("removes with empty string", () => {
    S().setPromptOverride("system", "Custom");
    S().setPromptOverride("system", "");
    expect(S().promptOverrides.system).toBeUndefined();
  });

  it("removes with undefined", () => {
    S().setPromptOverride("system", "Custom");
    S().setPromptOverride("system", undefined);
    expect(S().promptOverrides.system).toBeUndefined();
  });

  it("persists via storage.set", async () => {
    const { set } = await import("@/lib/storage");
    S().setPromptOverrides({ plan: "Custom plan" });
    await vi.waitFor(() => expect(vi.mocked(set)).toHaveBeenCalled());
    const last = vi.mocked(set).mock.calls.at(-1);
    expect((last?.[1] as Record<string, unknown>)?.promptOverrides).toEqual({ plan: "Custom plan" });
  });
});

describe("advanced settings", () => {
  it("has correct defaults", () => { expect(S().autoReviewRounds).toBe(0); expect(S().maxSearchQueries).toBe(8); });
  it("sets autoReviewRounds", () => { S().setAutoReviewRounds(3); expect(S().autoReviewRounds).toBe(3); });
  it("sets maxSearchQueries", () => { S().setMaxSearchQueries(15); expect(S().maxSearchQueries).toBe(15); });

  it("persists new fields", async () => {
    const { set } = await import("@/lib/storage");
    S().setAutoReviewRounds(2); S().setMaxSearchQueries(20);
    await vi.waitFor(() => expect(vi.mocked(set)).toHaveBeenCalled());
    const last = vi.mocked(set).mock.calls.at(-1);
    const saved = last?.[1] as Record<string, unknown>;
    expect(saved.autoReviewRounds).toBe(2);
    expect(saved.maxSearchQueries).toBe(20);
  });

  it("resets new fields to defaults", async () => {
    S().setPromptOverrides({ plan: "test" }); S().setAutoReviewRounds(5); S().setMaxSearchQueries(30);
    await S().reset();
    const s = S();
    expect(s.promptOverrides).toEqual({});
    expect(s.autoReviewRounds).toBe(0);
    expect(s.maxSearchQueries).toBe(8);
  });
});

describe("reset", () => {
  it("resets all to defaults", async () => {
    S().setReportStyle("technical");
    S().setProvider({ id: "google", apiKey: "test", enabled: true });
    await S().reset();
    expect(S().providers).toEqual([]);
    expect(S().reportStyle).toBe("balanced");
    expect(S().loaded).toBe(true);
  });
});

describe("selectors", () => {
  it("selectEnabledProviders filters enabled+keyed", () => {
    S().setProvider({ id: "google", apiKey: "g-key", enabled: true });
    S().setProvider({ id: "openai", apiKey: "", enabled: true });
    S().setProvider({ id: "deepseek", apiKey: "d-key", enabled: false });
    const enabled = selectEnabledProviders(S());
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("google");
  });

  it("selectProviderEnabled checks specific", () => {
    S().setProvider({ id: "google", apiKey: "g-key", enabled: true });
    expect(selectProviderEnabled("google")(S())).toBe(true);
    expect(selectProviderEnabled("openai")(S())).toBe(false);
  });

  it("selectSearchProviderId returns id or null", () => {
    expect(selectSearchProviderId(S())).toBeNull();
    S().setSearchProvider({ id: "tavily", apiKey: "key" });
    expect(selectSearchProviderId(S())).toBe("tavily");
  });
});
