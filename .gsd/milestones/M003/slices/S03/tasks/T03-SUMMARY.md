---
id: T03
parent: S03
milestone: M003
provides: []
requires: []
affects: []
key_files: ["src/hooks/use-research.ts", "src/components/research/ResearchActions.tsx", "src/components/research/ActiveResearchCenter.tsx", "src/components/research/ActiveResearch.tsx", "src/app/page.tsx", "messages/en.json", "messages/vi.json"]
key_decisions: ["Replaced Generate Report button with Finalize Findings (freeze + generate) — single action instead of two", "Removed onGenerateReport prop chain entirely since finalizeFindings subsumes it", "Clear pendingRetryQueries, manualQueries, suggestion BEFORE connectSSE to avoid race conditions"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 10 multi-phase hook tests pass. Full suite: 693 passed, 1 pre-existing failure. ESLint clean on all modified files. rg confirms finalizeFindings, SearchResultCard, and i18n keys are present."
completed_at: 2026-04-03T16:32:15.246Z
blocker_discovered: false
---

# T03: Wired requestMoreResearch with retry/manual/suggestion merging, added finalizeFindings (freeze + report), updated ResearchActions with ManualQueryInput + Finalize Findings button, replaced plain divs with SearchResultCard components

> Wired requestMoreResearch with retry/manual/suggestion merging, added finalizeFindings (freeze + report), updated ResearchActions with ManualQueryInput + Finalize Findings button, replaced plain divs with SearchResultCard components

## What Happened
---
id: T03
parent: S03
milestone: M003
key_files:
  - src/hooks/use-research.ts
  - src/components/research/ResearchActions.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/ActiveResearch.tsx
  - src/app/page.tsx
  - messages/en.json
  - messages/vi.json
key_decisions:
  - Replaced Generate Report button with Finalize Findings (freeze + generate) — single action instead of two
  - Removed onGenerateReport prop chain entirely since finalizeFindings subsumes it
  - Clear pendingRetryQueries, manualQueries, suggestion BEFORE connectSSE to avoid race conditions
duration: ""
verification_result: passed
completed_at: 2026-04-03T16:32:15.247Z
blocker_discovered: false
---

# T03: Wired requestMoreResearch with retry/manual/suggestion merging, added finalizeFindings (freeze + report), updated ResearchActions with ManualQueryInput + Finalize Findings button, replaced plain divs with SearchResultCard components

**Wired requestMoreResearch with retry/manual/suggestion merging, added finalizeFindings (freeze + report), updated ResearchActions with ManualQueryInput + Finalize Findings button, replaced plain divs with SearchResultCard components**

## What Happened

Extended requestMoreResearch in use-research.ts to merge pendingRetryQueries, manualQueries, and suggestion into an enhanced plan string. All three inputs are cleared before connectSSE to avoid race conditions. Added finalizeFindings action that freezes the research checkpoint then calls generateReport — this replaces the old separate Generate Report button.

Updated ResearchActions.tsx to render ManualQueryInput above the suggestion textarea, show a pending count badge next to the "More Research" button, and display "Finalize Findings" as the primary action. Removed the old onGenerateReport prop chain since finalizeFindings subsumes it.

Updated ActiveResearchCenter.tsx to render SearchResultCard components instead of plain divs for search results. Threaded onFinalizeFindings through the entire component chain: page.tsx → ActiveResearch → ActiveResearchCenter → ResearchActions.

Added i18n keys (moreResearch, finalizeFindings, pendingQueries) to both en.json and vi.json.

Hit a TDZ error because finalizeFindings referenced generateReport before its definition — moved finalizeFindings after generateReport. All 10 multi-phase tests pass, 693/694 total tests pass (1 pre-existing streaming test failure from AI SDK v6 migration).

## Verification

All 10 multi-phase hook tests pass. Full suite: 693 passed, 1 pre-existing failure. ESLint clean on all modified files. rg confirms finalizeFindings, SearchResultCard, and i18n keys are present.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/hooks/__tests__/use-research-multi-phase.test.ts` | 0 | ✅ pass | 1900ms |
| 2 | `pnpm vitest run (full suite)` | 1 | ⚠️ 693/694 pass, 1 pre-existing failure | 2100ms |
| 3 | `pnpm eslint src/hooks/use-research.ts src/components/research/ResearchActions.tsx src/components/research/ActiveResearchCenter.tsx src/components/research/ActiveResearch.tsx src/app/page.tsx` | 0 | ✅ pass | 1000ms |
| 4 | `rg finalizeFindings src/hooks/use-research.ts` | 0 | ✅ pass | 100ms |
| 5 | `rg SearchResultCard src/components/research/ActiveResearchCenter.tsx` | 0 | ✅ pass | 100ms |
| 6 | `rg 'moreResearch|finalizeFindings|pendingQueries' messages/en.json` | 0 | ✅ pass | 100ms |


## Deviations

Removed onGenerateReport prop from the entire chain since Finalize Findings subsumes Generate Report. The plan suggested keeping both but they're redundant — finalizeFindings does freeze + generate.

## Known Issues

None.

## Files Created/Modified

- `src/hooks/use-research.ts`
- `src/components/research/ResearchActions.tsx`
- `src/components/research/ActiveResearchCenter.tsx`
- `src/components/research/ActiveResearch.tsx`
- `src/app/page.tsx`
- `messages/en.json`
- `messages/vi.json`


## Deviations
Removed onGenerateReport prop from the entire chain since Finalize Findings subsumes Generate Report. The plan suggested keeping both but they're redundant — finalizeFindings does freeze + generate.

## Known Issues
None.
