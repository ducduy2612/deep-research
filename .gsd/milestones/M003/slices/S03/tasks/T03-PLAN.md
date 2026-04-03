---
estimated_steps: 6
estimated_files: 5
skills_used: []
---

# T03: Hook extension + ResearchActions + ActiveResearchCenter wiring

**Slice:** S03 — Research Workspace — Per-Task CRUD + Review Loop
**Milestone:** M003

## Description

Wire the store actions and UI components together. Extend the `requestMoreResearch` hook to consume pending retries + manual queries + suggestion, appending them to the plan string and clearing after send. Add `finalizeFindings` to the hook that freezes research then generates the report. Update ResearchActions with renamed buttons and pending count display. Replace the plain div rendering of search results in ActiveResearchCenter's `renderStreamingView` with SearchResultCard components, and add ManualQueryInput to the research actions area.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| SSE connection (connectSSE) | Error surfaces via store error state + sonner toast | Abort after 5min (existing timeout) | SSE parser handles partial chunks (existing) |
| Store persistence (localforage) | Caught by try/catch in persist subscription, logged to console | N/A | Zod validation rejects malformed stored data |

## Steps

1. Extend `requestMoreResearch` in `src/hooks/use-research.ts`:
   - Read `pendingRetryQueries`, `manualQueries`, and `suggestion` from store state
   - Build enhanced plan string: start with base plan, then append sections for retry queries, manual queries, and suggestion if each is non-empty
   - Format: `"Original plan...\n\nRetry queries:\n- query1\n- query2\n\nManual queries:\n- query3\n\nAdditional direction:\n{suggestion}"`
   - After `connectSSE()` is called (or before — since connectSSE reads from store, clear AFTER the call starts): clear `pendingRetryQueries`, `manualQueries`, and `suggestion` by calling store setters
   - Actually, since connectSSE reads from store.getState() at call time, clear BEFORE calling connectSSE to avoid race. No — the plan string is built from getState() inline, so we build the string first, then clear, then call connectSSE with the pre-built string. This avoids any async timing issue.
   - Correct flow: `const { plan, suggestion, manualQueries, pendingRetryQueries, ... } = getState()` → build planString → `store.setManualQueries([])`, `store.setPendingRetryQueries([])`, `store.setSuggestion('')` → `connectSSE({ phase: 'research', plan: planString })`

2. Add `finalizeFindings` callback in `src/hooks/use-research.ts`:
   - `const finalizeFindings = useCallback(async () => { useResearchStore.getState().freeze('research'); await generateReport(); }, [generateReport])`
   - Export from the hook return object

3. Update `src/components/research/ResearchActions.tsx`:
   - Add `onFinalizeFindings: () => void` prop
   - Subscribe to `pendingRetryQueries` and `manualQueries` from store for pending count
   - Compute `pendingCount = pendingRetryQueries.length + manualQueries.length`
   - Rename "Continue Research" button text to "More Research" (update i18n key)
   - Show pending count badge next to "More Research" when pendingCount > 0: `{pendingCount} pending`
   - Add "Finalize Findings" button — prominent, same style as Generate Report button
   - The existing "Generate Report" button should be replaced by "Finalize Findings" (since finalize includes freeze + generate)
   - Add ManualQueryInput component above the suggestion textarea
   - Target: keep under 250 lines (currently 188)

4. Update `src/components/research/ActiveResearchCenter.tsx`:
   - Import SearchResultCard
   - In `renderStreamingView()`, replace the plain div rendering of searchResults with SearchResultCard components:
     ```tsx
     {searchResults.map((result, idx) => (
       <SearchResultCard key={`${result.query}-${idx}`} result={result} index={idx} />
     ))}
     ```
   - Pass `onFinalizeFindings` prop through to ResearchActions

5. Add i18n keys to `messages/en.json`:
   - `ResearchActions.moreResearch`: "More Research"
   - `ResearchActions.finalizeFindings`: "Finalize Findings"
   - `ResearchActions.pendingQueries`: "{count} pending"
   - Update `ResearchActions.continueResearch` → keep as fallback or rename to `moreResearch`

6. Add Vietnamese translations to `messages/vi.json` for all new keys.

## Must-Haves

- [ ] requestMoreResearch appends pending retries + manual queries + suggestion to plan, clears them after
- [ ] finalizeFindings calls freeze('research') then generateReport()
- [ ] ResearchActions shows "More Research" button with pending count, "Finalize Findings" button
- [ ] ManualQueryInput rendered in ResearchActions
- [ ] ActiveResearchCenter renders SearchResultCards instead of plain divs
- [ ] All i18n keys added to en.json and vi.json
- [ ] All tests pass, build succeeds

## Verification

- `pnpm vitest run --reporter=verbose 2>&1 | tail -20` — all tests pass
- `pnpm build 2>&1 | tail -5` — build succeeds
- `rg "finalizeFindings" src/hooks/use-research.ts` — new hook action present
- `rg "SearchResultCard" src/components/research/ActiveResearchCenter.tsx` — wired in
- `rg "More Research\|moreResearch" messages/en.json` — i18n key present

## Observability Impact

- Signals added: Activity log entries from freeze('research') and store mutations during more-research flow
- How a future agent inspects this: `useResearchStore.getState().checkpoints.research` after finalize, activity log for mutation events
- Failure state exposed: Store error state if SSE connection fails during more-research

## Inputs

- `src/stores/research-store.ts` — pendingRetryQueries, manualQueries, clearSuggestion, freeze, removeSearchResult, retrySearchResult (from T01)
- `src/hooks/use-research.ts` — requestMoreResearch to extend, generateReport to call from finalizeFindings
- `src/components/research/ResearchActions.tsx` — existing actions panel to update
- `src/components/research/ActiveResearchCenter.tsx` — renderStreamingView to update
- `src/components/research/SearchResultCard.tsx` — new card component (from T02)
- `src/components/research/ManualQueryInput.tsx` — new input component (from T02)

## Expected Output

- `src/hooks/use-research.ts` — extended requestMoreResearch + finalizeFindings
- `src/components/research/ResearchActions.tsx` — updated with More Research + Finalize Findings + ManualQueryInput + pending count
- `src/components/research/ActiveResearchCenter.tsx` — renderStreamingView uses SearchResultCard
- `messages/en.json` — new keys for moreResearch, finalizeFindings, pendingQueries
- `messages/vi.json` — Vietnamese translations
