---
estimated_steps: 51
estimated_files: 6
skills_used: []
---

# T02: Five external REST search providers (Tavily, Firecrawl, Exa, Brave, SearXNG)

Implement all 5 external REST API search providers as classes implementing the expanded SearchProvider interface. Port directly from `_archive/src-v0/utils/deep-research/search.ts`.

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

## Inputs

- `src/engine/search/types.ts`
- `src/engine/search/domain-filter.ts`
- `src/engine/research/search-provider.ts`
- `_archive/src-v0/utils/deep-research/search.ts`

## Expected Output

- `src/engine/search/providers/tavily.ts`
- `src/engine/search/providers/firecrawl.ts`
- `src/engine/search/providers/exa.ts`
- `src/engine/search/providers/brave.ts`
- `src/engine/search/providers/searxng.ts`
- `src/engine/search/__tests__/providers.test.ts`

## Verification

pnpm vitest run src/engine/search/__tests__/providers.test.ts && pnpm build
