# S04 Research: Search Provider Integration

## Summary

S04 builds the search provider layer: a factory with 5 external adapters (Tavily, Firecrawl, Exa, Brave, SearXNG) plus a model-native search adapter (Gemini grounding, OpenAI web_search_preview, OpenRouter web plugin, xAI search), domain filtering, citation images, and parallel execution. The work fits into `src/engine/search/` as a new module, extending the `SearchProvider` interface from S03's `search-provider.ts`.

This is **targeted research** — all search APIs are well-documented REST endpoints, the S03 interface is clear, and the old codebase provides a complete reference implementation. The main complexity is in the breadth (5+1 providers) and the model-native search integration pattern which differs significantly per AI provider.

## Requirements Owned

| Req | Description | Key Consideration |
|-----|-------------|-------------------|
| SRC-01 | Tavily search provider | REST API, supports `include_images`, `include_image_descriptions`, `search_depth: "advanced"`, scope (general/news) |
| SRC-02 | Firecrawl search provider | REST API v1 `/search`, returns markdown content, no image support |
| SRC-03 | Exa search provider | REST API, supports `extras.imageLinks` for citation images, category/scope filter |
| SRC-04 | Brave Search provider | REST API, requires separate web + image searches, uses `X-Subscription-Token` header (not Bearer) |
| SRC-05 | SearXNG self-hosted provider | REST API, JSON format param, returns mixed general+image results in single call, score-based filtering |
| SRC-06 | Model-native search (Gemini grounding, OpenAI web_search_preview) | Uses AI SDK's built-in tool support; different mechanism per provider — Gemini uses `useSearchGrounding` model setting, OpenAI uses `webSearchPreview` tool, OpenRouter uses provider options plugin, xAI uses `search_parameters` provider options |
| SRC-07 | Domain filtering (include/exclude with wildcard subdomain matching) | Post-processing filter applied to all search results; needs hostname normalization, wildcard matching |
| SRC-08 | Citation images toggle | Filters `images` from search results when disabled; when enabled, images from search results embed in report |

## Recommendation

**Build a search factory (`src/engine/search/`) with:**

1. **`types.ts`** — SearchProviderId union type, SearchProviderConfig schema, SearchOptions interface
2. **`search-provider.ts`** — Expanded interface (the S03 one needs `search(query, options?)` to support abort signals and provider config)
3. **`factory.ts`** — Factory function `createSearchProvider(config)` returning the right adapter
4. **`providers/` directory** — One file per provider:
   - `tavily.ts`, `firecrawl.ts`, `exa.ts`, `brave.ts`, `searxng.ts`, `model-native.ts`
5. **`domain-filter.ts`** — Domain filtering utility (hostname normalization, include/exclude lists, wildcard matching)
6. **`index.ts`** — Barrel export

Then **update `src/engine/research/search-provider.ts`** to expand the interface and **update `orchestrator.ts`** to pass options through.

**Model-native search is the trickiest part** — it's not a REST API call but an AI SDK feature that augments the streaming `generateText`/`streamText` call with tools/provider options. This means model-native search doesn't fit the `SearchProvider.search()` pattern cleanly. The cleanest approach: `ModelNativeSearchProvider` uses `generateText` with the appropriate tools/options and extracts sources/images from the result.

## Implementation Landscape

### Existing Code to Reference

| File | What It Provides |
|------|-----------------|
| `_archive/src-v0/utils/deep-research/search.ts` (458 lines) | Complete reference for all 5 external providers: API shapes, URL construction, response parsing, result normalization. Direct port with TypeScript cleanup. |
| `_archive/src-v0/hooks/useWebSearch.ts` | Domain filtering logic (`normalizeDomain`, `parseDomainList`, `matchDomain`, `isUrlAllowed`, `applyDomainFilters`) — direct port |
| `_archive/src-v0/hooks/useDeepResearch.ts` lines 125-200 | Model-native search config: Gemini `useSearchGrounding`, OpenAI `webSearchPreview` tool, OpenRouter `plugins: [{id: "web"}]`, xAI `search_parameters` |
| `_archive/src-v0/hooks/useDeepResearch.ts` lines 480-495 | Gemini grounding metadata extraction from `providerMetadata.google.groundingMetadata` |
| `_archive/src-v0/constants/urls.ts` | Default base URLs for all providers |
| `src/engine/research/search-provider.ts` | Current interface — needs expansion for abort signal and provider config |
| `src/engine/research/orchestrator.ts` | Consumer of SearchProvider — calls `searchProvider.search(task.query)` at lines 373 and 530 |
| `src/engine/research/types.ts` | Source, ImageSource types — match what search returns |
| `src/engine/provider/types.ts` | ProviderConfig, ProviderId, ModelCapabilities (has `searchGrounding` flag) |
| `src/engine/provider/factory.ts` | `createGoogleProvider`, `createOpenAICompatibleProvider` — needed for model-native search |
| `src/engine/provider/streaming.ts` | `streamWithAbort`, `generateStructured` — model-native search needs `generateText` (not yet exported, but same pattern) |

### Key Interfaces

**Current S03 SearchProvider interface** (needs expansion):
```typescript
interface SearchProvider {
  search(query: string): Promise<{ sources: Source[]; images: ImageSource[] }>;
}
```

**Needed expansion:**
```typescript
interface SearchProvider {
  search(query: string, options?: SearchProviderCallOptions): Promise<SearchProviderResult>;
}

interface SearchProviderCallOptions {
  abortSignal?: AbortSignal;
  maxResults?: number;
  scope?: string;  // "general" | "news" | "academic" etc.
}

interface SearchProviderResult {
  sources: Source[];
  images: ImageSource[];
}
```

### External API Summary

| Provider | Base URL | Auth | Method | Key Params | Images |
|----------|----------|------|--------|------------|--------|
| Tavily | `api.tavily.com` | Bearer token | POST `/search` | `query`, `search_depth: "advanced"`, `topic` (scope), `max_results`, `include_images`, `include_image_descriptions`, `include_raw_content: "markdown"` | Yes — top-level `images[]` array |
| Firecrawl | `api.firecrawl.dev/v1` | Bearer token | POST `/search` | `query`, `limit`, `tbs: "qdr:w"`, `scrapeOptions: {formats: ["markdown"]}` | No |
| Exa | `api.exa.ai` | Bearer token | POST `/search` | `query`, `category` (scope), `contents: {text, summary, extras: {imageLinks}}` | Yes — via `extras.imageLinks` per result |
| Brave | `api.search.brave.com/res/v1` | `X-Subscription-Token` header | GET `/web/search?q=...` + GET `/images/search?q=...` | `q`, `count` | Yes — separate image search endpoint |
| SearXNG | `localhost:8080` (configurable) | None (self-hosted) | GET/POST `/search?format=json` | `q`, `categories`, `engines`, `lang` | Yes — mixed in results with `category: "images"` |

### Model-Native Search Integration

This is the most architecturally interesting piece. Unlike external providers that are pure REST calls, model-native search uses AI SDK features:

**Gemini (`useSearchGrounding`):**
```typescript
// In @ai-sdk/google v1.2.x, search grounding is a model setting
const model = google('gemini-2.5-flash', { useSearchGrounding: true });
const { text, sources, providerMetadata } = await generateText({ model, prompt: query });
// sources = [{ sourceType: 'url', id: string, url: string, title?: string }]
// providerMetadata.google.groundingMetadata has detailed grounding info
```

**OpenAI (`webSearchPreview` tool):**
```typescript
// @ai-sdk/openai provides openaiTools.webSearchPreview
const { text, sources } = await generateText({
  model: openai('gpt-4o'),
  prompt: query,
  tools: { web_search_preview: openaiTools.webSearchPreview({ searchContextSize: 'medium' }) },
});
```

**OpenRouter (web plugin via provider options):**
```typescript
// OpenRouter uses provider-specific options for web search
const { text, sources } = await generateText({
  model: openai('model-id', { baseURL: 'https://openrouter.ai/...' }),
  prompt: query,
  providerOptions: { openrouter: { plugins: [{ id: 'web', max_results: 5 }] } },
});
```

**xAI (search_parameters via provider options):**
```typescript
const { text, sources } = await generateText({
  model: openai('grok-3', { baseURL: 'https://api.x.ai/v1' }),
  prompt: query,
  providerOptions: { xai: { search_parameters: { mode: 'auto', max_search_results: 5 } } },
});
```

**Important:** Model-native search uses `generateText` (not streaming) because we need the complete `sources` array. The model generates text AND performs search in a single call. This is fundamentally different from external providers where we fetch sources then pass them to the analyze step.

**Architectural decision needed:** Model-native search blurs the line between "search" and "analyze". In the old codebase, model-native search replaces the search+analyze combo — the model does both in one call. For the new architecture, two approaches:
1. **ModelNativeSearchProvider.search()** uses `generateText` internally, returns `{ sources, images }` from the response — then the orchestrator's analyze step still runs separately on those sources. Clean separation but double work.
2. **ModelNativeSearchProvider** is a special case where search+analyze happen together — the orchestrator needs awareness to skip the analyze step for model-native. More complex but matches old behavior and avoids double API calls.

**Recommendation:** Approach 1 is cleaner. The model-native search provider returns sources (from `result.sources`) and the orchestrator's analyze step processes them as usual. The model-native search doesn't do "analysis" in the provider — it just fetches grounded sources. The analyze step still runs separately.

### Domain Filtering

Direct port from old codebase. Key functions:
- `normalizeDomain(input)` — strips protocol, www, wildcards, port, path
- `parseDomainList(value)` — splits on whitespace/comma/newline, normalizes each
- `matchDomain(hostname, domain)` — exact or subdomain match (e.g., `blog.example.com` matches `example.com`)
- `isUrlAllowed(url, includeDomains, excludeDomains)` — exclude takes precedence
- `applyDomainFilters(result, includeDomains, excludeDomains)` — filters both sources and images

Applied as post-processing after every search call, regardless of provider.

## Constraints and Risks

### Constraints

1. **AI SDK v4, not v6** — The project uses `ai@4.3.19` and `@ai-sdk/google@1.2.22`. The `google.tools.googleSearch()` tool API shown in AI SDK v5+ docs is NOT available. Gemini search grounding uses the `useSearchGrounding: true` model setting. OpenAI uses `openaiTools.webSearchPreview` (available in our `@ai-sdk/openai`).

2. **SearchProvider interface must be backward-compatible** — The orchestrator already calls `searchProvider.search(task.query)`. Expanding the signature with an optional second parameter preserves compatibility.

3. **Model-native search needs `generateText`, not `streamText`** — We need complete results (sources array). Must add a `generateTextWithAbort` utility or use `generateStructured` pattern from `streaming.ts`.

4. **No `bocha` provider** — Old codebase had 6 providers; v1.0 drops Bocha. Only 5 external + model-native.

5. **All external providers are client-side REST calls** — No server-side API routes in S04. CORS proxy routes are deferred to S08. For now, API calls go directly to provider endpoints.

### Risks

1. **Model-native search doubles API calls** (MEDIUM) — If we run model-native search + separate analyze, we make two AI calls per search task instead of one. Acceptable for v1.0; optimize later if needed.

2. **CORS issues with direct API calls** (LOW) — External search APIs (Tavily, etc.) are designed for server-side use. Client-side calls may hit CORS. The old codebase uses Next.js API routes as proxies. For S04, we build the providers as pure functions that can be called from either client or server. CORS proxy routes are deferred to S08.

3. **Brave Search requires two HTTP calls** (LOW) — One for web results, one for images. Must be parallelized with `Promise.all`.

4. **SearXNG is self-hosted** (LOW) — No API key, but base URL is configurable. Quality depends on instance configuration.

## Don't Hand-Roll

- **Domain filtering logic** — Port directly from `_archive/src-v0/hooks/useWebSearch.ts` lines 1-50. The normalize/match/filter functions are well-tested in production.
- **API request shapes** — Port directly from `_archive/src-v0/utils/deep-research/search.ts`. The old code has the exact request body structures that each API expects.
- **Response type parsing** — Port the TypeScript response types from the old search.ts. They're already well-typed for each API.

## Implementation Order

1. **Types + domain filtering** — Low risk, no dependencies. `types.ts`, `domain-filter.ts`
2. **Expanded SearchProvider interface** — Update `search-provider.ts` with `SearchProviderCallOptions` and `SearchProviderResult`
3. **Tavily adapter** — Simplest external provider, good template for others
4. **Firecrawl, Exa, Brave, SearXNG adapters** — Follow Tavily pattern
5. **Model-native adapter** — Requires `generateText` utility, most complex integration
6. **Factory + barrel export** — Wires everything together
7. **Orchestrator update** — Wire new search providers into orchestrator, pass abort signal
8. **Tests** — Unit tests for domain filtering, each adapter (mocked HTTP), factory, integration

## Sources

- `_archive/src-v0/utils/deep-research/search.ts` — Complete reference implementation (458 lines)
- `_archive/src-v0/hooks/useWebSearch.ts` — Domain filtering, search hook wiring
- `_archive/src-v0/hooks/useDeepResearch.ts` — Model-native search config (lines 125-200, 480-495)
- `_archive/src-v0/constants/urls.ts` — Default base URLs
- `@ai-sdk/google@1.2.22` type definitions — `useSearchGrounding` model setting
- `@ai-sdk/openai` type definitions — `openaiTools.webSearchPreview` tool
- AI SDK documentation (vercel/ai GitHub) — Google search grounding, OpenAI web search patterns
