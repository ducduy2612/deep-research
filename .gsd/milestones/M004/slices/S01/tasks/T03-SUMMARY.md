---
id: T03
parent: S01
milestone: M004
key_files:
  - src/stores/research-store-events.ts
  - src/stores/research-store.ts
  - src/stores/research-store-persist.ts
  - src/hooks/use-research.ts
  - src/hooks/__tests__/use-research.test.ts
  - src/hooks/__tests__/use-research-multi-phase.test.ts
key_decisions:
  - review-result handler uses same merge pattern as research-result (accumulate learnings/sources/images into existing result)
  - Auto-review trigger uses useEffect watching researchState + autoReviewRoundsRemaining rather than intercepting SSE events directly
  - requestMoreResearch sends phase:'review' with structured data instead of embedding into plan string — cleaner API boundary
duration: 
verification_result: passed
completed_at: 2026-04-14T17:32:01.011Z
blocker_discovered: false
---

# T03: Add review-result store handler, auto-review trigger, remove start() method

**Add review-result store handler, auto-review trigger, remove start() method**

## What Happened

Added `review-result` event handler in research-store-events.ts that merges learnings/sources/images into existing result (same pattern as research-result). Added `autoReviewRoundsRemaining` field to ResearchStoreState, INITIAL_STATE, hydration logic, auto-persist block, and persistedStateSchema with Zod validation.

Updated use-research.ts: removed the `start()` backward-compatible method and `start` from UseResearchReturn interface. Changed `requestMoreResearch()` to send `phase: 'review'` with structured learnings/sources/images/suggestion from the store (instead of the old pattern of embedding everything into the plan string). Added `autoReviewRoundsRemaining` initialization in `approvePlanAndResearch()` from settings. Added auto-review trigger useEffect that fires a review SSE connection when state transitions to `awaiting_results_review` with `autoReviewRoundsRemaining > 0`, decrementing the counter each round and logging round number/remaining count.

Updated test files: converted all use-research.test.ts tests from `start()` to `clarify()`, added 8 new tests covering: review-result handler merging, autoReviewRoundsRemaining initialization, requestMoreResearch sending phase:review with structured data, and verifying start() is removed. Updated multi-phase test assertions for requestMoreResearch to expect phase:'review' with learnings/sources/images instead of phase:'research' with appended plan string. All 42 hook tests pass, all 98 engine tests pass, ESLint clean on all 6 modified files.

## Verification

Ran `pnpm vitest run src/hooks/__tests__/use-research.test.ts src/hooks/__tests__/use-research-multi-phase.test.ts` — 42 tests pass. Ran `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts src/engine/research/__tests__/sse-route.test.ts` — 98 tests pass. Ran ESLint on all 4 source files and 2 test files — clean. Verified: review-result handler merges data correctly, autoReviewRoundsRemaining persists and hydrates, requestMoreResearch sends phase:review with structured data, start() is removed from return interface, auto-review trigger fires when rounds remain.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/hooks/__tests__/use-research.test.ts src/hooks/__tests__/use-research-multi-phase.test.ts` | 0 | ✅ pass | 1880ms |
| 2 | `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts src/engine/research/__tests__/sse-route.test.ts` | 0 | ✅ pass | 413ms |
| 3 | `npx eslint src/stores/research-store-events.ts src/stores/research-store.ts src/stores/research-store-persist.ts src/hooks/use-research.ts src/hooks/__tests__/use-research.test.ts src/hooks/__tests__/use-research-multi-phase.test.ts` | 0 | ✅ pass | 3200ms |

## Deviations

None.

## Known Issues

5 pre-existing store test failures (research-result reference equality tests) — these failures exist on the base branch before T03 changes.

## Files Created/Modified

- `src/stores/research-store-events.ts`
- `src/stores/research-store.ts`
- `src/stores/research-store-persist.ts`
- `src/hooks/use-research.ts`
- `src/hooks/__tests__/use-research.test.ts`
- `src/hooks/__tests__/use-research-multi-phase.test.ts`
