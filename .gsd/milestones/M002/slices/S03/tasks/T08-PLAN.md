---
estimated_steps: 17
estimated_files: 2
skills_used: []
---

# T08: Update useResearch hook for multi-phase flow

Update useResearch hook to support multi-phase SSE flow:

1. Replace single `start()` with phase-specific actions:
   - `clarify(options)` — POST with phase=clarify, streams questions
   - `submitFeedbackAndPlan()` — reads questions+feedback from store, POST with phase=plan
   - `approvePlanAndResearch()` — reads plan from store, POST with phase=research
   - `requestMoreResearch()` — reads suggestion+plan+learnings from store, POST with phase=research again
   - `generateReport()` — reads plan+learnings+sources+images from store, POST with phase=report

2. Shared SSE connection logic stays in `connectSSE()` but accepts a phase parameter and builds phase-specific request bodies.

3. Timer management:
   - Start timer on first phase (clarify)
   - Don't stop timer between phases
   - Stop timer on completion or abort

4. History auto-save:
   - Save on completion (after report phase done event)
   - Don't save partial results yet (that's S04)

5. Keep backward compat: `start()` still works as single-request full pipeline

6. Update use-research tests for multi-phase flow

## Inputs

- `src/hooks/use-research.ts`
- `S01 SSE route changes`
- `S02 store changes`

## Expected Output

- `Updated useResearch hook with multi-phase SSE flow`

## Verification

pnpm vitest run src/hooks/__tests__/use-research.test.ts
