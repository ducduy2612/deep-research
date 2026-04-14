---
id: T04
parent: S01
milestone: M004
key_files:
  - src/engine/research/orchestrator.ts
  - src/engine/research/__tests__/orchestrator.test.ts
  - src/engine/research/__tests__/sse-route.test.ts
  - src/engine/search/__tests__/integration.test.ts
  - src/hooks/use-research.ts
  - src/stores/__tests__/research-store.test.ts
  - src/stores/__tests__/research-store-multi-phase.test.ts
  - src/stores/__tests__/research-store-multi-phase-1.test.ts
  - src/stores/__tests__/research-store-checkpoints.test.ts
  - src/engine/research/__tests__/types.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T17:43:51.330Z
blocker_discovered: false
---

# T04: Remove start() method from orchestrator, convert all tests to phase methods

**Remove start() method from orchestrator, convert all tests to phase methods**

## What Happened

Removed the `start()` method from ResearchOrchestrator along with the now-dead `runPlan()` and `runReviewLoop()` private methods (they were only called from `start()`). Converted all orchestrator test cases that called `start()` to use individual phase methods — removed 13 tests covered by existing phase-specific tests and converted 4 tests (abort, unsubscribe, destroy) to use `clarifyOnly()`. Updated the SSE route test mock to remove `start` references. Fixed the integration test file (not in original task plan but broken by start() removal) by converting 4 tests to use `researchFromPlan()` and `reviewOnly()`. Fixed 5 pre-existing store test failures where tests expected old non-accumulating `research-result` behavior — updated to match T03's merge/accumulate behavior. Fixed a pre-existing types test that expected URL format validation on `sourceSchema` which uses `z.string()` not `z.string().url()`. Removed stale `start()` reference from use-research.ts JSDoc comment.

## Verification

All 796 tests pass (pnpm test --run), production build succeeds (pnpm build), and lint is clean (pnpm lint). Specific verifications: orchestrator.test.ts has zero start() calls and includes cycle cap + reviewOnly + phase chaining tests; sse-route.test.ts has no start mock and includes review phase tests; use-research.test.ts confirms start method is undefined; use-research-multi-phase.test.ts confirms requestMoreResearch sends phase:'review'; integration.test.ts uses researchFromPlan/reviewOnly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test --run 2>&1 | tail -10` | 0 | ✅ pass | 2200ms |
| 2 | `pnpm build 2>&1 | tail -5` | 0 | ✅ pass | 45000ms |
| 3 | `pnpm lint 2>&1 | tail -5` | 0 | ✅ pass | 15000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/orchestrator.ts`
- `src/engine/research/__tests__/orchestrator.test.ts`
- `src/engine/research/__tests__/sse-route.test.ts`
- `src/engine/search/__tests__/integration.test.ts`
- `src/hooks/use-research.ts`
- `src/stores/__tests__/research-store.test.ts`
- `src/stores/__tests__/research-store-multi-phase.test.ts`
- `src/stores/__tests__/research-store-multi-phase-1.test.ts`
- `src/stores/__tests__/research-store-checkpoints.test.ts`
- `src/engine/research/__tests__/types.test.ts`
