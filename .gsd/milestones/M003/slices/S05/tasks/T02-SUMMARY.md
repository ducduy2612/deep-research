---
id: T02
parent: S05
milestone: M003
provides: []
requires: []
affects: []
key_files: ["src/utils/export-search.ts", "src/components/research/SearchResultCard.tsx", "src/utils/__tests__/export-search.test.ts", "messages/en.json", "messages/vi.json"]
key_decisions: ["Used "file" type for KB items from search results since no "research" type exists in KnowledgeItem", "Reused click-outside dropdown pattern from T01's FinalReport export menu"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 10 new unit tests pass. Full suite 732/732 pass. `pnpm build` compiles clean. `pnpm lint` reports no warnings or errors. SearchResultCard.tsx at 240 lines under 500-line limit."
completed_at: 2026-04-03T18:03:04.491Z
blocker_discovered: false
---

# T02: Added per-card export dropdown (MD/JSON) and Add-to-Knowledge-Base button to each SearchResultCard with serialization helpers and unit tests

> Added per-card export dropdown (MD/JSON) and Add-to-Knowledge-Base button to each SearchResultCard with serialization helpers and unit tests

## What Happened
---
id: T02
parent: S05
milestone: M003
key_files:
  - src/utils/export-search.ts
  - src/components/research/SearchResultCard.tsx
  - src/utils/__tests__/export-search.test.ts
  - messages/en.json
  - messages/vi.json
key_decisions:
  - Used "file" type for KB items from search results since no "research" type exists in KnowledgeItem
  - Reused click-outside dropdown pattern from T01's FinalReport export menu
duration: ""
verification_result: passed
completed_at: 2026-04-03T18:03:04.492Z
blocker_discovered: false
---

# T02: Added per-card export dropdown (MD/JSON) and Add-to-Knowledge-Base button to each SearchResultCard with serialization helpers and unit tests

**Added per-card export dropdown (MD/JSON) and Add-to-Knowledge-Base button to each SearchResultCard with serialization helpers and unit tests**

## What Happened

Created `src/utils/export-search.ts` with three helpers: `serializeSearchResultAsMd` (formats learning + sources as markdown with optional Sources section), `serializeSearchResultsAsJson` (pretty-printed JSON array), and `searchResultToKnowledgeItem` (converts SearchResult to KnowledgeItem using nanoid, with "file" type since no "research" type exists). Modified `SearchResultCard.tsx` to add a Download icon button with a dropdown (Export as Markdown / Export as JSON) using click-outside-to-close pattern from T01, and a Database icon button that adds the result to the knowledge base via `useKnowledgeStore.getState().add()` with a sonner success toast. Filenames are sanitized via `sanitizeFilename`. Added 4 i18n keys to both en.json and vi.json. Wrote 10 unit tests covering all three helpers with nanoid mocked for deterministic output.

## Verification

All 10 new unit tests pass. Full suite 732/732 pass. `pnpm build` compiles clean. `pnpm lint` reports no warnings or errors. SearchResultCard.tsx at 240 lines under 500-line limit.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/utils/__tests__/export-search.test.ts` | 0 | ✅ pass | 100ms |
| 2 | `pnpm vitest run` | 0 | ✅ pass | 2260ms |
| 3 | `pnpm build` | 0 | ✅ pass | 30000ms |
| 4 | `pnpm lint` | 0 | ✅ pass | 5000ms |


## Deviations

None. Implementation matches the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/utils/export-search.ts`
- `src/components/research/SearchResultCard.tsx`
- `src/utils/__tests__/export-search.test.ts`
- `messages/en.json`
- `messages/vi.json`


## Deviations
None. Implementation matches the task plan exactly.

## Known Issues
None.
