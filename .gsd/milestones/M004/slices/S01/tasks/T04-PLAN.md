---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T04: Remove orchestrator.start(), update all broken tests, add cycle cap and review tests

Remove the start() method from orchestrator.ts. Update test files: (1) orchestrator.test.ts — remove/convert ~17 start() test cases (the 'phase chaining' describe block already tests the multi-phase flow), add test for cycle cap enforcement (mock 4 queries, verify only 2 run), add test for reviewOnly() producing queries from learnings and executing 1 cycle, add test for researchFromPlan not calling runReviewLoop; (2) sse-route.test.ts — remove full-pipeline test block (lines ~182+), add review phase test; (3) use-research.test.ts — convert start() tests to clarify() tests, remove start-specific assertions; (4) use-research-multi-phase.test.ts — verify requestMoreResearch sends phase:'review'. After all updates: pnpm test, pnpm build, pnpm lint must all pass.

## Inputs

- ``src/engine/research/orchestrator.ts` — start() method to remove`
- ``src/engine/research/__tests__/orchestrator.test.ts` — 17 start() test calls`
- ``src/engine/research/__tests__/sse-route.test.ts` — full pipeline tests`
- ``src/hooks/__tests__/use-research.test.ts` — start() tests`
- ``src/hooks/__tests__/use-research-multi-phase.test.ts` — phase flow tests`

## Expected Output

- ``src/engine/research/orchestrator.ts` — no start() method`
- ``src/engine/research/__tests__/orchestrator.test.ts` — no start() calls, new cycle cap + reviewOnly tests`
- ``src/engine/research/__tests__/sse-route.test.ts` — no full pipeline tests, review phase tests`
- ``src/hooks/__tests__/use-research.test.ts` — clarify-based tests, no start() calls`
- ``src/hooks/__tests__/use-research-multi-phase.test.ts` — requestMoreResearch sends review phase`

## Verification

pnpm test --run 2>&1 | tail -10 && pnpm build 2>&1 | tail -5 && pnpm lint 2>&1 | tail -5
