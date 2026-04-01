---
id: T04
parent: S04
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/search/factory.ts", "src/engine/search/index.ts", "src/engine/research/orchestrator.ts", "src/engine/research/index.ts", "src/engine/search/__tests__/factory.test.ts", "src/engine/search/__tests__/integration.test.ts"]
key_decisions: ["Factory validates model-native requires providerConfig+registry, throws AppError otherwise", "Integration tests accept that images from search are not yet propagated through the analyze step (S05 scope)"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "`pnpm vitest run src/engine/search/` → 115 tests pass (domain-filter 43, providers 38, model-native 18, factory 12, integration 4). `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` → 19 tests pass (backward-compatible). `pnpm build` → clean build."
completed_at: 2026-03-31T19:17:51.592Z
blocker_discovered: false
---

# T04: Add search provider factory, barrel exports, and orchestrator abortSignal wiring

> Add search provider factory, barrel exports, and orchestrator abortSignal wiring

## What Happened
---
id: T04
parent: S04
milestone: M001
key_files:
  - src/engine/search/factory.ts
  - src/engine/search/index.ts
  - src/engine/research/orchestrator.ts
  - src/engine/research/index.ts
  - src/engine/search/__tests__/factory.test.ts
  - src/engine/search/__tests__/integration.test.ts
key_decisions:
  - Factory validates model-native requires providerConfig+registry, throws AppError otherwise
  - Integration tests accept that images from search are not yet propagated through the analyze step (S05 scope)
duration: ""
verification_result: passed
completed_at: 2026-03-31T19:17:51.593Z
blocker_discovered: false
---

# T04: Add search provider factory, barrel exports, and orchestrator abortSignal wiring

**Add search provider factory, barrel exports, and orchestrator abortSignal wiring**

## What Happened

Created `createSearchProvider()` factory in `src/engine/search/factory.ts` that maps each `SearchProviderId` to its concrete class. External providers (tavily, firecrawl, exa, brave, searxng) are instantiated with just config; model-native validates that both `providerConfig` and `registry` are provided. Created barrel export at `src/engine/search/index.ts` re-exporting all types, provider classes, factory, domain-filter utilities, citation-images toggle, and convenience re-exports. Updated the orchestrator to pass `{ abortSignal: this.abortController?.signal }` as `SearchProviderCallOptions` in both `runSearchPhase` and `runReviewLoop` search calls. Added convenience re-exports from `src/engine/research/index.ts`. Wrote 12 factory tests and 4 integration tests. All 134 existing + new tests pass, build succeeds cleanly.

## Verification

`pnpm vitest run src/engine/search/` → 115 tests pass (domain-filter 43, providers 38, model-native 18, factory 12, integration 4). `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` → 19 tests pass (backward-compatible). `pnpm build` → clean build.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/search/` | 0 | ✅ pass | 250ms |
| 2 | `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` | 0 | ✅ pass | 240ms |
| 3 | `pnpm build` | 0 | ✅ pass | 10000ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/search/factory.ts`
- `src/engine/search/index.ts`
- `src/engine/research/orchestrator.ts`
- `src/engine/research/index.ts`
- `src/engine/search/__tests__/factory.test.ts`
- `src/engine/search/__tests__/integration.test.ts`


## Deviations
None.

## Known Issues
None.
