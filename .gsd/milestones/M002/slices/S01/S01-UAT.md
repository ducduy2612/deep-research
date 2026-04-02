# S01: Engine + API: Multi-Phase Orchestrator & SSE Routes — UAT

**Milestone:** M002
**Written:** 2026-04-02T07:25:40.564Z

# S01: Engine + API: Multi-Phase Orchestrator & SSE Routes — UAT

**Milestone:** M002
**Written:** 2026-04-02

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is purely backend (orchestrator + SSE route). No UI components were modified. All verification is through unit tests and SSE event stream inspection.

## Preconditions

- `pnpm install` has been run
- No API keys required (all tests use mocked providers)

## Smoke Test

```bash
pnpm vitest run src/engine/research/__tests__/
```

All 163 tests pass (orchestrator: 39, SSE route: 52, types: 21, prompts: 51).

## Test Cases

### 1. Clarify phase streams questions and emits clarify-result

1. `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts -t "clarify phase"`
2. **Expected:** Tests verify POST with `phase: 'clarify'` streams step events, emits `clarify-result` event with `{ questions: string }`, then emits `done`.

### 2. Plan phase streams plan with enriched context

1. `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts -t "plan phase"`
2. **Expected:** Tests verify POST with `phase: 'plan'` + `{ topic, questions, feedback }` streams step events, emits `plan-result` event with `{ plan: string }`.

### 3. Research phase streams search/analyze events

1. `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts -t "research phase"`
2. **Expected:** Tests verify POST with `phase: 'research'` + `{ plan }` streams SERP generation + search + analyze events, emits `research-result` with `{ learnings, sources, images }`.

### 4. Report phase streams report generation

1. `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts -t "report phase"`
2. **Expected:** Tests verify POST with `phase: 'report'` + `{ plan, learnings, sources, images }` streams report generation, emits `result` event with full report.

### 5. Full phase backward compatibility preserved

1. `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts -t "full"`
2. **Expected:** Existing tests (22) pass unchanged — POST without `phase` field or with `phase: 'full'` runs the complete pipeline.

### 6. Orchestrator phase methods return typed results

1. `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts -t "phase"`
2. **Expected:** Tests verify clarifyOnly returns ClarifyResult, planWithContext returns PlanResult, researchFromPlan returns ResearchPhaseResult, reportFromLearnings returns ReportResult.

### 7. Abort works independently per phase

1. `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts -t "abort"`
2. **Expected:** Each phase method's abort test confirms it stops cleanly and returns null without affecting other phase instances.

### 8. Validation rejects missing phase-specific fields

1. `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts -t "validation"`
2. **Expected:** Tests verify missing required fields per phase (e.g., plan without questions/feedback, research without plan) return 400 errors.

### 9. New intermediate states are valid ResearchState values

1. `pnpm vitest run src/engine/research/__tests__/types.test.ts -t "awaiting"`
2. **Expected:** Tests confirm awaiting_feedback, awaiting_plan_review, awaiting_results_review are valid state values and the total state count is 13.

### 10. getPlanWithContextPrompt includes all inputs

1. `pnpm vitest run src/engine/research/__tests__/prompts.test.ts -t "planWithContext"`
2. **Expected:** Tests verify the prompt includes topic, questions, feedback, guidelines, and relevance requirements.

## Edge Cases

### Phase fields don't leak into full schema

1. POST with `{ topic, questions, feedback }` but no `phase` field
2. **Expected:** Request is validated as `full` phase (not `plan`), and the extra fields are ignored. The z.union approach prevents field leakage that discriminatedUnion would allow.

### Null result from failed phase

1. Phase method encounters an error (mock throws)
2. **Expected:** Returns null, emits step-error event, stream closes gracefully without hanging.

## Failure Signals

- Any test in `src/engine/research/__tests__/` fails — indicates regression in orchestrator or SSE route
- `pnpm lint --quiet` reports warnings or errors — type safety or code style regression
- Full suite (`pnpm vitest run`) drops below 558 tests — tests were accidentally removed

## Requirements Proved By This UAT

- RES-02 — Multi-phase streaming with per-step visibility confirmed through 52 SSE route tests
- RES-05 — Abort works independently per phase (orchestrator abort tests)
- RES-06 — Error handling per phase with appropriate error events (SSE route error tests)

## Not Proven By This UAT

- End-to-end flow in a running browser (S03 will cover this)
- Research store correctly handles new intermediate states (S02)
- Persistence of partial results across phase boundaries (S04)

## Notes for Tester

- All verification is automated — no manual steps needed beyond running the test commands.
- The 558 total test count includes downstream consumers (research store, use-research hook) that were NOT modified but confirmed to still work.
- The `phase: 'full'` backward-compat path is critical — existing UI sends requests without a phase field and must continue working until S03 updates the hook.
