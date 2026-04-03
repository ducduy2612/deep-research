# S03: Research Workspace — Per-Task CRUD + Review Loop — UAT

**Milestone:** M003
**Written:** 2026-04-03T16:36:32.871Z

# S03: Research Workspace — Per-Task CRUD + Review Loop — UAT

**Milestone:** M003
**Written:** 2026-04-03

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All features are testable through automated tests (store actions, component rendering, hook integration) and build verification. No live server interaction required.

## Preconditions

- `pnpm install` completed
- Dev dependencies available (vitest, eslint, typescript)
- `GOOGLE_GENERATIVE_AI_API_KEY` set for build (or build skipped — tests don't need it)

## Smoke Test

Run `pnpm vitest run src/stores/__tests__/research-store-crud.test.ts` — all 16 tests must pass.

## Test Cases

### 1. Delete search result removes query + learning + sources

1. Initialize store with 3 search results (each with learning, sources, images)
2. Call `removeSearchResult(1)` (remove middle result)
3. **Expected:** Store has 2 results. Accumulated learning/sources no longer contain the removed result's data. Sources shared with remaining results are preserved. Activity log records the removal.

### 2. Delete out-of-bounds index is no-op

1. Initialize store with 2 search results
2. Call `removeSearchResult(5)` (invalid index)
3. **Expected:** Store unchanged, no error thrown.

### 3. Delete from null result state is no-op

1. Initialize store with null result (no research done yet)
2. Call `removeSearchResult(0)`
3. **Expected:** Store unchanged, no error thrown.

### 4. Retry search result queues query and removes data

1. Initialize store with search results, one with query "quantum computing basics"
2. Call `retrySearchResult(0)`
3. **Expected:** `pendingRetryQueries` contains "quantum computing basics". Result removed from search results. Learning/sources stripped from accumulated data.

### 5. Multiple retries accumulate in pendingRetryQueries

1. Initialize store with 3 results
2. Call `retrySearchResult(0)` then `retrySearchResult(1)`
3. **Expected:** `pendingRetryQueries` has 2 entries. Only 1 result remains.

### 6. Clear suggestion resets to empty string

1. Set store suggestion to "Focus on recent advances"
2. Call `clearSuggestion()`
3. **Expected:** Suggestion is empty string.

### 7. Pending retry queries persist to localforage and survive hydration

1. Add 2 queries to `pendingRetryQueries`
2. Persist store state
3. Hydrate a fresh store from persisted data
4. **Expected:** `pendingRetryQueries` contains the same 2 queries.

### 8. Backward compatibility — old state without pendingRetryQueries hydrates safely

1. Persist store state WITHOUT `pendingRetryQueries` field
2. Hydrate a fresh store
3. **Expected:** `pendingRetryQueries` defaults to empty array. No parse error.

### 9. SearchResultCard renders with delete and retry buttons

1. Render SearchResultCard with a search result containing query, learning, and 3 sources
2. **Expected:** Card shows truncated query header, source count badge (3), retry button (↻), delete button (X), collapsible learning section, collapsible source list with external links.

### 10. SearchResultCard delete button calls removeSearchResult

1. Render SearchResultCard with mock store containing 1 result
2. Click the delete (X) button
3. **Expected:** `removeSearchResult` called with correct index. Result removed from store.

### 11. ManualQueryInput adds and removes query chips

1. Render ManualQueryInput
2. Type "machine learning ethics" and press Enter
3. **Expected:** Chip with "machine learning ethics" appears.
4. Click the X on the chip.
5. **Expected:** Chip removed. `manualQueries` in store is empty.

### 12. requestMoreResearch merges retry + manual + suggestion

1. Set store: `pendingRetryQueries` = ["quantum basics"], `manualQueries` = ["ethics in AI"], `suggestion` = "Focus on 2024 papers"
2. Call `requestMoreResearch()`
3. **Expected:** Enhanced plan string includes all three inputs. `pendingRetryQueries`, `manualQueries`, and `suggestion` are all cleared BEFORE connectSSE is called.

### 13. finalizeFindings freezes research and triggers report generation

1. Run multi-phase pipeline: clarify → plan → research (with results)
2. Call `finalizeFindings()`
3. **Expected:** Research checkpoint frozen. State transitions to report generation phase. Activity log records "Checkpoint frozen: research".

### 14. ResearchActions shows ManualQueryInput and Finalize Findings button

1. Render ResearchActions in research phase with active streaming
2. **Expected:** ManualQueryInput visible above suggestion textarea. "More Research" button shows pending count badge. "Finalize Findings" button visible as primary action.

### 15. i18n keys present in both en.json and vi.json

1. Check messages/en.json for keys: moreResearch, finalizeFindings, pendingQueries
2. Check messages/vi.json for same keys
3. **Expected:** All keys present with non-empty values in both files.

## Edge Cases

### Delete all search results

1. Initialize store with 2 results
2. Call `removeSearchResult(0)` then `removeSearchResult(0)` (indices shift)
3. **Expected:** Store has 0 results. Accumulated learning/sources/images empty.

### Retry then delete same result

1. Initialize with 1 result, call `retrySearchResult(0)`
2. Queue now has the query, results are empty
3. **Expected:** No crash. `pendingRetryQueries` has 1 entry. Store has 0 results.

### Empty suggestion sent to More Research

1. Set suggestion to "" (empty), no retry queries, no manual queries
2. Call `requestMoreResearch()`
3. **Expected:** Enhanced plan string has no extra inputs (or empty section). SSE request still sends successfully.

## Failure Signals

- Any of the 16 CRUD tests fail
- Any of the 10 multi-phase hook tests fail
- ESLint errors on modified files
- Build fails with TypeScript errors referencing SearchResultCard, ManualQueryInput, or finalizeFindings
- Missing i18n keys causing render crashes

## Requirements Proved By This UAT

- R052 — Per-task CRUD (delete, retry, manual queries): Tests 1-5, 9-11
- R053 — Suggestion input + review round: Test 6, 12, 15
- R054 — Finalize Findings freeze: Test 13, 14

## Not Proven By This UAT

- Live SSE stream interaction with retry queries (tested with mock SSE)
- Visual rendering in browser (component tests verify structure, not pixel accuracy)
- PDF/export functionality (deferred to S05)
- Knowledge base integration from search results (deferred to S05)

## Notes for Tester

- The 1 pre-existing test failure in streaming.ts (AI SDK v6 CoreMessage migration) is unrelated to this slice — ignore it.
- `pnpm build` may fail due to the same AI SDK v6 issue in streaming.ts — this is expected and tracked separately.
- All new components use `useResearchStore.getState()` for mutations (not hooks inside callbacks), following the established pattern from S06.

