---
estimated_steps: 20
estimated_files: 2
skills_used: []
---

# T01: Run full test suite and production build

Execute the complete test suite and production build to confirm all 823+ tests pass and the build is clean with no type errors. This is the primary verification gate for the entire M004 milestone.

## Steps

1. Run `pnpm test --run` — confirm all tests pass, note the count (expect 823+)
2. Run `pnpm build` — confirm clean build with no type errors
3. Record exact test count and build status for the summary

## Must-Haves

- [ ] All tests pass (823+)
- [ ] Production build succeeds with zero type errors

## Verification

- `pnpm test --run` exits 0 with all tests passing
- `pnpm build` exits 0 with no errors

## Inputs

- `src/engine/research/__tests__/orchestrator.test.ts` — cycle cap and reviewOnly tests from S01/S02
- `src/engine/research/__tests__/sse-route.test.ts` — SSE route tests for all phases
- `src/stores/__tests__/research-store-auto-review.test.ts` — auto-review store tests
- `src/hooks/__tests__/use-research-auto-review.test.ts` — auto-review hook tests
- `src/hooks/__tests__/use-research.test.ts` — useResearch hook tests
- `src/components/research/__tests__/ResearchActions.test.tsx` — auto-review UI tests

## Expected Output

- No file changes — verification-only task

## Inputs

- `src/engine/research/__tests__/orchestrator.test.ts`
- `src/engine/research/__tests__/sse-route.test.ts`
- `src/stores/__tests__/research-store-auto-review.test.ts`
- `src/hooks/__tests__/use-research-auto-review.test.ts`
- `src/hooks/__tests__/use-research.test.ts`
- `src/components/research/__tests__/ResearchActions.test.tsx`

## Expected Output

- `src/engine/research/__tests__/sse-route.test.ts`

## Verification

pnpm test --run && pnpm build
