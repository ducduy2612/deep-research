# S04: Tests + verification

**Goal:** Verify all M004 changes are correctly tested: 823+ tests pass, production build is clean, zero dead code references to start()/StartOptions/phase=full/fullSchema/handleFullPhase remain, and add explicit gap test for unknown phase rejection.
**Demo:** All 498+ existing tests pass + new tests for cycle cap, reviewOnly, review route, auto-review trigger, requestMoreResearch review

## Must-Haves

- All 823+ existing tests pass with zero failures
- Production build completes with no type errors
- grep confirms zero references to start(), StartOptions, phase==="full", fullSchema, handleFullPhase in production code
- At least 1 new test added for unknown phase (e.g. phase="full") returning 400

## Proof Level

- This slice proves: contract — test suite + build + grep sweeps prove correctness

## Integration Closure

Nothing — this is a verification-only slice. All integration was completed in S01–S03.

## Verification

- none

## Tasks

- [x] **T01: Run full test suite and production build** `est:15m`
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
  - Files: `vitest.config.ts`, `tsconfig.json`
  - Verify: pnpm test --run && pnpm build

- [x] **T02: Dead code sweep and gap test for unknown phase rejection** `est:20m`
  Run grep sweeps to confirm zero residual references to dead code (start(), StartOptions, phase=full, fullSchema, handleFullPhase) in production code. Then add an explicit test that sending an unknown phase like `phase: "full"` to the SSE route returns 400 — currently this behavior is only implicitly covered by Zod's discriminated union rejecting unknown literals.

## Steps

1. Run grep sweeps for dead code residuals:
   - `grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__` → expect no matches
   - `grep -rn 'phase.*full\|fullSchema\|handleFull' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v '_archive'` → expect only benign comment in types.ts
   - `grep -rn 'start()' src/hooks/use-research.ts src/components/research/TopicInput.tsx src/app/page.tsx src/engine/research/orchestrator.ts` → expect no matches
2. Add a test in `src/engine/research/__tests__/sse-route.test.ts` in the "general validation" describe block:
   - Test name: `it("returns 400 for unknown phase", ...)`
   - Sends `{ ...baseFields, phase: "full" }` to POST handler
   - Asserts response status 400
   - This provides explicit coverage for the Zod union rejection of unknown phases
3. Run `pnpm test --run` to confirm the new test passes alongside all existing tests

## Must-Haves

- [ ] grep confirms zero StartOptions in production code
- [ ] grep confirms no start() references in key production files
- [ ] grep confirms only benign comment about 'full' in types.ts
- [ ] New test for unknown phase rejection added and passing

## Verification

- `grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__` exits 1 (no matches)
- `grep -rn 'start()' src/hooks/use-research.ts src/components/research/TopicInput.tsx src/app/page.tsx` exits 1
- `pnpm test --run` exits 0 with all tests including the new one passing

## Inputs

- `src/engine/research/__tests__/sse-route.test.ts` — existing test file to add gap test to
- `src/app/api/research/stream/route.ts` — SSE route with Zod discriminated union

## Expected Output

- `src/engine/research/__tests__/sse-route.test.ts` — modified with new unknown phase test
  - Files: `src/engine/research/__tests__/sse-route.test.ts`, `src/app/api/research/stream/route.ts`
  - Verify: pnpm test --run src/engine/research/__tests__/sse-route.test.ts

## Files Likely Touched

- vitest.config.ts
- tsconfig.json
- src/engine/research/__tests__/sse-route.test.ts
- src/app/api/research/stream/route.ts
