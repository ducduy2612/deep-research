---
id: S01
parent: M002
milestone: M002
provides:
  - 4 orchestrator phase methods (clarifyOnly, planWithContext, researchFromPlan, reportFromLearnings) with typed results
  - SSE route supporting 5 phases (clarify, plan, research, report, full) with separate request schemas
  - Phase-specific result SSE events (clarify-result, plan-result, research-result) for intermediate data capture
  - 3 new intermediate ResearchState values (awaiting_feedback, awaiting_plan_review, awaiting_results_review)
  - getPlanWithContextPrompt for enriched plan generation with Q&A context
requires:
  []
affects:
  - S02
  - S03
key_files:
  - src/engine/research/orchestrator.ts
  - src/engine/research/types.ts
  - src/engine/research/prompts.ts
  - src/engine/research/index.ts
  - src/app/api/research/stream/route.ts
  - src/engine/research/__tests__/orchestrator.test.ts
  - src/engine/research/__tests__/sse-route.test.ts
  - src/engine/research/__tests__/types.test.ts
  - src/engine/research/__tests__/prompts.test.ts
key_decisions:
  - Phase methods each create their own AbortController for independent execution — aborting one phase doesn't affect another
  - planWithContext uses a dedicated prompt function (getPlanWithContextPrompt), not the default plan prompt with overrides
  - start() unchanged for backward compat — phase methods and start() share private step methods internally
  - New intermediate states (awaiting_feedback, awaiting_plan_review, awaiting_results_review) only set by phase methods, not by start()
  - Used z.union (not discriminatedUnion) for SSE request schema to prevent phase fields leaking through to full fallback
  - Shared helpers extracted from SSE route handlers (resolveProviderConfigs, buildSearchProvider, createSSEStream, subscribeOrchestrator, cleanup) to reduce duplication
patterns_established:
  - Phase method pattern on orchestrator: each phase method creates its own AbortController, emits standard SSE events, returns typed result, transitions to intermediate state
  - Shared SSE helpers pattern in route handler: extract common stream/orchestrator wiring into pure functions, each phase handler is ~40 lines
  - Phase-specific result events (clarify-result, plan-result, research-result) before done event — client can capture intermediate results before stream closes
observability_surfaces:
  - SSE start event includes phase field: { topic, phase: 'clarify'|'plan'|'research'|'report' } — client can log which phase is running
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-02T07:25:40.564Z
blocker_discovered: false
---

# S01: Engine + API: Multi-Phase Orchestrator & SSE Routes

**Split the research orchestrator into 4 independent phase methods (clarify/plan/research/report) and refactored the SSE route to accept a phase parameter with separate request schemas per phase.**

## What Happened

The existing ResearchOrchestrator had a single `start()` method that ran the full research pipeline end-to-end. This slice refactored it into 4 independent phase methods that can be called separately, enabling the interactive multi-phase flow where users review and provide input at checkpoints.

**T01 — Orchestrator phase methods:** Added `clarifyOnly()`, `planWithContext(topic, questions, feedback)`, `researchFromPlan(plan)`, and `reportFromLearnings(plan, learnings, sources, images)` to the orchestrator. Each method creates its own AbortController, emits standard SSE events (step-start, step-delta, step-complete, step-error), returns a typed result (ClarifyResult, PlanResult, ResearchPhaseResult, ReportResult), and transitions to the appropriate intermediate state (awaiting_feedback, awaiting_plan_review, awaiting_results_review). The existing `start()` method remains unchanged for backward compatibility. Added `getPlanWithContextPrompt()` to prompts.ts for enriched plan generation. 20 new orchestrator tests added (39 total).

**T02 — SSE route multi-phase streaming:** Refactored `/api/research/stream/route.ts` to accept a `phase` parameter (clarify, plan, research, report, full). Each phase has its own Zod request schema and handler. Shared helpers were extracted (resolveProviderConfigs, buildSearchProvider, createSSEStream, subscribeOrchestrator, cleanup) to reduce duplication across handlers. Used `z.union` instead of `z.discriminatedUnion` to prevent phase-specific fields from leaking through as valid full-phase requests. Phase-specific result events (clarify-result, plan-result, research-result) are emitted before done; report phase reuses the existing result event. 30 new SSE route tests added (52 total).

**T03 — Test coverage for types and prompts:** Updated types.test.ts for 3 new ResearchState values (13 total, up from 10) and added 6 tests for getPlanWithContextPrompt in prompts.test.ts. Orchestrator and SSE route tests were already comprehensive from T01/T02. Total research engine tests: 163.

**T04 — Full suite verification:** Ran the complete test suite — 558 tests across 24 files pass, lint clean. The `phase: 'full'` backward-compat path confirmed working; no downstream consumers (research store, use-research hook) needed changes.

## Verification

All 558 tests pass across 24 test files. Lint clean with zero warnings or errors. Specific test suites verified: orchestrator (39 tests), SSE route (52 tests), types (21 tests), prompts (51 tests). Full suite confirms backward compatibility — research store and use-research hook tests pass unchanged with the refactored SSE route.

## Requirements Advanced

- RES-02 — Multi-phase streaming enables per-step visibility with user checkpoints between steps

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

The `full` phase backward-compat path works but the UI still calls the SSE endpoint without a phase parameter (defaulting to full). S02 and S03 will update the store and UI to use the new phase-specific endpoints.

## Follow-ups

S02 needs to add the new intermediate states (awaiting_feedback, awaiting_plan_review, awaiting_results_review) to the research store state machine. S03 needs to update the use-research hook to send phase-specific requests with user feedback between phases.

## Files Created/Modified

- `src/engine/research/orchestrator.ts` — Added 4 phase methods (clarifyOnly, planWithContext, researchFromPlan, reportFromLearnings) with independent AbortControllers and typed results
- `src/engine/research/types.ts` — Added ClarifyResult, PlanResult, ResearchPhaseResult, ReportResult types and 3 new ResearchState values (awaiting_feedback, awaiting_plan_review, awaiting_results_review)
- `src/engine/research/prompts.ts` — Added getPlanWithContextPrompt function for enriched plan generation with topic, questions, and feedback
- `src/engine/research/index.ts` — Exported new result types (ClarifyResult, PlanResult, ResearchPhaseResult, ReportResult)
- `src/app/api/research/stream/route.ts` — Refactored to accept phase parameter with 5 variants (clarify, plan, research, report, full). Extracted shared helpers. Each phase has dedicated handler and Zod schema.
- `src/engine/research/__tests__/orchestrator.test.ts` — Added 20 tests covering happy path, abort, and failure for each phase method plus phase-chaining integration
- `src/engine/research/__tests__/sse-route.test.ts` — Added 30 tests for phase-specific endpoints: validation, happy path, null results, error streaming, abort, cleanup
- `src/engine/research/__tests__/types.test.ts` — Updated state count from 10 to 13, added 3 individual state-value tests for new intermediate states
- `src/engine/research/__tests__/prompts.test.ts` — Added 6 tests for getPlanWithContextPrompt covering topic/questions/feedback inclusion, guidelines, and relevance
