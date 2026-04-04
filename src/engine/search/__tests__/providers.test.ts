import { describe, it, expect, vi, beforeEach } from "vitest";
import { TavilyProvider } from "../providers/tavily";
import { FirecrawlProvider } from "../providers/firecrawl";
import { ExaProvider } from "../providers/exa";
import { BraveProvider } from "../providers/brave";
import { SearXNGProvider } from "../providers/searxng";
import type { SearchProviderConfig } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOnce(body: unknown, status = 200): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function config(
  overrides: Partial<SearchProviderConfig> = {},
): SearchProviderConfig {
  return {
    id: overrides.id ?? "tavily",
    apiKey: overrides.apiKey ?? "test-key",
    baseURL: overrides.baseURL,
    scope: overrides.scope,
    maxResults: overrides.maxResults,
  };
}

// ---------------------------------------------------------------------------
// Tavily
// ---------------------------------------------------------------------------

describe("TavilyProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct URL, headers, and body", async () => {
    mockFetchOnce({
      results: [
        { title: "T1", url: "https://example.com", content: "C1", rawContent: "RC1", score: 0.9, publishedDate: "" },
      ],
      images: ["https://img.example.com/1.jpg"],
    });

    const provider = new TavilyProvider(config({ id: "tavily" }));
    const result = await provider.search("test query");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.tavily.com/search");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer test-key",
    });

    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("test query");
    expect(body.search_depth).toBe("advanced");
    expect(body.include_images).toBe(true);
    expect(body.include_raw_content).toBe("markdown");

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({ title: "T1", url: "https://example.com", content: "RC1" });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toEqual({ url: "https://img.example.com/1.jpg" });
  });

  it("uses custom baseURL when provided", async () => {
    mockFetchOnce({ results: [], images: [] });

    const provider = new TavilyProvider(config({ id: "tavily", baseURL: "https://custom.tavily.io" }));
    await provider.search("q");

    const url = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(url).toBe("https://custom.tavily.io/search");
  });

  it("passes abort signal to fetch", async () => {
    mockFetchOnce({ results: [], images: [] });

    const controller = new AbortController();
    const provider = new TavilyProvider(config({ id: "tavily" }));
    await provider.search("q", { abortSignal: controller.signal });

    const init = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });

  it("handles empty results gracefully", async () => {
    mockFetchOnce({});

    const provider = new TavilyProvider(config({ id: "tavily" }));
    const result = await provider.search("q");

    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("handles malformed response (missing fields) without crash", async () => {
    mockFetchOnce({
      results: [
        { title: "T1" }, // missing url and content
        { url: "https://example.com" }, // missing content
        { title: "T3", url: "https://ok.com", content: "C3" },
      ],
    });

    const provider = new TavilyProvider(config({ id: "tavily" }));
    const result = await provider.search("q");

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].title).toBe("T3");
  });

  it("passes scope parameter in body", async () => {
    mockFetchOnce({ results: [], images: [] });

    const provider = new TavilyProvider(config({ id: "tavily" }));
    await provider.search("q", { scope: "news" });

    const init = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.topic).toBe("news");
  });
});

// ---------------------------------------------------------------------------
// Firecrawl
// ---------------------------------------------------------------------------

describe("FirecrawlProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct URL, headers, and body", async () => {
    mockFetchOnce({
      data: [
        { url: "https://example.com", title: "T1", description: "D1", markdown: "# H1" },
      ],
    });

    const provider = new FirecrawlProvider(config({ id: "firecrawl" }));
    const result = await provider.search("test query");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.firecrawl.dev/v1/search");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
    });

    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("test query");
    expect(body.limit).toBe(5);
    expect(body.scrapeOptions.formats).toContain("markdown");
    expect(body.timeout).toBe(60000);

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({ title: "T1", url: "https://example.com", content: "# H1" });
    expect(result.images).toEqual([]);
  });

  it("uses custom baseURL when provided", async () => {
    mockFetchOnce({ data: [] });

    const provider = new FirecrawlProvider(config({ id: "firecrawl", baseURL: "https://custom.firecrawl.io" }));
    await provider.search("q");

    const url = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(url).toBe("https://custom.firecrawl.io/v1/search");
  });

  it("passes abort signal to fetch", async () => {
    mockFetchOnce({ data: [] });

    const controller = new AbortController();
    const provider = new FirecrawlProvider(config({ id: "firecrawl" }));
    await provider.search("q", { abortSignal: controller.signal });

    const init = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });

  it("handles empty results gracefully", async () => {
    mockFetchOnce({});

    const provider = new FirecrawlProvider(config({ id: "firecrawl" }));
    const result = await provider.search("q");

    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("handles malformed response without crash", async () => {
    mockFetchOnce({
      data: [
        { title: "T1" }, // missing url and description
        { url: "https://ok.com", description: "D" }, // valid
      ],
    });

    const provider = new FirecrawlProvider(config({ id: "firecrawl" }));
    const result = await provider.search("q");

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://ok.com");
  });

  it("always returns empty images array", async () => {
    mockFetchOnce({
      data: [{ url: "https://example.com", title: "T1", description: "D1" }],
    });

    const provider = new FirecrawlProvider(config({ id: "firecrawl" }));
    const result = await provider.search("q");

    expect(result.images).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Exa
// ---------------------------------------------------------------------------

describe("ExaProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct URL, headers, and body", async () => {
    mockFetchOnce({
      results: [
        {
          title: "T1",
          url: "https://example.com",
          summary: "S1",
          text: "Full text",
          extras: { imageLinks: ["https://img.example.com/1.jpg"] },
        },
      ],
    });

    const provider = new ExaProvider(config({ id: "exa" }));
    const result = await provider.search("test query");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.exa.ai/search");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
    });

    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("test query");
    expect(body.contents.text).toBe(true);
    expect(body.contents.extras.imageLinks).toBe(3);

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({ title: "T1", url: "https://example.com", content: "S1" });
    expect(result.images).toHaveLength(1);
    expect(result.images[0].url).toBe("https://img.example.com/1.jpg");
  });

  it("uses custom baseURL when provided", async () => {
    mockFetchOnce({ results: [] });

    const provider = new ExaProvider(config({ id: "exa", baseURL: "https://custom.exa.io" }));
    await provider.search("q");

    const url = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(url).toBe("https://custom.exa.io/search");
  });

  it("passes abort signal to fetch", async () => {
    mockFetchOnce({ results: [] });

    const controller = new AbortController();
    const provider = new ExaProvider(config({ id: "exa" }));
    await provider.search("q", { abortSignal: controller.signal });

    const init = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });

  it("handles empty results gracefully", async () => {
    mockFetchOnce({});

    const provider = new ExaProvider(config({ id: "exa" }));
    const result = await provider.search("q");

    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("handles malformed response without crash", async () => {
    mockFetchOnce({
      results: [
        { title: "T1" }, // missing url and summary/text
        { url: "https://ok.com", text: "content" }, // valid, no summary
      ],
    });

    const provider = new ExaProvider(config({ id: "exa" }));
    const result = await provider.search("q");

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://ok.com");
  });

  it("passes scope as category in body", async () => {
    mockFetchOnce({ results: [] });

    const provider = new ExaProvider(config({ id: "exa" }));
    await provider.search("q", { scope: "academic" });

    const init = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.category).toBe("academic");
  });

  it("collects images from extras.imageLinks across results", async () => {
    mockFetchOnce({
      results: [
        { title: "T1", url: "https://a.com", summary: "S", extras: { imageLinks: ["https://img1.jpg", "https://img2.jpg"] } },
        { title: "T2", url: "https://b.com", summary: "S", extras: { imageLinks: ["https://img3.jpg"] } },
      ],
    });

    const provider = new ExaProvider(config({ id: "exa" }));
    const result = await provider.search("q");

    expect(result.images).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Brave
// ---------------------------------------------------------------------------

describe("BraveProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends two parallel requests with X-Subscription-Token header", async () => {
    mockFetchOnce({
      web: { results: [{ title: "T1", url: "https://example.com", description: "D1" }] },
    });
    mockFetchOnce({
      results: [{ url: "https://img.example.com/1.jpg", title: "Img1" }],
    });

    const provider = new BraveProvider(config({ id: "brave" }));
    const result = await provider.search("test query");

    expect(fetch).toHaveBeenCalledTimes(2);

    const [webUrl, webInit] = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, RequestInit];
    const [imageUrl, imageInit] = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[1] as [string, RequestInit];

    expect(webUrl).toContain("https://api.search.brave.com/res/v1/web/search");
    expect(imageUrl).toContain("https://api.search.brave.com/res/v1/images/search");
    expect(webInit.method).toBe("GET");
    expect(imageInit.method).toBe("GET");

    // Brave uses X-Subscription-Token, NOT Authorization Bearer
    expect(webInit.headers).toMatchObject({ "X-Subscription-Token": "test-key" });
    expect(imageInit.headers).toMatchObject({ "X-Subscription-Token": "test-key" });
    expect((webInit.headers as Record<string, string>)["Authorization"]).toBeUndefined();

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({ title: "T1", url: "https://example.com", content: "D1" });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toEqual({ url: "https://img.example.com/1.jpg", description: "Img1" });
  });

  it("uses custom baseURL when provided", async () => {
    mockFetchOnce({ web: { results: [] } });
    mockFetchOnce({ results: [] });

    const provider = new BraveProvider(config({ id: "brave", baseURL: "https://custom.brave.io" }));
    await provider.search("q");

    const webUrl = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(webUrl).toContain("https://custom.brave.io/web/search");
  });

  it("passes abort signal to both fetch calls", async () => {
    mockFetchOnce({ web: { results: [] } });
    mockFetchOnce({ results: [] });

    const controller = new AbortController();
    const provider = new BraveProvider(config({ id: "brave" }));
    await provider.search("q", { abortSignal: controller.signal });

    const webInit = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    const imageInit = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[1][1] as RequestInit;
    expect(webInit.signal).toBe(controller.signal);
    expect(imageInit.signal).toBe(controller.signal);
  });

  it("handles empty results gracefully", async () => {
    mockFetchOnce({});
    mockFetchOnce({});

    const provider = new BraveProvider(config({ id: "brave" }));
    const result = await provider.search("q");

    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("handles malformed response without crash", async () => {
    mockFetchOnce({
      web: {
        results: [
          { title: "T1" }, // missing url and description
          { url: "https://ok.com", description: "D" }, // valid
        ],
      },
    });
    mockFetchOnce({ results: [] });

    const provider = new BraveProvider(config({ id: "brave" }));
    const result = await provider.search("q");

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://ok.com");
  });
});

// ---------------------------------------------------------------------------
// SearXNG
// ---------------------------------------------------------------------------

describe("SearXNGProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct URL with no auth and parses results", async () => {
    mockFetchOnce({
      results: [
        { url: "https://example.com", title: "T1", content: "C1", score: 0.9, category: "general" },
        { url: "https://img.example.com/1.jpg", title: "Img1", content: "", score: 0.8, category: "images", img_src: "https://img.example.com/1.jpg" },
      ],
    });

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    const result = await provider.search("test query");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("http://localhost:8080/search");
    expect(url).toContain("format=json");
    expect(init.method).toBe("GET");
    // No auth headers
    expect((init.headers as Record<string, string>)?.["Authorization"]).toBeUndefined();

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({ title: "T1", url: "https://example.com", content: "C1" });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toEqual({ url: "https://img.example.com/1.jpg", description: "Img1" });
  });

  it("uses custom baseURL when provided", async () => {
    mockFetchOnce({ results: [] });

    const provider = new SearXNGProvider(config({ id: "searxng", baseURL: "https://searx.example.org" }));
    await provider.search("q");

    const url = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(url).toContain("https://searx.example.org/search");
  });

  it("passes abort signal to fetch", async () => {
    mockFetchOnce({ results: [] });

    const controller = new AbortController();
    const provider = new SearXNGProvider(config({ id: "searxng" }));
    await provider.search("q", { abortSignal: controller.signal });

    const init = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });

  it("sorts by score descending and filters score < 0.5", async () => {
    mockFetchOnce({
      results: [
        { url: "https://low.com", title: "Low", content: "C", score: 0.3, category: "general" },
        { url: "https://high.com", title: "High", content: "C", score: 0.9, category: "general" },
        { url: "https://mid.com", title: "Mid", content: "C", score: 0.7, category: "general" },
      ],
    });

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    const result = await provider.search("q");

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].title).toBe("High");
    expect(result.sources[1].title).toBe("Mid");
  });

  it("maps academic scope to science categories and engines", async () => {
    mockFetchOnce({ results: [] });

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    await provider.search("q", { scope: "academic" });

    const url = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(url).toContain("categories=science");
    expect(url).toContain("engines=arxiv");
  });

  it("maps general scope to general categories and engines", async () => {
    mockFetchOnce({ results: [] });

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    await provider.search("q", { scope: "general" });

    const url = (fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(url).toContain("categories=general");
    expect(url).toContain("engines=google");
  });

  it("handles empty results gracefully", async () => {
    mockFetchOnce({});

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    const result = await provider.search("q");

    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("handles malformed response without crash", async () => {
    mockFetchOnce({
      results: [
        { title: "T1" }, // missing url, content, score
        { url: "https://ok.com", content: "C", score: 0.8, category: "general" }, // valid but no title is ok
      ],
    });

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    const result = await provider.search("q");

    // The first item is filtered because no content, the second is valid
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://ok.com");
  });

  it("filters image results from non-image categories", async () => {
    mockFetchOnce({
      results: [
        { url: "https://s1.com", title: "S1", content: "C", score: 0.9, category: "general" },
        { url: "https://img1.jpg", title: "Img1", score: 0.8, category: "images", img_src: "https://img1.jpg" },
        { url: "https://s2.com", title: "S2", content: "C", score: 0.7, category: "images" }, // image category but no img_src
      ],
    });

    const provider = new SearXNGProvider(config({ id: "searxng" }));
    const result = await provider.search("q");

    // S2 is in "images" category but has content+url+score≥0.5, so it's included in sources too
    // (category filtering only applies to the images array)
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].title).toBe("S1");
    expect(result.images).toHaveLength(1);
    expect(result.images[0].url).toBe("https://img1.jpg");
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: default base URLs
// ---------------------------------------------------------------------------

describe("Default base URLs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Tavily defaults to https://api.tavily.com", async () => {
    mockFetchOnce({ results: [], images: [] });
    const provider = new TavilyProvider(config({ id: "tavily" }));
    await provider.search("q");
    expect((fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0]).toBe(
      "https://api.tavily.com/search",
    );
  });

  it("Firecrawl defaults to https://api.firecrawl.dev", async () => {
    mockFetchOnce({ data: [] });
    const provider = new FirecrawlProvider(config({ id: "firecrawl" }));
    await provider.search("q");
    expect((fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0]).toBe(
      "https://api.firecrawl.dev/v1/search",
    );
  });

  it("Exa defaults to https://api.exa.ai", async () => {
    mockFetchOnce({ results: [] });
    const provider = new ExaProvider(config({ id: "exa" }));
    await provider.search("q");
    expect((fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0]).toBe(
      "https://api.exa.ai/search",
    );
  });

  it("Brave defaults to https://api.search.brave.com/res/v1", async () => {
    mockFetchOnce({ web: { results: [] } });
    mockFetchOnce({ results: [] });
    const provider = new BraveProvider(config({ id: "brave" }));
    await provider.search("q");
    expect((fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0]).toContain(
      "https://api.search.brave.com/res/v1/web/search",
    );
  });

  it("SearXNG defaults to http://localhost:8080", async () => {
    mockFetchOnce({ results: [] });
    const provider = new SearXNGProvider(config({ id: "searxng" }));
    await provider.search("q");
    expect((fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0]).toContain(
      "http://localhost:8080/search",
    );
  });
});
