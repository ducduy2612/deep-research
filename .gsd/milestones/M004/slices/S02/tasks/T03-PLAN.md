---
estimated_steps: 42
estimated_files: 3
skills_used: []
---

# T03: Add unit tests for auto-review round tracking and ResearchActions banner

Write tests covering: (1) store autoReviewCurrentRound/TotalRounds persistence and hydration, (2) auto-review trigger writing round data, (3) ResearchActions rendering during auto-review vs normal review, (4) abort resetting round fields.

## Steps
1. Create `src/stores/__tests__/research-store-auto-review.test.ts`:
   - Test that INITIAL_STATE has autoReviewCurrentRound=0 and autoReviewTotalRounds=0
   - Test hydration with persisted autoReviewCurrentRound=2, autoReviewTotalRounds=3 values
   - Test hydration with missing fields falls back to 0
   - Test that the review-result event handler resets autoReviewCurrentRound and autoReviewTotalRounds to 0 when autoReviewRoundsRemaining is 0
   - Test that review-result handler does NOT reset round fields when autoReviewRoundsRemaining > 0 (more rounds coming)

2. Add auto-review round tracking tests to `src/hooks/__tests__/use-research.test.ts` (or create a new test file if the existing one is large):
   - Test that the auto-review trigger effect sets autoReviewCurrentRound to the correct round number (e.g., round 1 when totalRounds=2, remaining=2 → currentRound=1)
   - Test that autoReviewTotalRounds is set to settings.autoReviewRounds when trigger fires
   - Test that abort during auto-review resets autoReviewRoundsRemaining to 0
   - These tests should mock useResearchStore and useSettingsStore, trigger state transitions, and assert setState calls

3. Create `src/components/research/__tests__/ResearchActions.test.tsx`:
   - Test that when state='reviewing' and autoReviewCurrentRound=1, autoReviewTotalRounds=2, the banner shows "Auto-review round 1/2..."
   - Test that More Research and Finalize buttons are NOT rendered during auto-review (state='reviewing', autoReviewCurrentRound > 0)
   - Test that when state='awaiting_results_review' and autoReviewCurrentRound=0, the normal UI shows (More Research + Finalize buttons visible, no banner)
   - Test that abort button is visible during auto-review and calls onAbortAutoReview when clicked
   - Use React Testing Library with render + screen.getByText / screen.queryByText for assertions
   - Mock useTranslations and useResearchStore

## Must-Haves
- [ ] Store tests for autoReviewCurrentRound/TotalRounds persistence, hydration, and reset
- [ ] Hook test confirming trigger writes round data to store
- [ ] ResearchActions rendering tests for banner visibility and button visibility
- [ ] All new tests pass alongside existing 796+ tests

## Verification
- `pnpm test --run` — all tests pass (existing + new)
- `pnpm build` — clean

## Negative Tests
- **Malformed inputs**: Test hydration with corrupted persist data (non-numeric values) → falls back to 0
- **Boundary conditions**: Test autoReviewCurrentRound=0 with state='reviewing' → no banner (manual review, not auto-review)
- **Error paths**: Test review-result handler when autoReviewRoundsRemaining=0 → fields reset correctly

## Inputs
- `src/stores/research-store.ts` — store with autoReviewCurrentRound/TotalRounds (from T01)
- `src/stores/research-store-persist.ts` — persist schema (from T01)
- `src/hooks/use-research.ts` — hook with round writing (from T01)
- `src/components/research/ResearchActions.tsx` — component with banner (from T02)
- `src/stores/research-store-events.ts` — event handler (from T01)

## Expected Output
- `src/stores/__tests__/research-store-auto-review.test.ts` — new store test file
- `src/hooks/__tests__/use-research.test.ts` — modified with new auto-review round tests
- `src/components/research/__tests__/ResearchActions.test.tsx` — new component test file

## Inputs

- `src/stores/research-store.ts`
- `src/stores/research-store-persist.ts`
- `src/hooks/use-research.ts`
- `src/components/research/ResearchActions.tsx`
- `src/stores/research-store-events.ts`

## Expected Output

- `src/stores/__tests__/research-store-auto-review.test.ts`
- `src/hooks/__tests__/use-research.test.ts`
- `src/components/research/__tests__/ResearchActions.test.tsx`

## Verification

pnpm test --run && pnpm build
