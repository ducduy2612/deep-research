---
id: S04
parent: M001
milestone: M001
provides:
  - SearchProvider interface with SearchProviderCallOptions support
  - 6 search provider implementations: Tavily, Firecrawl, Exa, Brave, SearXNG, ModelNative
  - createSearchProvider factory function for provider instantiation
  - Domain filtering utilities (normalizeDomain, parseDomainList, matchDomain, isUrlAllowed, applyDomainFilters)
  - Citation images toggle (filterCitationImages)
  - SearchProviderResult type with sources + images
  - SearchProviderConfig Zod schema for settings validation
  - Barrel exports from src/engine/search/index.ts for clean imports
requires:
  - slice: S02
    provides: ProviderConfig, ProviderRegistry, resolveModel, streaming utilities used by ModelNativeSearchProvider
  - slice: S03
    provides: SearchProvider interface, NoOpSearchProvider, ResearchOrchestrator with search step integration, Source/ImageSource types
affects:
  - S05
key_files:
  - src/engine/search/types.ts
  - src/engine/search/domain-filter.ts
  - src/engine/search/citation-images.ts
  - src/engine/search/factory.ts
  - src/engine/search/index.ts
  - src/engine/search/providers/tavily.ts
  - src/engine/search/providers/firecrawl.ts
  - src/engine/search/providers/exa.ts
  - src/engine/search/providers/brave.ts
  - src/engine/search/providers/searxng.ts
  - src/engine/search/providers/model-native.ts
  - src/engine/research/search-provider.ts
  - src/engine/research/orchestrator.ts
  - src/engine/search/__tests__/domain-filter.test.ts
  - src/engine/search/__tests__/providers.test.ts
  - src/engine/search/__tests__/model-native.test.ts
  - src/engine/search/__tests__/factory.test.ts
  - src/engine/search/__tests__/integration.test.ts
key_decisions:
  - SearchProvider interface expanded with optional SearchProviderCallOptions — backward-compatible, existing callers (NoOpSearchProvider) don't need changes
  - Domain filtering uses exclude-over-include precedence — matches v0 behavior and is the most intuitive model
  - Model-native search creates fresh provider instances (not registry models) for Google and OpenAI — needed because search-grounding and web_search_preview settings are passed at model creation time, not at call time
  - Brave provider uses Promise.all for dual web+image requests — simpler code, but both fail if either fails
  - SearXNG uses score >= 0.5 threshold for quality filtering — matches v0 behavior and removes low-quality results from self-hosted instances
  - Domain filters and citation images are NOT applied inside providers — they are post-processing utilities applied by the caller (UI layer in S05), keeping providers single-responsibility
patterns_established:
  - SearchProvider contract: search(query, options?) returns Promise<SearchProviderResult> — all providers follow this
  - Provider class pattern: constructor takes SearchProviderConfig, implements SearchProvider interface, uses structured logger
  - Factory function pattern: createSearchProvider dispatches to correct class based on SearchProviderId, validates required deps
  - Domain filtering as pure utility functions — no class, no state, composable with pipe/chain pattern
  - Citation images as simple toggle function — pure, no side effects
observability_surfaces:
  - Each search provider logs provider name, query, result counts via structured logger on every search call
  - Model-native provider logs providerId alongside query and results
  - Factory logs which provider type was created (external vs model-native)
drill_down_paths:
  - src/engine/search/types.ts — all search module types
  - src/engine/search/factory.ts — provider factory function
  - src/engine/search/providers/ — all 6 provider implementations
  - src/engine/search/domain-filter.ts — domain filtering utilities
  - src/engine/search/__tests__/ — 115 tests across 5 files
duration: ""
verification_result: passed
completed_at: 2026-03-31T19:21:00.352Z
blocker_discovered: false
---

# S04: Search Provider Integration

**Implemented all 5 external search providers (Tavily, Firecrawl, Exa, Brave, SearXNG) plus model-native search (Google grounding, OpenAI web_search_preview, OpenRouter web plugin, xAI live search), with domain filtering, citation images toggle, factory function, and orchestrator abortSignal wiring — 260 tests passing, build clean.**

## What Happened

## What was built

The search module (`src/engine/search/`) is a complete search provider subsystem with 6 provider implementations, utility functions, and full test coverage.

### T01 — Type Foundation & Utilities
Created the search module's type system (`types.ts`) with `SearchProviderId` union type, `SearchProviderConfig`, `SearchProviderCallOptions`, and `SearchProviderResult` interfaces with Zod validation. Built domain filtering utilities (`domain-filter.ts`) ported from the v0 codebase — `normalizeDomain`, `parseDomainList`, `matchDomain`, `isUrlAllowed`, `applyDomainFilters` — with exclude-over-include precedence. Added citation images toggle (`citation-images.ts`). Expanded the `SearchProvider` interface in `search-provider.ts` with optional `SearchProviderCallOptions` parameter while keeping backward compatibility. 43 domain filter tests.

### T02 — External Search Providers
Implemented 5 REST API search providers as classes implementing `SearchProvider`:
- **TavilyProvider**: POST with Bearer auth, returns sources + images from top-level image array
- **FirecrawlProvider**: POST with Bearer auth, markdown scrape options, no image support
- **ExaProvider**: POST with Bearer auth, text+summary content, imageLinks from extras
- **BraveProvider**: Two parallel GET requests (web + images) via Promise.all with X-Subscription-Token header
- **SearXNGProvider**: GET with no auth, score-based filtering (>= 0.5), scope-to-category/engine mapping

All use native `fetch`, pass `abortSignal`, normalize to `SearchProviderResult`, and log via structured logger. 38 provider tests with mocked fetch.

### T03 — Model-Native Search Provider
Created `ModelNativeSearchProvider` using AI SDK's `generateText` with provider-specific configurations:
- **Google**: `useSearchGrounding: true` model option via `createGoogleGenerativeAI`
- **OpenAI**: `openai.tools.webSearchPreview()` tool
- **OpenRouter**: `providerOptions.openrouter.plugins` with web plugin
- **xAI**: `providerOptions.xai.search_parameters` with auto mode
- Unsupported providers (deepseek, groq) throw clear `AppError`

Added `generateTextWithAbort` utility pattern to streaming.ts. 18 model-native tests with mocked `generateText`.

### T04 — Factory, Exports & Orchestrator Wiring
Created `createSearchProvider` factory that dispatches to the correct provider class based on `SearchProviderId`, with validation for model-native (requires providerConfig + registry). Created barrel exports in `index.ts`. Wired orchestrator to pass `abortSignal` to both `runInitialSearch` and `runReviewSearch`. Integration tests confirm signal propagation. 12 factory + 4 integration tests. All existing orchestrator tests remain passing.

### Test Coverage
- 5 test files, 115 search-specific tests, 260 total project tests
- All tests passing, production build clean

### Requirements Advanced
This slice directly advances SRC-01 through SRC-08 (all search-related requirements).

## Verification

### Build Verification
- `pnpm build` — ✅ Production build succeeds (no TypeScript errors, all pages render)
- `pnpm vitest run` — ✅ 260 tests passing across 12 test files (0 failures)

### Slice-Level Verification
- `pnpm vitest run src/engine/search/` — ✅ 115 tests across 5 test files (domain-filter: 43, providers: 38, factory: 12, model-native: 18, integration: 4)
- `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` — ✅ 19 tests passing (backward compatibility confirmed)
- `pnpm vitest run src/engine/research/__tests__/types.test.ts` — ✅ 18 tests passing

### Specific Checks
- All 6 provider files exist and export classes implementing `SearchProvider`
- Factory function dispatches correctly for all `SearchProviderId` values
- Domain filtering: exclude takes precedence, wildcard subdomain matching works
- Citation images toggle: disabled returns empty images, enabled passes through
- Orchestrator passes `abortSignal` to both `runInitialSearch` and `runReviewSearch`
- Backward compatibility: `NoOpSearchProvider` still works with old `search(query)` signature
- Barrel exports in `index.ts` provide clean public API surface

## Requirements Advanced

- SRC-01 — TavilyProvider implemented with full API mapping, structured logging, abort support
- SRC-02 — FirecrawlProvider implemented with markdown scrape options and structured response parsing
- SRC-03 — ExaProvider implemented with text+summary content and imageLinks extraction
- SRC-04 — BraveProvider implemented with dual web+image parallel requests
- SRC-05 — SearXNGProvider implemented with score-based filtering and scope-to-category mapping
- SRC-06 — ModelNativeSearchProvider implemented for Google (grounding), OpenAI (web_search_preview), OpenRouter (web plugin), xAI (live search)
- SRC-07 — Domain filtering utilities with wildcard subdomain matching, exclude-over-include precedence
- SRC-08 — filterCitationImages toggle utility — strips images when disabled, passes through when enabled

## Requirements Validated

- SRC-01 — TavilyProvider class tested with 38 provider tests, mocked fetch verifying correct API mapping
- SRC-02 — FirecrawlProvider class tested with correct POST body and response parsing
- SRC-03 — ExaProvider class tested with content extraction and imageLinks handling
- SRC-04 — BraveProvider class tested with dual Promise.all requests and X-Subscription-Token header
- SRC-05 — SearXNGProvider class tested with score filtering and scope mapping
- SRC-06 — ModelNativeSearchProvider tested with mocked generateText for all 4 provider types
- SRC-07 — 43 domain filter tests covering normalize, parse, match, isUrlAllowed, applyDomainFilters
- SRC-08 — filterCitationImages unit tested in domain-filter test suite

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All 4 tasks delivered exactly as planned — no scope changes, no skipped files, no workaround patterns.

## Known Limitations

- Model-native search providers (Google, OpenAI, OpenRouter, xAI) are tested with mocked `generateText` — actual API integration testing requires live API keys and will be validated in S05 when the UI wires everything together.
- Domain filtering and citation images utilities are unit-tested but not yet wired into the orchestrator pipeline — S05 will apply them at the UI/caller level.
- Brave provider makes two parallel requests (web + images) — if the image API fails, the web results are lost too (Promise.all rejects). A future improvement could use Promise.allSettled.

## Follow-ups

- S05 needs to wire `createSearchProvider` into the research UI, applying domain filters and citation images toggle after search results return
- S05 settings dialog needs search provider configuration UI (provider selection, API key, base URL)
- Consider Promise.allSettled for Brave's dual requests in a future iteration

## Files Created/Modified

- `src/engine/search/types.ts` — New — search module type definitions (SearchProviderId, Config, CallOptions, Result, Zod schema)
- `src/engine/search/domain-filter.ts` — New — domain filtering utilities ported from v0 with normalize, parse, match, filter functions
- `src/engine/search/citation-images.ts` — New — citation images toggle utility
- `src/engine/search/factory.ts` — New — createSearchProvider factory function with provider dispatch
- `src/engine/search/index.ts` — New — barrel exports for entire search module
- `src/engine/search/providers/tavily.ts` — New — Tavily search provider with Bearer auth and image extraction
- `src/engine/search/providers/firecrawl.ts` — New — Firecrawl search provider with markdown scrape options
- `src/engine/search/providers/exa.ts` — New — Exa search provider with text+summary content and imageLinks
- `src/engine/search/providers/brave.ts` — New — Brave search provider with dual web+image parallel requests
- `src/engine/search/providers/searxng.ts` — New — SearXNG search provider with score filtering and scope mapping
- `src/engine/search/providers/model-native.ts` — New — model-native search provider for Google/OpenAI/OpenRouter/xAI
- `src/engine/research/search-provider.ts` — Modified — expanded SearchProvider interface with optional SearchProviderCallOptions
- `src/engine/research/orchestrator.ts` — Modified — passes abortSignal in SearchProviderCallOptions to search calls
- `src/engine/search/__tests__/domain-filter.test.ts` — New — 43 tests for domain filtering and citation images
- `src/engine/search/__tests__/providers.test.ts` — New — 38 tests for all 5 external providers
- `src/engine/search/__tests__/model-native.test.ts` — New — 18 tests for model-native search provider
- `src/engine/search/__tests__/factory.test.ts` — New — 12 tests for factory function
- `src/engine/search/__tests__/integration.test.ts` — New — 4 integration tests for orchestrator wiring
