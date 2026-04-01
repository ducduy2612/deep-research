# S04: Search Provider Integration — UAT

**Milestone:** M001
**Written:** 2026-03-31T19:21:00.352Z

# S04 UAT — Search Provider Integration

## Preconditions
- Node.js environment with all dependencies installed (`pnpm install`)
- No API keys required for UAT (all tests use mocks)

## Test Suite Execution

### UAT-01: Domain Filtering Utilities
**Purpose:** Verify domain normalization, matching, and filtering logic

1. Run `pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts`
2. **Expected:** 43 tests pass covering:
   - `normalizeDomain` strips protocols, www, wildcards, ports, paths
   - `parseDomainList` splits on comma/whitespace/newline
   - `matchDomain` handles exact and subdomain matching
   - `isUrlAllowed` enforces exclude-over-include precedence
   - `applyDomainFilters` filters both sources and images arrays
   - `filterCitationImages` strips images when disabled, passes through when enabled

### UAT-02: External Search Providers
**Purpose:** Verify all 5 REST API providers construct correct requests and parse responses

1. Run `pnpm vitest run src/engine/search/__tests__/providers.test.ts`
2. **Expected:** 38 tests pass covering:
   - Tavily: POST with Bearer auth, correct body (search_depth, topic, include_images), response parsing
   - Firecrawl: POST with Bearer auth, scrapeOptions with markdown format, no image support
   - Exa: POST with Bearer auth, contents config, imageLinks extraction from extras
   - Brave: Two parallel GET requests with X-Subscription-Token header, web+image merging
   - SearXNG: GET with no auth, score filtering (>= 0.5), scope-to-category mapping
   - All providers: abort signal passed to fetch, empty results handled, default base URLs used

### UAT-03: Model-Native Search Provider
**Purpose:** Verify AI SDK integration for Google, OpenAI, OpenRouter, xAI native search

1. Run `pnpm vitest run src/engine/search/__tests__/model-native.test.ts`
2. **Expected:** 18 tests pass covering:
   - Google: creates model with `useSearchGrounding: true`, extracts sources from result
   - OpenAI: uses `openai.tools.webSearchPreview()` with searchContextSize
   - OpenRouter: passes `providerOptions.openrouter.plugins` with web plugin
   - xAI: passes `providerOptions.xai.search_parameters` with auto mode
   - Unsupported provider (deepseek, groq) throws AppError
   - Abort signal propagated to generateText
   - No networking model throws AppError

### UAT-04: Factory Function
**Purpose:** Verify factory dispatches to correct provider class with validation

1. Run `pnpm vitest run src/engine/search/__tests__/factory.test.ts`
2. **Expected:** 12 tests pass covering:
   - Returns TavilyProvider for id='tavily'
   - Returns FirecrawlProvider for id='firecrawl'
   - Returns ExaProvider for id='exa'
   - Returns BraveProvider for id='brave'
   - Returns SearXNGProvider for id='searxng'
   - Returns ModelNativeSearchProvider for id='model-native' with providerConfig + registry
   - Throws error for model-native without providerConfig or registry
   - Throws error for unknown provider ID

### UAT-05: Orchestrator Integration
**Purpose:** Verify abortSignal wiring and backward compatibility

1. Run `pnpm vitest run src/engine/search/__tests__/integration.test.ts`
2. **Expected:** 4 tests pass covering:
   - Search provider receives abortSignal through orchestrator
   - Sources and images flow through pipeline correctly

### UAT-06: Backward Compatibility
**Purpose:** Verify existing orchestrator tests still pass with expanded SearchProvider interface

1. Run `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts`
2. **Expected:** 19 tests pass — no regressions from SearchProvider interface expansion

### UAT-07: Full Build
**Purpose:** Verify no TypeScript errors in production build

1. Run `pnpm build`
2. **Expected:** Build completes successfully with no errors

### UAT-08: Full Test Suite
**Purpose:** Verify no regressions across entire project

1. Run `pnpm vitest run`
2. **Expected:** 260 tests pass across 12 test files
