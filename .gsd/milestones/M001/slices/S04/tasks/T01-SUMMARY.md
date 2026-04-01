---
id: T01
parent: S04
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/search/types.ts", "src/engine/search/domain-filter.ts", "src/engine/search/citation-images.ts", "src/engine/research/search-provider.ts", "src/engine/search/__tests__/domain-filter.test.ts"]
key_decisions: ["SearchProviderResult reuses Source/ImageSource from research/types.ts rather than duplicating", "SearchProvider.search() takes optional second parameter to preserve backward compatibility with existing orchestrator", "Search types live in src/engine/search/types.ts, separate from research types", "Domain filtering is a pure utility module with no side effects"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All three task-plan verification commands passed: (1) pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts — 43 tests pass in 181ms, (2) pnpm vitest run src/engine/research/__tests__/types.test.ts — 18 tests pass in 137ms, (3) pnpm build — clean production build. Additionally ran orchestrator tests (19 pass) to confirm backward compatibility of expanded SearchProvider interface."
completed_at: 2026-03-31T18:55:13.356Z
blocker_discovered: false
---

# T01: Create search module type foundation (SearchProviderId, Config, CallOptions, Result), domain filtering utilities, citation images toggle, and expanded backward-compatible SearchProvider interface

> Create search module type foundation (SearchProviderId, Config, CallOptions, Result), domain filtering utilities, citation images toggle, and expanded backward-compatible SearchProvider interface

## What Happened
---
id: T01
parent: S04
milestone: M001
key_files:
  - src/engine/search/types.ts
  - src/engine/search/domain-filter.ts
  - src/engine/search/citation-images.ts
  - src/engine/research/search-provider.ts
  - src/engine/search/__tests__/domain-filter.test.ts
key_decisions:
  - SearchProviderResult reuses Source/ImageSource from research/types.ts rather than duplicating
  - SearchProvider.search() takes optional second parameter to preserve backward compatibility with existing orchestrator
  - Search types live in src/engine/search/types.ts, separate from research types
  - Domain filtering is a pure utility module with no side effects
duration: ""
verification_result: passed
completed_at: 2026-03-31T18:55:13.357Z
blocker_discovered: false
---

# T01: Create search module type foundation (SearchProviderId, Config, CallOptions, Result), domain filtering utilities, citation images toggle, and expanded backward-compatible SearchProvider interface

**Create search module type foundation (SearchProviderId, Config, CallOptions, Result), domain filtering utilities, citation images toggle, and expanded backward-compatible SearchProvider interface**

## What Happened

Created the search module's type foundation and utility layer as the first task in the Search Provider Integration slice (S04). Built four new files and updated one:

1. **types.ts** — SearchProviderId union type for 6 providers (tavily, firecrawl, exa, brave, searxng, model-native), SearchProviderConfig interface with Zod schema for runtime validation, SearchProviderCallOptions (abortSignal, maxResults, scope, includeDomains, excludeDomains, includeImages), and SearchProviderResult using existing Source/ImageSource from research/types.ts.

2. **domain-filter.ts** — Ported 5 domain utilities from the archived v0 useWebSearch.ts: normalizeDomain (strips protocol, www, wildcards, port, path), parseDomainList (splits on whitespace/comma/newline), matchDomain (exact or subdomain), isUrlAllowed (exclude takes precedence over include), and applyDomainFilters (filters both sources and images).

3. **citation-images.ts** — Simple toggle utility: strips images array when disabled, passthrough when enabled.

4. **search-provider.ts** — Expanded the SearchProvider interface to accept optional SearchProviderCallOptions as a second parameter, preserving full backward compatibility. The orchestrator and all existing mock providers call search(query) without options and continue working unchanged.

5. **domain-filter.test.ts** — 43 comprehensive tests covering all utilities.

All verification passed: 43 new tests, 18 existing type tests, 19 orchestrator tests (backward compat), and clean production build.

## Verification

All three task-plan verification commands passed: (1) pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts — 43 tests pass in 181ms, (2) pnpm vitest run src/engine/research/__tests__/types.test.ts — 18 tests pass in 137ms, (3) pnpm build — clean production build. Additionally ran orchestrator tests (19 pass) to confirm backward compatibility of expanded SearchProvider interface.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts` | 0 | ✅ pass | 181ms |
| 2 | `pnpm vitest run src/engine/research/__tests__/types.test.ts` | 0 | ✅ pass | 137ms |
| 3 | `pnpm build` | 0 | ✅ pass | 8000ms |
| 4 | `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` | 0 | ✅ pass | 203ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/search/types.ts`
- `src/engine/search/domain-filter.ts`
- `src/engine/search/citation-images.ts`
- `src/engine/research/search-provider.ts`
- `src/engine/search/__tests__/domain-filter.test.ts`


## Deviations
None.

## Known Issues
None.
