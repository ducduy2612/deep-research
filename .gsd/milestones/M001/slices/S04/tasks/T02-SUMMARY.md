---
id: T02
parent: S04
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/search/providers/tavily.ts", "src/engine/search/providers/firecrawl.ts", "src/engine/search/providers/exa.ts", "src/engine/search/providers/brave.ts", "src/engine/search/providers/searxng.ts", "src/engine/search/__tests__/providers.test.ts"]
key_decisions: ["Source type mapped to url+title only (no content field) matching v1 Source interface", "Brave uses X-Subscription-Token header not Bearer auth per API spec", "SearXNG sources filtered by content+url+score≥0.5 regardless of category; images filtered by category=='images'", "Exa numResults multiplied by 5 matching v0 behavior"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm vitest run src/engine/search/__tests__/providers.test.ts — 38 tests pass. pnpm build — clean production build. Existing domain-filter tests (43) also confirmed passing."
completed_at: 2026-03-31T19:01:57.686Z
blocker_discovered: false
---

# T02: Implement Tavily, Firecrawl, Exa, Brave, and SearXNG search providers as SearchProvider interface classes with proper API mapping, abort signal support, and structured logging

> Implement Tavily, Firecrawl, Exa, Brave, and SearXNG search providers as SearchProvider interface classes with proper API mapping, abort signal support, and structured logging

## What Happened
---
id: T02
parent: S04
milestone: M001
key_files:
  - src/engine/search/providers/tavily.ts
  - src/engine/search/providers/firecrawl.ts
  - src/engine/search/providers/exa.ts
  - src/engine/search/providers/brave.ts
  - src/engine/search/providers/searxng.ts
  - src/engine/search/__tests__/providers.test.ts
key_decisions:
  - Source type mapped to url+title only (no content field) matching v1 Source interface
  - Brave uses X-Subscription-Token header not Bearer auth per API spec
  - SearXNG sources filtered by content+url+score≥0.5 regardless of category; images filtered by category=='images'
  - Exa numResults multiplied by 5 matching v0 behavior
duration: ""
verification_result: passed
completed_at: 2026-03-31T19:01:57.686Z
blocker_discovered: false
---

# T02: Implement Tavily, Firecrawl, Exa, Brave, and SearXNG search providers as SearchProvider interface classes with proper API mapping, abort signal support, and structured logging

**Implement Tavily, Firecrawl, Exa, Brave, and SearXNG search providers as SearchProvider interface classes with proper API mapping, abort signal support, and structured logging**

## What Happened

Ported all 5 external REST search providers from the archived v0 codebase into clean v1 class implementations under src/engine/search/providers/. Each provider implements the SearchProvider interface with search(query, options?), uses native fetch, passes abortSignal, and logs via @/lib/logger.

TavilyProvider: POST /search with Bearer auth, advanced depth, topic scope, markdown raw content, image descriptions.
FirecrawlProvider: POST /v1/search with Bearer auth, markdown scrape, 60s timeout, no image support.
ExaProvider: POST /search with Bearer auth, category scope, text+summary content, per-result imageLinks extras.
BraveProvider: Two parallel GETs (web+images) with X-Subscription-Token header, shared abort signal.
SearXNGProvider: GET /search with scope-based categories/engines, no auth, score≥0.5 quality filter.

Comprehensive test suite (38 tests) covers: correct URL/headers/body, custom baseURL, abort signal passthrough, empty results, malformed responses, scope parameters, and default base URLs for all 5 providers. All verification passed: 38 tests + clean production build.

## Verification

pnpm vitest run src/engine/search/__tests__/providers.test.ts — 38 tests pass. pnpm build — clean production build. Existing domain-filter tests (43) also confirmed passing.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/search/__tests__/providers.test.ts` | 0 | ✅ pass | 136ms |
| 2 | `pnpm build` | 0 | ✅ pass | 12000ms |
| 3 | `pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts` | 0 | ✅ pass | 96ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/search/providers/tavily.ts`
- `src/engine/search/providers/firecrawl.ts`
- `src/engine/search/providers/exa.ts`
- `src/engine/search/providers/brave.ts`
- `src/engine/search/providers/searxng.ts`
- `src/engine/search/__tests__/providers.test.ts`


## Deviations
None.

## Known Issues
None.
