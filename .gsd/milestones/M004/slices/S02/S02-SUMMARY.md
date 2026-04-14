---
id: S02
parent: M004
milestone: M004
provides:
  - ["autoReviewCurrentRound/TotalRounds persisted store fields", "Auto-review progress banner with round N/M display in ResearchActions", "Abort auto-review callback wired from page.tsx through component hierarchy", "4 i18n keys for auto-review in en.json and vi.json", "27 unit tests for store persistence, hook trigger, and component rendering"]
requires:
  - slice: S01
    provides: autoReviewRoundsRemaining store field, review-result SSE event type, auto-review trigger useEffect in use-research.ts, reviewOnly() orchestrator method, /api/research/stream route with review phase
affects:
  []
key_files:
  - ["src/stores/research-store.ts", "src/stores/research-store-persist.ts", "src/hooks/use-research.ts", "src/stores/research-store-events.ts", "src/components/research/ResearchActions.tsx", "src/components/research/ActiveResearchCenter.tsx", "src/components/research/ActiveResearch.tsx", "src/app/page.tsx", "messages/en.json", "messages/vi.json", "src/stores/__tests__/research-store-auto-review.test.ts", "src/components/research/__tests__/ResearchActions.test.tsx", "src/hooks/__tests__/use-research-auto-review.test.ts"]
key_decisions:
  - (none)
patterns_established:
  - ["Persisted round-tracking fields (currentRound/totalRounds) alongside remaining counter for progress display", "Abort callback threading from top-level page component through intermediate components to leaf action component", "Separating auto-review tests into feature-named files (use-research-auto-review.test.ts) when existing test file hits ESLint 500-line limit"]
observability_surfaces:
  - none
drill_down_paths:
  - ["tasks/T01-SUMMARY.md", "tasks/T02-SUMMARY.md", "tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-14T18:15:29.090Z
blocker_discovered: false
---

# S02: Hook + store review integration

**Added auto-review round tracking (currentRound/totalRounds) to persisted store, rendered progress banner in ResearchActions with spinner and abort button, and wrote 27 new tests covering store persistence, hook trigger, and component rendering.**

## What Happened

## Slice Summary

S02 made auto-review visibly stateful in the UI by adding round progress tracking and a progress banner with abort capability.

### T01: Store fields + persist + hook integration
Added `autoReviewCurrentRound` and `autoReviewTotalRounds` to the research store state interface, INITIAL_STATE, Zod persist schema, hydration logic, and the auto-review trigger useEffect in use-research.ts. The trigger effect writes both fields in the same setState call that decrements autoReviewRoundsRemaining. The review-result event handler resets both to 0 when autoReviewRoundsRemaining reaches 0. Both fields are persisted to localforage, surviving page refreshes during active auto-review.

### T02: UI banner + abort + i18n
Rendered auto-review state in ResearchActions: when `state === 'reviewing' && autoReviewCurrentRound > 0`, a sheet-styled banner shows "Auto-review round N/M..." with a Loader2 spinner and abort button. The suggestion textarea, ManualQueryInput, More Research, and Finalize buttons are all hidden during auto-review. The abort handler is created in page.tsx (which has access to useResearch's abort function) and threaded through ActiveResearch → ActiveResearchCenter → ResearchActions. Added 4 i18n keys to both en.json and vi.json.

### T03: Unit tests (27 new)
Created 3 new test files:
- `research-store-auto-review.test.ts` (12 tests): initial state, persistence, hydration with values, hydration fallback, malformed input rejection, review-result reset, boundary conditions
- `ResearchActions.test.tsx` (12 tests): banner rendering, round number display, button visibility during auto-review vs normal review, abort click handler, spinner display
- `use-research-auto-review.test.ts` (3 tests): trigger sets correct currentRound and totalRounds, abort during auto-review

Test count: 796 → 823 across 40 → 43 files.

### Requirements Validated
- R065: Auto-review and manual "More Research" use the same phase:review endpoint with learnings
- R066: Auto-review shows visible round progress with abort capability
- R067: Review phase sends accumulated learnings to avoid duplication

## Verification

Slice-level verification all passing:
- `pnpm test --run`: 823 tests pass across 43 test files (27 new tests from T03)
- `pnpm build`: Clean build with no type errors
- `grep -c 'autoReviewCurrentRound'`: Confirmed in research-store.ts (4), research-store-persist.ts (1), use-research.ts (1), research-store-events.ts (2), ResearchActions.tsx (3)
- `grep -c 'autoReviewProgress'`: Confirmed in both en.json and vi.json
- `grep -c 'onAbortAutoReview'`: Prop threading confirmed through ResearchActions.tsx (5), ActiveResearchCenter.tsx (3), ActiveResearch.tsx (3), page.tsx (1)
- All i18n keys present in both locales

## Requirements Advanced

None.

## Requirements Validated

- R065 — Auto-review and manual 'More Research' both use phase:review SSE endpoint with learnings. Verified by store auto-review trigger tests and route integration tests from S01.
- R066 — ResearchActions shows 'Auto-review round N/M...' banner with spinner during auto-review. Abort button resets store and calls SSE abort. Verified by ResearchActions.test.tsx (12 tests).
- R067 — Review phase sends accumulated learnings, sources, and images to AI via reviewOnly(). Auto-review uses same path as manual review. Verified by S01 route tests and S02 hook tests.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.
