---
id: T01
parent: S02
milestone: M004
key_files:
  - src/stores/research-store.ts
  - src/stores/research-store-persist.ts
  - src/hooks/use-research.ts
  - src/stores/research-store-events.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T17:58:17.030Z
blocker_discovered: false
---

# T01: Add autoReviewCurrentRound/TotalRounds to store state, persist schema, hydration, and hook integration

**Add autoReviewCurrentRound/TotalRounds to store state, persist schema, hydration, and hook integration**

## What Happened

Added `autoReviewCurrentRound` and `autoReviewTotalRounds` fields to the research store across four files:

1. **research-store.ts**: Added both fields to `ResearchStoreState` interface, `INITIAL_STATE` (both 0), the persist subscription `persistData` object, and hydration with fallback to 0. The `reset()` method already spreads `INITIAL_STATE`, so both fields are cleared automatically on reset.

2. **research-store-persist.ts**: Added both fields to `persistedStateSchema` with `z.number().int().min(0).optional().default(0)` validation — matching the existing `autoReviewRoundsRemaining` pattern.

3. **use-research.ts**: In the auto-review trigger useEffect, added `autoReviewCurrentRound: currentRound` and `autoReviewTotalRounds: settings.autoReviewRounds` to the `setState` call that already decrements `autoReviewRoundsRemaining`. The `currentRound` was already computed as `settings.autoReviewRounds - autoReviewRoundsRemaining + 1`.

4. **research-store-events.ts**: Added all three auto-review fields to the `HandlerState` interface so the event handler can read `autoReviewRoundsRemaining`. In the `review-result` handler, when `s.autoReviewRoundsRemaining <= 0`, both `autoReviewCurrentRound` and `autoReviewTotalRounds` are reset to 0 to signal auto-review completion.

## Verification

All verification checks pass:
- `pnpm build` — clean build, no type errors
- `pnpm test --run` — all 796 tests pass (40 test files, 0 failures)
- `grep -c 'autoReviewCurrentRound'` — 4 refs in research-store.ts, 1 in persist, 1 in hook, 2 in events
- `grep -c 'autoReviewTotalRounds'` — same distribution across all four files

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm build` | 0 | ✅ pass | 19200ms |
| 2 | `pnpm test --run` | 0 | ✅ pass | 3000ms |
| 3 | `grep -c autoReviewCurrentRound src/stores/research-store.ts src/stores/research-store-persist.ts src/hooks/use-research.ts src/stores/research-store-events.ts` | 0 | ✅ pass | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/stores/research-store.ts`
- `src/stores/research-store-persist.ts`
- `src/hooks/use-research.ts`
- `src/stores/research-store-events.ts`
