---
estimated_steps: 6
estimated_files: 3
skills_used: []
---

# T01: Store actions for delete/retry + persist extension + tests

**Slice:** S03 — Research Workspace — Per-Task CRUD + Review Loop
**Milestone:** M003

## Description

Add three new store actions and one new state field to support the research workspace CRUD model. `removeSearchResult(index)` deletes a search result and strips its learning/sources/images from the accumulated `result`. `retrySearchResult(index)` stores the query for re-execution and removes the result. `clearSuggestion()` is a convenience setter. `pendingRetryQueries` is a new persisted field holding queries queued for retry.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| N/A — store actions are synchronous | N/A | N/A | N/A |

## Negative Tests

- **Malformed inputs**: removeSearchResult with out-of-bounds index (no-op), retrySearchResult with invalid index (no-op)
- **Error paths**: N/A — synchronous store mutations
- **Boundary conditions**: delete from empty searchResults, delete last remaining result (result.learnings/sources/images should be empty arrays)

## Steps

1. Add `pendingRetryQueries: readonly string[]` field to `ResearchStoreState` interface in `src/stores/research-store.ts` (after `manualQueries`). Add to `INITIAL_STATE` as `[]`. Add `pendingRetryQueries` setter.

2. Implement `removeSearchResult(index: number)` action:
   - Validate index is in bounds; if not, no-op
   - Get the target result at `searchResults[index]`
   - Collect its source URLs: `target.sources.map(s => s.url)`
   - Collect its image URLs: `target.images.map(img => img.url)`
   - Collect URLs from all OTHER remaining results (after removal)
   - Filter `result.sources` to keep only URLs that appear in remaining results
   - Filter `result.images` similarly
   - Filter `result.learnings` to remove `target.learning` (exact string match, first occurrence only)
   - Update `searchResults` with the item removed
   - Log activity: `Removed search result: {target.query}`
   - Set all updated fields atomically

3. Implement `retrySearchResult(index: number)` action:
   - Validate index is in bounds; if not, no-op
   - Get `searchResults[index].query`
   - Append query to `pendingRetryQueries`
   - Then perform same removal as `removeSearchResult` (extract a shared helper if desired, or inline)
   - Log activity: `Queued retry for: {query}`

4. Implement `clearSuggestion()` action: simple `set({ suggestion: "" })`.

5. Update `src/stores/research-store-persist.ts`: add `pendingRetryQueries: z.array(z.string()).optional().default([])` to `persistedStateSchema`.

6. Update hydrate in `src/stores/research-store.ts`: add `pendingRetryQueries: saved.pendingRetryQueries ?? []` to hydrate set call. Update auto-persist subscription to include `pendingRetryQueries` in `persistData`. Add to interface type if needed.

7. Create `src/stores/__tests__/research-store-crud.test.ts` with these tests:
   - removeSearchResult removes the correct item from searchResults
   - removeSearchResult strips learning from result.learnings
   - removeSearchResult strips sources from result.sources (only URLs not in remaining results)
   - removeSearchResult strips images from result.images
   - removeSearchResult with out-of-bounds index is no-op
   - removeSearchResult when result is null (no accumulated result yet) still removes from searchResults
   - retrySearchResult stores query in pendingRetryQueries and removes from searchResults
   - retrySearchResult strips learning/sources/images same as delete
   - retrySearchResult with invalid index is no-op
   - pendingRetryQueries persists across hydrate round-trip
   - clearSuggestion sets suggestion to empty string
   - Multiple pending retries accumulate (retry 2 results → 2 pending queries)
   - Delete all results leaves empty arrays

   Use the same mock pattern as `research-store-freeze.test.ts`: mock `@/lib/storage`, use `dispatch()` helper for SSE events, set up searchResults via store events before testing actions.

## Must-Haves

- [ ] removeSearchResult(index) removes search result and strips its data from result.learnings/sources/images
- [ ] retrySearchResult(index) stores query in pendingRetryQueries and removes result
- [ ] pendingRetryQueries field persists to localforage and survives hydrate
- [ ] clearSuggestion() action exists
- [ ] All new tests pass
- [ ] Store file stays within acceptable line count (extract handleEvent if needed)

## Verification

- `pnpm vitest run src/stores/__tests__/research-store-crud.test.ts` — all tests pass
- `pnpm vitest run src/stores/` — no regressions in existing store tests

## Observability Impact

- Signals added: Activity log entries for delete/retry/clearSuggestion actions
- How a future agent inspects this: `useResearchStore.getState().pendingRetryQueries` and `useResearchStore.getState().activityLog`
- Failure state exposed: N/A — synchronous mutations

## Inputs

- `src/stores/research-store.ts` — current store with searchResults, manualQueries, suggestion, freeze
- `src/stores/research-store-persist.ts` — current persist schema with checkpoints and manualQueries
- `src/engine/research/types.ts` — SearchResult, Source, ImageSource types

## Expected Output

- `src/stores/research-store.ts` — add removeSearchResult, retrySearchResult, clearSuggestion, pendingRetryQueries
- `src/stores/research-store-persist.ts` — add pendingRetryQueries to persist schema
- `src/stores/__tests__/research-store-crud.test.ts` — tests for all new CRUD actions
