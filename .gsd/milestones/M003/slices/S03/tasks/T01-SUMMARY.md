---
id: T01
parent: S03
milestone: M003
provides: []
requires: []
affects: []
key_files: ["src/stores/research-store.ts", "src/stores/research-store-events.ts", "src/stores/research-store-persist.ts", "src/stores/__tests__/research-store-crud.test.ts"]
key_decisions: ["Extracted handleEvent + shared types to separate module to stay under 500-line ESLint max-lines", "Shared stripResultData helper avoids duplication between removeSearchResult and retrySearchResult", "makeLocalActivity uses random-suffix IDs to avoid coupling store actions to events module counter"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 16 CRUD tests pass (`pnpm vitest run src/stores/__tests__/research-store-crud.test.ts`). Full store suite passes (214 tests, 0 regressions). ESLint clean on all modified files. Store content line count at 325 (under 500 limit). Pre-existing build failure (AI SDK v6 CoreMessage in streaming.ts) confirmed identical before and after changes."
completed_at: 2026-04-03T16:19:30.849Z
blocker_discovered: false
---

# T01: Add removeSearchResult, retrySearchResult, clearSuggestion actions with pendingRetryQueries persistence and extract handleEvent to separate module

> Add removeSearchResult, retrySearchResult, clearSuggestion actions with pendingRetryQueries persistence and extract handleEvent to separate module

## What Happened
---
id: T01
parent: S03
milestone: M003
key_files:
  - src/stores/research-store.ts
  - src/stores/research-store-events.ts
  - src/stores/research-store-persist.ts
  - src/stores/__tests__/research-store-crud.test.ts
key_decisions:
  - Extracted handleEvent + shared types to separate module to stay under 500-line ESLint max-lines
  - Shared stripResultData helper avoids duplication between removeSearchResult and retrySearchResult
  - makeLocalActivity uses random-suffix IDs to avoid coupling store actions to events module counter
duration: ""
verification_result: passed
completed_at: 2026-04-03T16:19:30.850Z
blocker_discovered: false
---

# T01: Add removeSearchResult, retrySearchResult, clearSuggestion actions with pendingRetryQueries persistence and extract handleEvent to separate module

**Add removeSearchResult, retrySearchResult, clearSuggestion actions with pendingRetryQueries persistence and extract handleEvent to separate module**

## What Happened

Implemented three new store actions for the research workspace CRUD model:

1. **removeSearchResult(index)** — removes a search result and strips its learning, sources, and images from the accumulated `result` object. Sources/images shared with remaining results are preserved.

2. **retrySearchResult(index)** — stores the query in `pendingRetryQueries` for re-execution, then performs the same removal as delete.

3. **clearSuggestion()** — simple setter that clears the suggestion field.

Added `pendingRetryQueries` as a new persisted field with backward-compatible defaults for older state. Updated the persist schema, hydrate function, and auto-persist subscription.

Extracted the `handleEvent` method (362 lines) to a new `research-store-events.ts` module to keep the main store under the 500-line ESLint max-lines rule. This was noted as a conditional step in the plan. A shared `stripResultData` helper was introduced to avoid duplication between remove and retry actions.

16 tests written covering all actions, edge cases (out-of-bounds, null result, delete-all), retry accumulation, persistence round-trip, and backward compatibility. All 214 store tests pass with no regressions.

## Verification

All 16 CRUD tests pass (`pnpm vitest run src/stores/__tests__/research-store-crud.test.ts`). Full store suite passes (214 tests, 0 regressions). ESLint clean on all modified files. Store content line count at 325 (under 500 limit). Pre-existing build failure (AI SDK v6 CoreMessage in streaming.ts) confirmed identical before and after changes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/stores/__tests__/research-store-crud.test.ts` | 0 | ✅ pass | 300ms |
| 2 | `pnpm vitest run src/stores/` | 0 | ✅ pass (214 tests, 0 regressions) | 314ms |
| 3 | `npx eslint src/stores/research-store.ts src/stores/research-store-events.ts src/stores/research-store-persist.ts src/stores/__tests__/research-store-crud.test.ts` | 0 | ✅ pass | 2000ms |


## Deviations

Extracted handleEvent to research-store-events.ts — not in original plan but necessary for 500-line ESLint rule. Plan mentioned "extract handleEvent if needed" as optional.

## Known Issues

None.

## Files Created/Modified

- `src/stores/research-store.ts`
- `src/stores/research-store-events.ts`
- `src/stores/research-store-persist.ts`
- `src/stores/__tests__/research-store-crud.test.ts`


## Deviations
Extracted handleEvent to research-store-events.ts — not in original plan but necessary for 500-line ESLint rule. Plan mentioned "extract handleEvent if needed" as optional.

## Known Issues
None.
