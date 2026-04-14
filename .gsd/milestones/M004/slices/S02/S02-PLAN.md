# S02: Hook + store review integration

**Goal:** Make auto-review visibly stateful in the UI: add autoReviewCurrentRound/TotalRounds to store, write round data from the auto-review trigger effect in use-research, and render an auto-review progress banner in ResearchActions with round progress, spinner, abort button, and hidden action buttons while auto-review is active.
**Demo:** requestMoreResearch sends phase:review with learnings, auto-review triggers visibly after research completes with round progress

## Must-Haves

- autoReviewCurrentRound and autoReviewTotalRounds are persisted store fields visible in React DevTools
- Auto-review trigger effect writes currentRound and totalRounds to store state
- ResearchActions shows "Auto-review round N/M..." banner with spinner during auto-review (state=reviewing, autoReviewCurrentRound > 0)
- More Research and Finalize Findings buttons are hidden during active auto-review
- Abort button is visible during auto-review and stops the auto-review loop
- All i18n keys exist in both en.json and vi.json
- Full test suite passes (796+ tests)

## Proof Level

- This slice proves: integration

## Integration Closure

Upstream: S01's autoReviewRoundsRemaining store field, review-result SSE event, and auto-review trigger useEffect. New wiring: autoReviewCurrentRound/TotalRounds written by trigger effect, consumed by ResearchActions component for banner rendering. What remains: S03 (UI cleanup), S04 (tests + verification).

## Verification

- autoReviewCurrentRound visible in React DevTools via store selector
- Console log "[useResearch] Auto-review triggered" already logs round/remaining
- ResearchActions banner provides user-visible round progress during auto-review

## Tasks

- [x] **T01: Add autoReviewCurrentRound/TotalRounds store fields, persist schema, and hook integration** `est:45m`
  Add autoReviewCurrentRound and autoReviewTotalRounds to the research store state interface, INITIAL_STATE, persist schema, hydration, and persist subscription. In the auto-review trigger useEffect in use-research.ts, write currentRound and totalRounds to store state alongside the existing autoReviewRoundsRemaining decrement. Reset both fields to 0 when the review-result handler detects all rounds are complete (autoReviewRoundsRemaining reaches 0). Also set both fields to 0 in the store's reset() method.

## Steps
1. In `src/stores/research-store.ts`:
   - Add `autoReviewCurrentRound: number` and `autoReviewTotalRounds: number` to ResearchStoreState interface (after autoReviewRoundsRemaining)
   - Add both to INITIAL_STATE with value 0
   - Add both to the persist subscription (the setState call in the subscribe listener that picks fields for storage.set)
   - In hydration (~line 349), read both from saved data with fallback to 0
   - In reset(), ensure both reset to 0 (already handled by INITIAL_STATE spread)

2. In `src/stores/research-store-persist.ts`:
   - Add `autoReviewCurrentRound: z.number().int().min(0).optional().default(0)` to persistedStateSchema
   - Add `autoReviewTotalRounds: z.number().int().min(0).optional().default(0)` to persistedStateSchema

3. In `src/hooks/use-research.ts` (auto-review trigger effect, ~line 579):
   - Add `autoReviewCurrentRound: currentRound` and `autoReviewTotalRounds: settings.autoReviewRounds` to the existing setState call that decrements autoReviewRoundsRemaining
   - The currentRound calculation is already there: `settings.autoReviewRounds - autoReviewRoundsRemaining + 1`

4. In `src/stores/research-store-events.ts` (review-result handler, ~line 386):
   - When the handler fires and `s.autoReviewRoundsRemaining <= 0` after this result, also set `autoReviewCurrentRound: 0` and `autoReviewTotalRounds: 0` to signal completion
   - Need to read `autoReviewRoundsRemaining` from current state. The handler already has access to `s` in the set callback. Check `s.autoReviewRoundsRemaining` — but note it was decremented by the trigger effect, not by this handler. The trigger decrements BEFORE firing connectSSE. So when review-result arrives, the remaining count is already the post-decrement value. If `s.autoReviewRoundsRemaining === 0`, all rounds are done — reset currentRound and totalRounds.

## Must-Haves
- [ ] autoReviewCurrentRound and autoReviewTotalRounds in store state interface and INITIAL_STATE
- [ ] Both fields in persistedStateSchema with Zod validation
- [ ] Both fields hydrated from storage with fallback to 0
- [ ] Trigger effect writes currentRound and totalRounds when auto-review fires
- [ ] review-result handler resets both to 0 when autoReviewRoundsRemaining reaches 0
- [ ] reset() clears both fields (via INITIAL_STATE spread)

## Verification
- `pnpm test --run` — all existing tests pass
- `pnpm build` — clean build
- `grep -c 'autoReviewCurrentRound' src/stores/research-store.ts src/stores/research-store-persist.ts src/hooks/use-research.ts src/stores/research-store-events.ts` — each file has at least 1 reference

## Failure Modes
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| localforage storage | Hydration falls back to INITIAL_STATE defaults (0) | N/A | Zod validation fails → fallback to defaults |

## Inputs
- `src/stores/research-store.ts` — existing store with autoReviewRoundsRemaining field
- `src/stores/research-store-persist.ts` — existing persist schema with autoReviewRoundsRemaining
- `src/hooks/use-research.ts` — existing auto-review trigger effect that computes currentRound
- `src/stores/research-store-events.ts` — existing review-result handler

## Expected Output
- `src/stores/research-store.ts` — modified with autoReviewCurrentRound + autoReviewTotalRounds fields
- `src/stores/research-store-persist.ts` — modified with both fields in Zod schema
- `src/hooks/use-research.ts` — modified to write round data in trigger effect
- `src/stores/research-store-events.ts` — modified to reset round fields on completion
  - Files: `src/stores/research-store.ts`, `src/stores/research-store-persist.ts`, `src/hooks/use-research.ts`, `src/stores/research-store-events.ts`
  - Verify: pnpm test --run && pnpm build

- [x] **T02: Add auto-review progress banner and abort button to ResearchActions + i18n keys** `est:45m`
  Render auto-review state in ResearchActions component. When autoReviewCurrentRound > 0 and state is 'reviewing', show a progress banner with round count and spinner. Hide More Research and Finalize buttons during auto-review. Show abort button that resets autoReviewRoundsRemaining to 0 and calls the abort handler. Add all i18n keys to both en.json and vi.json.

## Steps
1. Add i18n keys to `messages/en.json` under the existing ResearchActions section:
   - `autoReviewProgress`: `"Auto-review round {current}/{total}..."`
   - `autoReviewComplete`: `"Auto-review complete"`
   - `autoReviewAbort`: `"Abort auto-review"`
   - `autoReviewBannerTitle`: `"AUTO-REVIEW"`

2. Add matching keys to `messages/vi.json` under ResearchActions:
   - `autoReviewProgress`: `"Tự động xem xét vòng {current}/{total}..."`
   - `autoReviewComplete`: `"Tự động xem xét hoàn tất"`
   - `autoReviewAbort`: `"Hủy tự động xem xét"`
   - `autoReviewBannerTitle`: `"TỰ ĐỘNG XEM XÉT"`

3. In `src/components/research/ResearchActions.tsx`:
   - Read `autoReviewCurrentRound` and `autoReviewTotalRounds` from store
   - Add an `onAbortAutoReview` prop to ResearchActionsProps
   - Compute `isAutoReviewing = state === 'reviewing' && autoReviewCurrentRound > 0`
   - When `isAutoReviewing`:
     - Show auto-review banner: a div with the same sheet background styling, containing:
       - A section label like the existing SUGGESTION label but reading the autoReviewBannerTitle key
       - Progress text: `t('autoReviewProgress', { current: autoReviewCurrentRound, total: autoReviewTotalRounds })`
       - A Loader2 spinner (already imported)
       - An abort button styled like the existing secondary buttons
     - HIDE the suggestion textarea and ManualQueryInput during auto-review
     - HIDE the More Research and Finalize buttons during auto-review
   - When state transitions back to `awaiting_results_review` after auto-review rounds complete (autoReviewCurrentRound === 0 and state === awaiting_results_review), the component naturally shows the normal review UI

4. In `src/components/research/ActiveResearchCenter.tsx`:
   - Pass `onAbortAutoReview` prop to ResearchActions
   - The handler should: (1) set `autoReviewRoundsRemaining: 0` and `autoReviewCurrentRound: 0` and `autoReviewTotalRounds: 0` on the store, (2) abort the current SSE connection
   - Use the existing `abort` from useResearch return for the SSE abort
   - But ResearchActions doesn't call useResearch directly — it gets callbacks from ActiveResearchCenter via props
   - So ActiveResearchCenter should provide the `onAbortAutoReview` callback
   - ActiveResearchCenter already has `onAbort` prop from its parent — use that OR construct the abort in ActiveResearchCenter using useResearchStore directly
   - Simplest: make `onAbortAutoReview` a function in ActiveResearchCenter that calls `useResearchStore.setState({ autoReviewRoundsRemaining: 0, autoReviewCurrentRound: 0, autoReviewTotalRounds: 0 })` and then calls the parent's onAbort

## Must-Haves
- [ ] i18n keys in en.json and vi.json for auto-review progress, complete, and abort
- [ ] ResearchActions shows progress banner with round N/M during auto-review
- [ ] Action buttons (More Research, Finalize) hidden during auto-review
- [ ] Abort button visible and functional during auto-review
- [ ] Suggestion textarea and ManualQueryInput hidden during auto-review

## Verification
- `pnpm build` — clean build (catches i18n key mismatches)
- `pnpm lint` — clean
- `grep -c 'autoReviewProgress' messages/en.json messages/vi.json` — both return 1
- `grep -c 'autoReviewCurrentRound' src/components/research/ResearchActions.tsx` — returns >= 1

## Inputs
- `src/components/research/ResearchActions.tsx` — component to add auto-review banner to
- `src/components/research/ActiveResearchCenter.tsx` — parent that wires abort callback
- `messages/en.json` — English i18n strings
- `messages/vi.json` — Vietnamese i18n strings
- `src/stores/research-store.ts` — store with autoReviewCurrentRound/TotalRounds (from T01)

## Expected Output
- `src/components/research/ResearchActions.tsx` — modified with auto-review banner and abort
- `src/components/research/ActiveResearchCenter.tsx` — modified with onAbortAutoReview callback
- `messages/en.json` — new ResearchActions i18n keys
- `messages/vi.json` — new ResearchActions i18n keys
  - Files: `src/components/research/ResearchActions.tsx`, `src/components/research/ActiveResearchCenter.tsx`, `messages/en.json`, `messages/vi.json`
  - Verify: pnpm build && pnpm lint

- [ ] **T03: Add unit tests for auto-review round tracking and ResearchActions banner** `est:1h`
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
  - Files: `src/stores/__tests__/research-store-auto-review.test.ts`, `src/hooks/__tests__/use-research.test.ts`, `src/components/research/__tests__/ResearchActions.test.tsx`
  - Verify: pnpm test --run && pnpm build

## Files Likely Touched

- src/stores/research-store.ts
- src/stores/research-store-persist.ts
- src/hooks/use-research.ts
- src/stores/research-store-events.ts
- src/components/research/ResearchActions.tsx
- src/components/research/ActiveResearchCenter.tsx
- messages/en.json
- messages/vi.json
- src/stores/__tests__/research-store-auto-review.test.ts
- src/hooks/__tests__/use-research.test.ts
- src/components/research/__tests__/ResearchActions.test.tsx
