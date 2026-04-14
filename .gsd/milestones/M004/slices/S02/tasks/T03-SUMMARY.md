---
id: T03
parent: S02
milestone: M004
key_files:
  - src/stores/__tests__/research-store-auto-review.test.ts
  - src/components/research/__tests__/ResearchActions.test.tsx
  - src/hooks/__tests__/use-research-auto-review.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T18:12:50.133Z
blocker_discovered: false
---

# T03: Add unit tests for auto-review round tracking and ResearchActions banner

**Add unit tests for auto-review round tracking and ResearchActions banner**

## What Happened

Created comprehensive unit tests covering all four aspects of the auto-review feature from T01 and T02:

**Store tests (research-store-auto-review.test.ts):** 12 tests covering initial state (autoReviewCurrentRound/TotalRounds = 0), persistence of round fields to storage, hydration with persisted values, hydration fallback when fields are missing, hydration fallback when values are malformed (Zod schema validation rejects non-numeric values), review-result handler resetting round fields when autoReviewRoundsRemaining=0, NOT resetting when rounds remain, boundary conditions (manual review with autoReviewCurrentRound=0), and reset clearing all fields.

**Component tests (ResearchActions.test.tsx):** 12 tests covering auto-review banner rendering with correct round numbers (e.g., "Auto-review round 1/2..."), hiding More Research and Finalize buttons during auto-review, showing them during normal review, abort button visibility and click handler, missing onAbortAutoReview prop, loading spinner for searching/analyzing states, and returning null for idle/completed states.

**Hook tests (use-research-auto-review.test.ts):** 3 tests covering auto-review trigger setting autoReviewCurrentRound to the correct computed value, autoReviewTotalRounds being set from settings.autoReviewRounds, and abort during auto-review correctly setting state to aborted without resetting round fields (which is the page-level handler's responsibility).

Key implementation decisions:
- Extracted auto-review hook tests to a separate file to stay under the 500-line ESLint limit on the existing use-research.test.ts
- Used vi.hoisted for mock store state in component tests to match the project's established pattern
- Used fireEvent instead of @testing-library/user-event (not installed) for component click tests
- Updated storage mock to apply Zod schema validation (matching production behavior) for malformed input test

## Verification

All verification checks pass:
- `pnpm test --run` — all 823 tests pass across 43 test files (12 new store + 12 new component + 3 new hook = 27 new tests)
- `pnpm build` — clean build with no type errors or lint warnings

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test --run` | 0 | ✅ pass | 2310ms |
| 2 | `pnpm build` | 0 | ✅ pass | 28000ms |

## Deviations

Extracted hook tests to a separate file (use-research-auto-review.test.ts) instead of adding to the existing use-research.test.ts, because the existing file was already at the 500-line ESLint limit. Used fireEvent instead of @testing-library/user-event for component click tests because user-event is not installed.

## Known Issues

None.

## Files Created/Modified

- `src/stores/__tests__/research-store-auto-review.test.ts`
- `src/components/research/__tests__/ResearchActions.test.tsx`
- `src/hooks/__tests__/use-research-auto-review.test.ts`
