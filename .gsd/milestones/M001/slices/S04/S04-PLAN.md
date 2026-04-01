# S04: Search Provider Integration

**Goal:** Implement all search providers (Tavily, Firecrawl, Exa, Brave, SearXNG, model-native), domain filtering with wildcard subdomain matching, citation images toggle, and a factory function — all implementing the expanded SearchProvider interface and wired into the ResearchOrchestrator.
**Demo:** After this: All 5 search providers (Tavily, Firecrawl, Exa, Brave, SearXNG) with model-native search, domain filtering, and citation images.

## Tasks
- [x] **T01: Create search module type foundation (SearchProviderId, Config, CallOptions, Result), domain filtering utilities, citation images toggle, and expanded backward-compatible SearchProvider interface** — Create the search module's type foundation and utility layer:

1. Create `src/engine/search/types.ts`:
   - `SearchProviderId` union type: 'tavily' | 'firecrawl' | 'exa' | 'brave' | 'searxng' | 'model-native'
   - `SearchProviderConfig` interface: `{ id: SearchProviderId; apiKey?: string; baseURL?: string; scope?: string; maxResults?: number }`
   - `SearchProviderCallOptions` interface: `{ abortSignal?: AbortSignal; maxResults?: number; scope?: string; includeDomains?: string[]; excludeDomains?: string[]; includeImages?: boolean }`
   - `SearchProviderResult` interface: `{ sources: Source[]; images: ImageSource[] }`
   - Zod schema for SearchProviderConfig

2. Create `src/engine/search/domain-filter.ts` — port from `_archive/src-v0/hooks/useWebSearch.ts` lines 1-50:
   - `normalizeDomain(input: string)` — strip protocol, www, wildcards, port, path
   - `parseDomainList(value: string)` — split on whitespace/comma/newline, normalize each
   - `matchDomain(hostname: string, domain: string)` — exact or subdomain match
   - `isUrlAllowed(url: string, includeDomains: string[], excludeDomains: string[])` — exclude takes precedence
   - `applyDomainFilters(result: SearchProviderResult, includeDomains: string[], excludeDomains: string[])` — filter both sources and images

3. Create `src/engine/search/citation-images.ts`:
   - `filterCitationImages(result: SearchProviderResult, enabled: boolean)` — returns empty images array when disabled, passthrough when enabled

4. Update `src/engine/research/search-provider.ts`:
   - Expand `SearchProvider` interface to accept optional `SearchProviderCallOptions`
   - Keep backward compatibility — `search(query: string, options?: SearchProviderCallOptions)`
   - Update `NoOpSearchProvider` to accept (and ignore) options
   - Import `SearchProviderCallOptions` and `SearchProviderResult` from search types

5. Create `src/engine/search/__tests__/domain-filter.test.ts`:
   - Test normalizeDomain with various inputs (http, https, www, wildcards, ports, paths)
   - Test parseDomainList with comma-separated, newline-separated, whitespace-separated, empty
   - Test matchDomain with exact match, subdomain match, non-match
   - Test isUrlAllowed with include-only, exclude-only, both, neither
   - Test applyDomainFilters filters both sources and images, exclude takes precedence
   - Test filterCitationImages toggle behavior

Constraints:
- Import Source and ImageSource from `src/engine/research/types.ts` (they already exist)
- Do NOT move Source/ImageSource types — they stay in research/types.ts
- SearchProviderCallOptions is defined in search/types.ts and imported by research/search-provider.ts
  - Estimate: 1.5h
  - Files: src/engine/search/types.ts, src/engine/search/domain-filter.ts, src/engine/search/citation-images.ts, src/engine/research/search-provider.ts, src/engine/search/__tests__/domain-filter.test.ts
  - Verify: pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts && pnpm vitest run src/engine/research/__tests__/types.test.ts && pnpm build
- [x] **T02: Implement Tavily, Firecrawl, Exa, Brave, and SearXNG search providers as SearchProvider interface classes with proper API mapping, abort signal support, and structured logging** — Implement all 5 external REST API search providers as classes implementing the expanded SearchProvider interface. Port directly from `_archive/src-v0/utils/deep-research/search.ts`.

Each provider class lives in `src/engine/search/providers/` and:
- Takes `SearchProviderConfig` in constructor
- Implements `SearchProvider` interface with `search(query, options?)`
- Uses native `fetch` for HTTP calls
- Normalizes API-specific response to `SearchProviderResult` (sources + images)
- Passes `options?.abortSignal` to fetch calls
- Logs provider name, query, result counts via `@/lib/logger`

**TavilyProvider** (`tavily.ts`):
- POST to `{baseURL}/search` with Bearer auth
- Body: `{ query, search_depth: "advanced", topic: scope||"general", max_results, include_images: true, include_image_descriptions: true, include_raw_content: "markdown" }`
- Response: `{ results: [{title, url, content, rawContent}], images: string[] }`
- Sources use rawContent || content; images from top-level array

**FirecrawlProvider** (`firecrawl.ts`):
- POST to `{baseURL}/v1/search` with Bearer auth
- Body: `{ query, limit: maxResults, tbs: "qdr:w", scrapeOptions: {formats: ["markdown"]}, timeout: 60000 }`
- Response: `{ data: [{url, title, description, markdown}] }`
- No image support — always returns empty images array

**ExaProvider** (`exa.ts`):
- POST to `{baseURL}/search` with Bearer auth
- Body: `{ query, category: scope||"research paper", contents: {text: true, summary: {query}, numResults, livecrawl: "auto", extras: {imageLinks: 3}} }`
- Response: `{ results: [{title, url, summary, text, extras: {imageLinks}}] }`
- Sources use summary || text; images from extras.imageLinks per result

**BraveProvider** (`brave.ts`):
- TWO parallel GET requests (web + images) using Promise.all
- GET `{baseURL}/v1/web/search?q={query}&count={maxResults}` with `X-Subscription-Token` header (NOT Bearer)
- GET `{baseURL}/v1/images/search?q={query}&count={maxResults}` with same header
- Web response: `{ web: {results: [{title, url, description}]} }`
- Image response: `{ results: [{url, title}] }`
- Both requests share the same abort signal

**SearXNGProvider** (`searxng.ts`):
- GET `{baseURL}/search?format=json&q={query}&categories={scope-based}&engines={scope-based}`
- No auth (self-hosted)
- Response: `{ results: [{url, title, content, score, category, img_src}] }`
- Sort by score descending; filter score >= 0.5 for quality
- Sources from category != 'images'; images from category == 'images' with img_src
- Scope mapping: academic → science+images engines (arxiv, google scholar, etc); general → general+images engines (google, bing, etc)

**Default base URLs** (hardcoded as constants in each file):
- Tavily: `https://api.tavily.com`
- Firecrawl: `https://api.firecrawl.dev`
- Exa: `https://api.exa.ai`
- Brave: `https://api.search.brave.com/res/v1`
- SearXNG: `http://localhost:8080` (self-hosted default)

Create `src/engine/search/__tests__/providers.test.ts`:
- Mock global fetch for each provider
- Test happy path: correct URL, headers, body, response parsing
- Test abort signal passed to fetch
- Test empty results handled gracefully
- Test malformed response (missing fields) handled without crash
- Test default base URL used when no baseURL in config
- Test scope parameter passed correctly
  - Estimate: 2h
  - Files: src/engine/search/providers/tavily.ts, src/engine/search/providers/firecrawl.ts, src/engine/search/providers/exa.ts, src/engine/search/providers/brave.ts, src/engine/search/providers/searxng.ts, src/engine/search/__tests__/providers.test.ts
  - Verify: pnpm vitest run src/engine/search/__tests__/providers.test.ts && pnpm build
- [x] **T03: Implement ModelNativeSearchProvider with Google grounding, OpenAI web_search_preview, OpenRouter web plugin, and xAI live search, plus generateTextWithAbort utility** — Implement the model-native search provider that uses AI SDK's built-in search capabilities instead of external REST APIs. This is architecturally different — it calls `generateText` with provider-specific tools/options.

1. Add `generateTextWithAbort` utility to `src/engine/provider/streaming.ts`:
   - Wraps AI SDK `generateText` with abort signal and error handling
   - Same pattern as existing `streamWithAbort` and `generateStructured`
   - Returns the full `GenerateTextResult` (caller needs `sources`, `providerMetadata`, etc.)
   - Abort → throws AppError('AI_STREAM_ABORTED')
   - Other errors → throws AppError('AI_INVALID_RESPONSE')

2. Create `src/engine/search/providers/model-native.ts`:
   - `ModelNativeSearchProvider` class implementing `SearchProvider`
   - Constructor takes `{ providerConfig: ProviderConfig; registry: ProviderRegistry; scope?: string; searchContextSize?: string }`
   - `search(query, options?)` method:
     a. Resolve the networking model from provider config (first networking-role model)
     b. Detect provider type from `providerConfig.id`
     c. Call `generateText` with the appropriate configuration:

   **For Google ("google"):**
   - Create model via `createGoogleGenerativeAI({apiKey}).chat(modelId)` — but with `useSearchGrounding: true` as model option
   - Actually: use `createGoogleGenerativeAI({apiKey})('modelId', { useSearchGrounding: true })` to get a model with grounding enabled
   - Call `generateText({ model, prompt: query, abortSignal })`
   - Extract sources from `result.sources` (AI SDK provides these automatically for grounded models)
   - No separate image extraction from grounding

   **For OpenAI ("openai"):**
   - Create model via registry
   - Use `openaiTools` from `@ai-sdk/openai` — specifically check if it has `webSearchPreview`
   - Call `generateText({ model, prompt: query, tools: { web_search_preview: openaiTools.webSearchPreview({searchContextSize}) }, abortSignal })`
   - Extract sources from `result.sources`

   **For OpenRouter ("openrouter"):**
   - Create model via registry
   - Call `generateText({ model, prompt: query, providerOptions: { openrouter: { plugins: [{id: 'web', max_results: maxResults}] } }, abortSignal })`
   - Extract sources from `result.sources`

   **For xAI ("xai"):**
   - Create model via registry (grok-3 models only)
   - Call `generateText({ model, prompt: query, providerOptions: { xai: { search_parameters: { mode: 'auto', max_search_results: maxResults } } }, abortSignal })`
   - Extract sources from `result.sources`

   **Fallback for unsupported providers (deepseek, groq):**
   - Throw AppError('AI_REQUEST_FAILED') with message explaining model-native search is not available
   - This should only happen if user misconfigures (e.g., sets search to model-native with a provider that doesn't support it)

3. The provider always returns `{ sources, images: [] }` — model-native search doesn't return standalone images like external providers. The sources come from the AI SDK's automatic source extraction.

4. Create `src/engine/search/__tests__/model-native.test.ts`:
   - Mock `generateText` from 'ai' module
   - Mock provider factory functions
   - Test each provider type: correct model creation, correct tools/options passed
   - Test abort signal propagation
   - Test unsupported provider throws error
   - Test source extraction from result

**Important constraint:** AI SDK v4, NOT v6. The `google.tools.googleSearch()` tool API is NOT available. Gemini grounding uses the `useSearchGrounding: true` model setting passed when creating the model instance. Check the actual @ai-sdk/google@1.2.x API for the exact syntax — it may be `google('model-id', { useSearchGrounding: true })` or similar.

**Another constraint:** Do NOT import from `@ai-sdk/openai` directly in this file — use dynamic import or conditional import since not all builds will have it. Actually, since it's already a project dependency, a direct import is fine. But check whether `openaiTools` or `openai.tools` is the right API for the installed version.
  - Estimate: 2h
  - Files: src/engine/search/providers/model-native.ts, src/engine/provider/streaming.ts, src/engine/search/__tests__/model-native.test.ts
  - Verify: pnpm vitest run src/engine/search/__tests__/model-native.test.ts && pnpm build
- [x] **T04: Add search provider factory, barrel exports, and orchestrator abortSignal wiring** — Wire all search providers together with a factory function, create barrel exports, and integrate into the ResearchOrchestrator.

1. Create `src/engine/search/factory.ts`:
   - `createSearchProvider(config: SearchProviderConfig, providerConfig?: ProviderConfig, registry?: ProviderRegistry)` — returns the correct SearchProvider implementation
   - For external providers (tavily, firecrawl, exa, brave, searxng): create the adapter with apiKey/baseURL from config
   - For model-native: requires providerConfig and registry to create the model-native adapter
   - Validates that model-native has required providerConfig + registry
   - Logs which provider was created

2. Create `src/engine/search/index.ts`:
   - Re-export all types from types.ts
   - Re-export all provider classes from providers/
   - Re-export factory, domain-filter, citation-images functions
   - Re-export SearchProvider interface and NoOpSearchProvider from research/search-provider (for convenience)

3. Update `src/engine/research/orchestrator.ts`:
   - In both `runInitialSearch` (line ~373) and `runReviewSearch` (line ~530): pass `SearchProviderCallOptions` to `this.searchProvider.search(task.query, options)`
   - Create options object: `{ abortSignal: this.abortController.signal }`
   - The orchestrator doesn't need to know about domain filtering or citation images — those are applied by the caller (UI layer in S05) or inside the search provider wrapper
   - Actually, add a `searchOptions` field to ResearchConfig or pass through constructor so domain filters and citation images can be applied at the orchestrator level
   - Minimal approach: just pass abortSignal for now. Domain filtering and citation images are post-processing that S05 will handle when wiring up the UI.

4. Update `src/engine/research/index.ts`:
   - Add re-exports from `src/engine/search/` for convenience (SearchProviderId, createSearchProvider, domain filter functions)

5. Create `src/engine/search/__tests__/factory.test.ts`:
   - Test factory returns correct provider class for each SearchProviderId
   - Test model-native without providerConfig/registry throws error
   - Test unknown provider ID throws error

6. Create `src/engine/search/__tests__/integration.test.ts`:
   - Test orchestrator with a mock search provider that returns real-looking data
   - Verify abort signal is passed through
   - Verify sources and images flow through the pipeline

7. Run full test suite to ensure nothing is broken.

**Constraint:** The orchestrator update must be backward-compatible — existing tests use NoOpSearchProvider with the old single-arg `search(query)` signature. Since options is optional, this should be fine. Verify existing orchestrator tests still pass.
  - Estimate: 1.5h
  - Files: src/engine/search/factory.ts, src/engine/search/index.ts, src/engine/research/orchestrator.ts, src/engine/research/index.ts, src/engine/search/__tests__/factory.test.ts, src/engine/search/__tests__/integration.test.ts
  - Verify: pnpm vitest run src/engine/search/ && pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts && pnpm build
