---
id: S01
parent: M004
milestone: M004
provides:
  - ["reviewOnly() orchestrator method for follow-up research cycles", "review SSE phase handler with structured input schema", "review-result store event handler that accumulates learnings/sources/images", "autoReviewRoundsRemaining state tracking with persistence", "Cycle-capped runSearchPhase returning remainingQueries", "requestMoreResearch sending phase:review with structured data", "Auto-review trigger effect loop"]
requires:
  - slice: M004/S01
    provides: This is the first slice — no upstream slice dependencies consumed
affects:
  - ["S02 (Hook + store review integration)", "S03 (UI cleanup + start() removal)", "S04 (Tests + verification)"]
key_files:
  - ["src/engine/research/types.ts", "src/engine/research/orchestrator.ts", "src/app/api/research/stream/route.ts", "src/stores/research-store-events.ts", "src/stores/research-store.ts", "src/stores/research-store-persist.ts", "src/hooks/use-research.ts", "src/engine/research/__tests__/orchestrator.test.ts", "src/engine/research/__tests__/sse-route.test.ts", "src/hooks/__tests__/use-research.test.ts", "src/hooks/__tests__/use-research-multi-phase.test.ts"]
key_decisions:
  - ["Cycle cap (maxCyclesPerInvocation=2) as primary batching control, timeBudgetMs=180s as safety net", "Review as standalone SSE phase with review-result event type, separate from research", "Auto-review trigger via useEffect watching store state + autoReviewRoundsRemaining counter", "Full pipeline (phase=full) completely removed — all entry points use individual phase methods"]
patterns_established:
  - ["Cycle-capped research batching with remainingQueries return for client reconnect", "Standalone review phase with dedicated SSE event type (review-result) and orchestrator method (reviewOnly())", "Auto-review reactive trigger pattern: useEffect watching store state + persisted counter", "Structured requestMoreResearch payload with phase:review + learnings/sources/images/suggestion"]
observability_surfaces:
  - ["review-result SSE event type for review phase completion", "autoReviewRoundsRemaining store field visible in React DevTools", "logger.warn when cycle cap hit with remaining query count", "step-error event for review failures with review step"]
drill_down_paths:
  - [".gsd/milestones/M004/slices/S01/tasks/T01-SUMMARY.md", ".gsd/milestones/M004/slices/S01/tasks/T02-SUMMARY.md", ".gsd/milestones/M004/slices/S01/tasks/T03-SUMMARY.md", ".gsd/milestones/M004/slices/S01/tasks/T04-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-04-14T17:47:52.673Z
blocker_discovered: false
---

# S01: Engine + API timeout overhaul

**Overhauled research pipeline to batch at 2 search-analyze cycles per SSE connection (~160s), added standalone reviewOnly() orchestrator phase with review SSE route, removed full pipeline and start() method, wired auto-review trigger through store and hook — all 796 tests pass.**

## What Happened

## Overview

S01 tackled the core timeout constraint: every SSE connection must complete within Vercel Hobby's 300s serverless function limit. The slice overhauled the research engine, SSE route, store, and hook to implement a cycle-capped batching strategy with a standalone review phase.

## What Changed

### T01: Cycle cap + timeBudgetMs + reviewOnly() orchestrator method
Added `maxCyclesPerInvocation` field (default 2) to ResearchConfig. Changed `timeBudgetMs` default from 780s to 180s. Enforced cycle cap in `runSearchPhase` — stops after 2 search-analyze iterations and returns `remainingQueries` for client reconnect. Added `reviewOnly()` public method that generates follow-up queries from plan + learnings + optional suggestion, executes 1 search+analyze cycle per query, and returns accumulated data. Removed `runReviewLoop()` call from `researchFromPlan()` — review is now a separate phase. 10 new tests (3 cycle cap, 7 reviewOnly).

### T02: SSE route — remove full phase, add review phase, maxDuration=300
Changed `maxDuration` from 800 to 300. Removed `fullSchema`, `handleFullPhase`, and Phase 'full' case. Added `reviewSchema` (fields: phase='review', plan, learnings, sources, images, optional suggestion) and `handleReviewPhase` that calls `orchestrator.reviewOnly()`. Default switch case now returns explicit error instead of falling through. Added 'review-result' SSE event type. 18 new route tests.

### T03: Store + hook — review-result handler, auto-review trigger, remove start()
Added `review-result` event handler that merges learnings/sources/images into existing result. Added `autoReviewRoundsRemaining` to store state, initial state, hydration, and Zod-validated persist schema. Removed `start()` from useResearch hook and UseResearchReturn interface. Changed `requestMoreResearch()` to send `phase: 'review'` with structured learnings/sources/images/suggestion. Added auto-review trigger useEffect that fires review SSE when state is `awaiting_results_review` AND `autoReviewRoundsRemaining > 0`, decrementing counter each round. 8 new tests.

### T04: Remove orchestrator.start(), convert all tests, fix pre-existing failures
Removed `start()` method plus dead private methods `runPlan()` and `runReviewLoop()`. Converted all orchestrator tests from start() to individual phase methods. Removed 13 redundant tests (covered by existing phase-specific tests), converted 4 tests (abort, unsubscribe, destroy) to use `clarifyOnly()`. Fixed 5 pre-existing store test failures expecting old non-accumulating research-result behavior. Fixed pre-existing types test expecting URL validation on sourceSchema. Updated SSE route test mocks. Fixed integration test for start() removal.

## Key Architectural Changes

1. **Cycle cap replaces time budget as primary batching control**: `maxCyclesPerInvocation=2` is deterministic; `timeBudgetMs=180s` is a safety net.
2. **Review is a standalone SSE phase**: Completely separate from research — distinct schema, distinct event type (review-result), distinct orchestrator method (reviewOnly()).
3. **Full pipeline completely removed**: No `phase=full`, no `start()`, no `runPlan()`, no `runReviewLoop()`. All entry points use individual phase methods.
4. **Auto-review wired reactively**: useEffect watches store state for `awaiting_results_review` + remaining rounds, providing clean trigger without SSE interception.

## Downstream Impact

S02 consumes: `autoReviewRoundsRemaining` store field for visible round progress, `review-result` SSE events for UI feedback, and the auto-review trigger effect loop for abort controls. S03 consumes: verified absence of `start()` for dead code cleanup. S04 consumes: all new behavior for test coverage expansion.

## Verification

## Verification Summary

All verification checks pass:

1. **Full test suite**: 796 tests across 40 files — all pass (`pnpm test --run`, 2.23s)
2. **Production build**: Clean (`pnpm build`)
3. **Lint**: Clean, zero warnings or errors (`pnpm lint`)
4. **Cycle cap**: maxCyclesPerInvocation=2 in types.ts, enforced in runSearchPhase, 3 dedicated tests
5. **timeBudgetMs**: Default 180s (180_000ms) in orchestrator.ts line 533
6. **maxDuration**: 300 in route.ts line 19
7. **start() removal**: Zero references in orchestrator.ts source (grep confirmed)
8. **Full pipeline removal**: Zero references to fullSchema/handleFullPhase/Phase 'full' in route.ts (grep confirmed)
9. **reviewOnly()**: Present in orchestrator.ts line 261, 7 dedicated tests
10. **Review phase route**: reviewSchema + handleReviewPhase present, 18 dedicated tests
11. **review-result handler**: In research-store-events.ts, merges learnings/sources/images
12. **autoReviewRoundsRemaining**: In store state (line 66), initial state (line 121), hydration (line 349), persist (line 388)
13. **requestMoreResearch sends phase:review**: Confirmed in multi-phase tests
14. **Requirements R063, R064, R068**: All validated with specific evidence

## Requirements Advanced

None.

## Requirements Validated

- R063 — Cycle cap (maxCyclesPerInvocation=2) enforced in runSearchPhase, timeBudgetMs default 180s — verified by 3 dedicated cycle cap tests + grep confirmation
- R064 — fullSchema/handleFullPhase/Phase 'full' removed from route.ts, start()/runPlan()/runReviewLoop() removed from orchestrator.ts — grep confirms zero references
- R068 — maxDuration=300 in route.ts, timeBudgetMs=180s default, cycle cap 2×~80s≈160s per connection — triple constraint verified

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

- `src/engine/research/types.ts` — Added maxCyclesPerInvocation to ResearchConfig, changed timeBudgetMs default to 180s
- `src/engine/research/orchestrator.ts` — Added cycle cap to runSearchPhase, added reviewOnly() method, removed start()/runPlan()/runReviewLoop()
- `src/app/api/research/stream/route.ts` — Changed maxDuration to 300, removed full pipeline, added review phase handler with reviewSchema
- `src/stores/research-store-events.ts` — Added review-result event handler that merges learnings/sources/images
- `src/stores/research-store.ts` — Added autoReviewRoundsRemaining to state and INITIAL_STATE
- `src/stores/research-store-persist.ts` — Added autoReviewRoundsRemaining to persistedStateSchema and hydration
- `src/hooks/use-research.ts` — Removed start(), updated requestMoreResearch to send phase:review, added auto-review trigger useEffect
- `src/engine/research/__tests__/orchestrator.test.ts` — 10 new tests (cycle cap + reviewOnly), converted start() tests to phase methods
- `src/engine/research/__tests__/sse-route.test.ts` — 18 new review phase tests, removed full-pipeline tests
- `src/hooks/__tests__/use-research.test.ts` — Converted start() tests to clarify(), added auto-review and review-result tests
- `src/hooks/__tests__/use-research-multi-phase.test.ts` — Updated requestMoreResearch assertions for phase:review
