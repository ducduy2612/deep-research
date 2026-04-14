---
estimated_steps: 26
estimated_files: 2
skills_used: []
---

# T02: Dead code sweep and gap test for unknown phase rejection

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

## Inputs

- `src/engine/research/__tests__/sse-route.test.ts`
- `src/app/api/research/stream/route.ts`

## Expected Output

- `src/engine/research/__tests__/sse-route.test.ts`

## Verification

pnpm test --run src/engine/research/__tests__/sse-route.test.ts
