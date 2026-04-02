---
estimated_steps: 17
estimated_files: 2
skills_used: []
---

# T01: Split ResearchOrchestrator into phase methods

Refactor the orchestrator to expose separate methods for each checkpoint:

1. `clarifyOnly()` → runs clarify step, returns questions text, emits events, stops
2. `planWithContext(topic, questions, feedback)` → runs plan step with enriched context, returns plan text
3. `researchFromPlan(plan)` → generates SERP queries, runs search+analyze+review loop, returns {learnings, sources, images}
4. `reportFromLearnings(plan, learnings, sources, images)` → generates final report

Keep the existing `start()` method as a convenience that chains all phases (for backward compat during transition).

Each method should:
- Accept explicit inputs (not rely on internal accumulated state)
- Return typed outputs
- Support abort
- Emit the same SSE events (step-start, step-delta, step-complete, step-error)

Update types.ts:
- Add `ClarifyResult = { questions: string }`
- Add `PlanResult = { plan: string }`
- Add `ResearchPhaseResult = { learnings: string[], sources: Source[], images: ImageSource[] }`
- Add `ReportResult = ResearchResult` (alias for clarity)

Update ResearchState to add: awaiting_feedback, awaiting_plan_review, awaiting_results_review

## Inputs

- `src/engine/research/orchestrator.ts`
- `src/engine/research/types.ts`

## Expected Output

- `Updated orchestrator with 4 phase methods`
- `Updated types with new result types and states`

## Verification

pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts
