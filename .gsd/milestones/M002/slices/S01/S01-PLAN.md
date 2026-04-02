# S01: Engine + API: Multi-Phase Orchestrator & SSE Routes

**Goal:** Split the orchestrator into phase-specific methods and create SSE route support for multi-phase streaming with separate requests per checkpoint.
**Demo:** After this: After this: can POST to /api/research/stream with phase=clarify, get streamed questions, then POST with phase=plan to get plan, etc. Unit tests pass.

## Tasks
- [x] **T01: Split ResearchOrchestrator into 4 phase methods with typed results and intermediate states** — Refactor the orchestrator to expose separate methods for each checkpoint:

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
  - Estimate: 2 hours
  - Files: src/engine/research/orchestrator.ts, src/engine/research/types.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts
- [ ] **T02: Update SSE route for multi-phase streaming** — Refactor /api/research/stream to accept a `phase` parameter:

```
phase: 'clarify' | 'plan' | 'research' | 'report' | 'full'
```

Phase-specific request schemas:
- **clarify**: `{ phase: 'clarify', topic, providers?, search? }`
- **plan**: `{ phase: 'plan', topic, questions, feedback, providers? }`
- **research**: `{ phase: 'research', plan, providers?, search? }`
- **report**: `{ phase: 'report', plan, learnings, sources, images, providers?, reportStyle?, reportLength? }`
- **full**: existing behavior (backward compat)

Each phase:
1. Creates orchestrator with correct config
2. Calls the appropriate phase method
3. Subscribes to events and streams as SSE
4. Emits phase-specific result event before `done`
5. Closes connection

The `full` phase preserves current behavior for backward compatibility.

SSE event additions:
- `clarify-result`: `{ questions: string }`
- `plan-result`: `{ plan: string }`
- `research-result`: `{ learnings: string[], sources: Source[], images: ImageSource[] }`
- `result`: existing (final report result)

Move shared code (buildClientProviderConfigs, buildSearchProvider, etc.) into helper functions to reduce duplication across phase handlers.
  - Estimate: 2 hours
  - Files: src/app/api/research/stream/route.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/sse-route.test.ts
- [ ] **T03: Update existing tests for new orchestrator API** — Update all existing orchestrator and SSE route tests:

1. orchestrator.test.ts:
   - Keep `start()` tests as backward-compat verification
   - Add test suite for each phase method:
     - `clarifyOnly()`: verify it stops after clarify, returns questions
     - `planWithContext()`: verify it takes enriched input, returns plan
     - `researchFromPlan()`: verify SERP generation + search + analyze + review
     - `reportFromLearnings()`: verify report generation from explicit inputs
   - Verify abort works for each phase independently
   - Verify state transitions are correct for each phase

2. sse-route.test.ts:
   - Update existing tests to use `phase: 'full'` parameter
   - Add tests for each phase endpoint:
     - POST with phase=clarify → streams clarify events → closes
     - POST with phase=plan → streams plan events → closes
     - POST with phase=research → streams search/analyze events → closes
     - POST with phase=report → streams report events → closes
   - Verify validation: missing required fields per phase
   - Verify error handling per phase

3. Update types.test.ts if ResearchState changes require it
  - Estimate: 1.5 hours
  - Files: src/engine/research/__tests__/orchestrator.test.ts, src/engine/research/__tests__/sse-route.test.ts, src/engine/research/__tests__/types.test.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/
- [ ] **T04: Verify all existing tests pass after refactor** — Run the full test suite to ensure the orchestrator refactor doesn't break downstream consumers:

1. `pnpm vitest run` — full test suite
2. Check that research store tests still pass (they consume SSE events)
3. Check that use-research hook tests still pass (they consume the SSE endpoint)
4. Fix any broken imports or type mismatches

The `phase: 'full'` backward compat on the SSE route should mean existing consumers don't need changes yet — but verify this.
  - Estimate: 30 min
  - Files: src/stores/__tests__/research-store.test.ts, src/hooks/__tests__/use-research.test.ts
  - Verify: pnpm vitest run
