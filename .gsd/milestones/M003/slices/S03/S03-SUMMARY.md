---
id: S03
parent: M003
milestone: M003
provides:
  - SearchResultCard component for rendering individual search results with delete/retry
  - ManualQueryInput component for queuing manual search queries
  - removeSearchResult, retrySearchResult, clearSuggestion store actions
  - pendingRetryQueries persistence in store schema
  - finalizeFindings action (freeze + generate report)
  - requestMoreResearch enhanced with retry/manual/suggestion merging
requires:
  - slice: S01
    provides: Checkpoint/workspace store separation with freeze() action and workspace persistence
  - slice: S02
    provides: PhaseAccordion layout with frozen/active distinction, render props pattern for workspace content
affects:
  - S04
key_files:
  - src/stores/research-store.ts
  - src/stores/research-store-events.ts
  - src/stores/research-store-persist.ts
  - src/stores/__tests__/research-store-crud.test.ts
  - src/components/research/SearchResultCard.tsx
  - src/components/research/ManualQueryInput.tsx
  - src/hooks/use-research.ts
  - src/components/research/ResearchActions.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/ActiveResearch.tsx
  - src/app/page.tsx
key_decisions:
  - Extracted handleEvent to research-store-events.ts for 500-line ESLint compliance
  - Shared stripResultData helper avoids duplication between removeSearchResult and retrySearchResult
  - Clear pendingRetryQueries/manualQueries/suggestion BEFORE connectSSE to avoid race conditions
  - FinalizeFindings subsumes generateReport — single action freezes research + triggers report, removing the separate Generate Report button and its 4-component prop chain
patterns_established:
  - handleEvent extraction pattern for large Zustand stores
  - stripResultData helper for symmetric delete/retry operations
  - Clear-then-connect pattern: clear input queues before async operations that consume them
  - FinalizeFindings as atomic freeze+generate action
observability_surfaces:
  - pendingRetryQueries persisted to localforage — survives refresh, visible in store devtools
drill_down_paths:
  - .gsd/milestones/M003/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T16:36:32.871Z
blocker_discovered: false
---

# S03: Research Workspace — Per-Task CRUD + Review Loop

**Interactive research workspace with per-search-result CRUD cards (delete/retry), manual query input with chip queue, suggestion textarea, and Finalize Findings action that freezes research and triggers report generation.**

## What Happened

S03 built the research workspace's interactive CRUD layer on top of the checkpoint/workspace store from S01 and the accordion layout from S02.

**T01 (Store Actions):** Added three new store actions to research-store.ts: `removeSearchResult(index)` removes a search result and strips its learning/sources/images from accumulated data; `retrySearchResult(index)` queues the query for re-execution via `pendingRetryQueries` then removes; `clearSuggestion()` clears the suggestion field. Added `pendingRetryQueries` to the persist schema with backward-compatible defaults. Extracted `handleEvent` (362 lines) to a separate `research-store-events.ts` module to keep the main store under the 500-line ESLint max-lines rule. Introduced a shared `stripResultData` helper to avoid duplication between delete and retry. 16 CRUD tests written, all 214 store tests pass.

**T02 (UI Components):** Built `SearchResultCard` (138 lines) — displays each search result with query header, source count badge, retry (↻) and delete (X) buttons, collapsible learning section via MarkdownRenderer, and source list with external links. Built `ManualQueryInput` (101 lines) — text input with Enter-key and Add button support, rendering pending manual queries as removable chips. Both components use `useTranslations` for i18n and `useResearchStore.getState()` for mutations. Full i18n keys added to en.json and vi.json.

**T03 (Wiring):** Extended `requestMoreResearch` to merge pendingRetryQueries + manualQueries + suggestion into the enhanced plan, clearing all three BEFORE connectSSE to avoid race conditions. Added `finalizeFindings` action that freezes the research checkpoint then calls generateReport — this replaces the old separate Generate Report button. Updated ResearchActions to show ManualQueryInput, suggestion textarea, pending count badge on "More Research", and "Finalize Findings" as primary action. Replaced plain divs in ActiveResearchCenter with SearchResultCard components. Removed onGenerateReport prop chain entirely since finalizeFindings subsumes it. Fixed a TDZ error where finalizeFindings referenced generateReport before its definition. 693/694 tests pass (1 pre-existing streaming failure from AI SDK v6 migration).

## Verification

16 CRUD store tests pass, 10 multi-phase hook tests pass, 693/694 total tests pass (1 pre-existing failure in streaming.ts from AI SDK v6 migration). ESLint clean on all 8 modified files. All files under 500-line ESLint max-lines limit. Key exports confirmed via rg: finalizeFindings, SearchResultCard, ManualQueryInput, removeSearchResult, retrySearchResult, clearSuggestion, pendingRetryQueries all present in expected files.

## Requirements Advanced

- R052 — SearchResultCard with delete/retry buttons, ManualQueryInput for manual queries, all wired to store actions with 16 CRUD tests
- R053 — Suggestion textarea in ResearchActions consumed by requestMoreResearch and sent in enhanced plan string
- R054 — FinalizeFindings action freezes research checkpoint and triggers report generation atomically

## Requirements Validated

- R052 — SearchResultCard delete/retry buttons work, ManualQueryInput queues queries, store actions tested with 16 CRUD tests + 10 hook tests
- R053 — Suggestion textarea appears before More Research button, value consumed and cleared on click, confirmed in hook tests
- R054 — Finalize Findings button triggers freeze + generateReport, confirmed in multi-phase hook tests (full pipeline test)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

None.

## Deviations

Extracted handleEvent to research-store-events.ts — plan listed this as optional, needed for 500-line ESLint rule. Removed onGenerateReport prop chain entirely — plan suggested keeping both buttons but finalizeFindings subsumes generateReport, making it redundant.

## Known Limitations

Retry searches use the same enhanced plan string format — if the AI generates different follow-up queries, the original query's retry may produce slightly different results. The pre-existing streaming.ts test failure (AI SDK v6 CoreMessage migration) is unrelated but blocks a clean 694/694 test run.

## Follow-ups

S04 (Report Workspace) will need to consume the frozen research checkpoint from finalizeFindings. The report phase's feedback + regeneration flow depends on the checkpoint structure established here.

## Files Created/Modified

- `src/stores/research-store.ts` — Added removeSearchResult, retrySearchResult, clearSuggestion actions + pendingRetryQueries field
- `src/stores/research-store-events.ts` — New file — extracted handleEvent (362 lines) from store to stay under 500-line ESLint limit
- `src/stores/research-store-persist.ts` — Added pendingRetryQueries to persist schema with backward-compatible defaults
- `src/stores/__tests__/research-store-crud.test.ts` — New file — 16 tests for CRUD actions, edge cases, persistence round-trip
- `src/components/research/SearchResultCard.tsx` — New component (138 lines) — search result card with delete/retry, collapsible learning+sources
- `src/components/research/ManualQueryInput.tsx` — New component (101 lines) — text input + Add button + removable chip list
- `src/hooks/use-research.ts` — Added finalizeFindings, enhanced requestMoreResearch with retry/manual/suggestion merging
- `src/components/research/ResearchActions.tsx` — Added ManualQueryInput, suggestion textarea, Finalize Findings button, pending count badge
- `src/components/research/ActiveResearchCenter.tsx` — Replaced plain divs with SearchResultCard components, threaded onFinalizeFindings
- `src/components/research/ActiveResearch.tsx` — Threaded onFinalizeFindings prop, removed onGenerateReport
- `src/app/page.tsx` — Updated prop threading for finalizeFindings
- `messages/en.json` — Added i18n keys: moreResearch, finalizeFindings, pendingQueries, searchResult card labels
- `messages/vi.json` — Added Vietnamese translations for all new i18n keys
