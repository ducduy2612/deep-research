# S04: Tests + verification — UAT

**Milestone:** M004
**Written:** 2026-04-14T18:33:31.992Z

# S04 UAT — Tests + Verification

## Preconditions
- M004 S01–S03 complete (orchestrator changes, review phase, dead code cleanup)
- `pnpm install` has been run
- Working directory is project root

## Test Cases

### TC1: Full test suite passes
**Steps:**
1. Run `pnpm test --run`
**Expected:** All 824 tests pass across 43 test files, exit code 0. Test count is ≥824 (increased from 823 by T02's new test).

### TC2: Production build is clean
**Steps:**
1. Run `pnpm build`
**Expected:** Build completes successfully with zero type errors. All routes compile. Exit code 0.

### TC3: Zero StartOptions in production code
**Steps:**
1. Run `grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__`
**Expected:** No matches (exit code 1). StartOptions was renamed to ClarifyOptions in S03.

### TC4: Zero start() in key production files
**Steps:**
1. Run `grep -rn 'start()' src/hooks/use-research.ts src/components/research/TopicInput.tsx src/app/page.tsx src/engine/research/orchestrator.ts`
**Expected:** No matches (exit code 1). All entry points use clarify() only.

### TC5: No full phase references in production code
**Steps:**
1. Run `grep -rn 'phase.*full\|fullSchema\|handleFull' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v '_archive'`
**Expected:** Only benign comment in types.ts line 190 ("same shape as full ResearchResult"). No functional references to fullSchema, handleFullPhase, or phase==="full".

### TC6: Unknown phase rejection test
**Steps:**
1. Run `pnpm test --run src/engine/research/__tests__/sse-route.test.ts`
2. Verify test "returns 400 for unknown phase" exists and passes
**Expected:** 51 tests pass in sse-route.test.ts (up from 50). The new test sends `{ phase: "full", topic: "test topic" }` and asserts status 400 with VALIDATION_FAILED error code.

### TC7: M004-specific test coverage
**Steps:**
1. Verify orchestrator tests include cycle cap tests (≥3 tests: cap hit returns remaining, default cap is 2, under-cap executes all)
2. Verify SSE route tests include review phase tests
3. Verify ResearchActions tests include auto-review UI tests (≥12 tests)
4. Verify useResearch tests include review phase and requestMoreResearch tests
**Expected:** All present and passing as part of the 824-test suite.

## Edge Cases Verified
- Unknown phase literal (e.g. "full") rejected with 400 via Zod discriminated union
- Cycle cap enforced: remaining queries returned when cap hit
- Auto-review progress visible to user with round counter and abort button

