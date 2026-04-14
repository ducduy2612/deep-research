---
estimated_steps: 42
estimated_files: 4
skills_used: []
---

# T01: Add autoReviewCurrentRound/TotalRounds store fields, persist schema, and hook integration

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

## Inputs

- `src/stores/research-store.ts`
- `src/stores/research-store-persist.ts`
- `src/hooks/use-research.ts`
- `src/stores/research-store-events.ts`

## Expected Output

- `src/stores/research-store.ts`
- `src/stores/research-store-persist.ts`
- `src/hooks/use-research.ts`
- `src/stores/research-store-events.ts`

## Verification

pnpm test --run && pnpm build
