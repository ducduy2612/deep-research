---
id: T01
parent: S01
milestone: M002
provides: []
requires: []
affects: []
key_files: ["src/engine/research/orchestrator.ts", "src/engine/research/types.ts", "src/engine/research/prompts.ts", "src/engine/research/index.ts", "src/engine/research/__tests__/orchestrator.test.ts"]
key_decisions: ["Phase methods each create their own AbortController for independent execution", "planWithContext uses a dedicated prompt function (getPlanWithContextPrompt), not the default plan prompt with overrides", "start() unchanged for backward compat — phase methods and start() share private step methods", "New intermediate states (awaiting_*) only set by phase methods, not by start()"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts — 39 tests pass (19 existing + 20 new). pnpm lint --quiet — no warnings or errors."
completed_at: 2026-04-02T06:45:15.772Z
blocker_discovered: false
---

# T01: Split ResearchOrchestrator into 4 phase methods with typed results and intermediate states

> Split ResearchOrchestrator into 4 phase methods with typed results and intermediate states

## What Happened
---
id: T01
parent: S01
milestone: M002
key_files:
  - src/engine/research/orchestrator.ts
  - src/engine/research/types.ts
  - src/engine/research/prompts.ts
  - src/engine/research/index.ts
  - src/engine/research/__tests__/orchestrator.test.ts
key_decisions:
  - Phase methods each create their own AbortController for independent execution
  - planWithContext uses a dedicated prompt function (getPlanWithContextPrompt), not the default plan prompt with overrides
  - start() unchanged for backward compat — phase methods and start() share private step methods
  - New intermediate states (awaiting_*) only set by phase methods, not by start()
duration: ""
verification_result: passed
completed_at: 2026-04-02T06:45:15.773Z
blocker_discovered: false
---

# T01: Split ResearchOrchestrator into 4 phase methods with typed results and intermediate states

**Split ResearchOrchestrator into 4 phase methods with typed results and intermediate states**

## What Happened

Refactored the ResearchOrchestrator to expose 4 public phase methods for multi-phase streaming: clarifyOnly(), planWithContext(topic, questions, feedback), researchFromPlan(plan), and reportFromLearnings(plan, learnings, sources, images). Each method creates its own AbortController, emits standard SSE events (step-start, step-delta, step-complete, step-error), returns a typed result or null on failure/abort, and transitions to the appropriate intermediate state (awaiting_feedback, awaiting_plan_review, awaiting_results_review).

Updated types.ts with ClarifyResult, PlanResult, ResearchPhaseResult, and ReportResult types plus 3 new ResearchState values. Added getPlanWithContextPrompt to prompts.ts for enriched plan generation with clarification Q&A. The existing start() method remains unchanged for backward compatibility.

The private runClarify() method was refactored to return accumulated text (was void) so clarifyOnly() can capture the questions. The other phase methods reuse existing private step methods (runPlan, runSearchPhase, runReviewLoop, runReport) where applicable. Added 20 new tests covering happy path, abort, and failure for each phase method, plus a phase-chaining integration test. All 39 tests pass.

## Verification

pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts — 39 tests pass (19 existing + 20 new). pnpm lint --quiet — no warnings or errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` | 0 | ✅ pass | 258ms |
| 2 | `pnpm lint --quiet` | 0 | ✅ pass | 5000ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/orchestrator.ts`
- `src/engine/research/types.ts`
- `src/engine/research/prompts.ts`
- `src/engine/research/index.ts`
- `src/engine/research/__tests__/orchestrator.test.ts`


## Deviations
None.

## Known Issues
None.
