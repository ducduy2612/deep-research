---
estimated_steps: 20
estimated_files: 3
skills_used: []
---

# T03: Update existing tests for new orchestrator API

Update all existing orchestrator and SSE route tests:

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

## Inputs

- `src/engine/research/orchestrator.ts`
- `src/app/api/research/stream/route.ts`
- `src/engine/research/types.ts`

## Expected Output

- `All tests passing with new phase-based API`

## Verification

pnpm vitest run src/engine/research/__tests__/
