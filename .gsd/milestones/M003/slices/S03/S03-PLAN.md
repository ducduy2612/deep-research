# S03: Research Workspace — Per-Task CRUD + Review Loop

**Goal:** Interactive research workspace where each search result is a card with delete (X) and retry (↻) buttons. Users can add manual search queries queued for the next "More Research" batch. A suggestion textarea steers research direction. One review round per "More Research" click. "Finalize Findings" freezes research and transitions to report generation.
**Demo:** After this: Each search result is a card with delete (X) and retry (↻) buttons. Delete removes query+learning+sources. Retry re-searches that single query. Manual query input queues for next batch. Suggestion textarea appears before 'More Research'. One review round per click. 'Finalize Findings' freezes research.

## Tasks
- [x] **T01: Add removeSearchResult, retrySearchResult, clearSuggestion actions with pendingRetryQueries persistence and extract handleEvent to separate module** — Add removeSearchResult(index), retrySearchResult(index), clearSuggestion() actions to research-store.ts. Add pendingRetryQueries field. Update persist schema in research-store-persist.ts. Write comprehensive tests for all new actions.
  - Estimate: 1h
  - Files: src/stores/research-store.ts, src/stores/research-store-persist.ts, src/stores/__tests__/research-store-crud.test.ts
  - Verify: pnpm vitest run src/stores/__tests__/research-store-crud.test.ts
- [x] **T02: Built SearchResultCard (delete/retry/collapsible learning+sources) and ManualQueryInput (input+removable chips) with full i18n** — Build SearchResultCard component showing search result with delete/retry buttons, collapsible learning section, source list. Build ManualQueryInput with text input + Add button + removable chip list. Both use store actions from T01.
  - Estimate: 1h
  - Files: src/components/research/SearchResultCard.tsx, src/components/research/ManualQueryInput.tsx, messages/en.json, messages/vi.json
  - Verify: pnpm build 2>&1 | tail -5
- [x] **T03: Wired requestMoreResearch with retry/manual/suggestion merging, added finalizeFindings (freeze + report), updated ResearchActions with ManualQueryInput + Finalize Findings button, replaced plain divs with SearchResultCard components** — Extend requestMoreResearch to consume pending retries + manual queries + suggestion. Add finalizeFindings to hook. Update ResearchActions: rename button, add Finalize Findings, show pending count. Wire SearchResultCard + ManualQueryInput into ActiveResearchCenter. Add i18n keys.
  - Estimate: 1.5h
  - Files: src/hooks/use-research.ts, src/components/research/ResearchActions.tsx, src/components/research/ActiveResearchCenter.tsx, messages/en.json, messages/vi.json
  - Verify: pnpm vitest run --reporter=verbose 2>&1 | tail -20 && pnpm build 2>&1 | tail -5
