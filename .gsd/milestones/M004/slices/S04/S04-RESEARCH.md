# S04 Research: Tests + Verification

**Depth:** Light — this is a verification slice confirming existing test coverage for M004 changes. All M004 features were implemented with tests in S01–S03.

## Summary

All 823 tests pass (43 test files). Build is clean. The testing requirements from the milestone context are fully met by tests added during S01–S03 implementation. This slice is primarily a final verification gate.

## Test Coverage Audit

### Cycle Cap (maxCyclesPerInvocation)
**File:** `src/engine/research/__tests__/orchestrator.test.ts` (lines 521–583)
- ✅ "stops after maxCyclesPerInvocation cycles and returns remaining queries" — cap hit with 4 queries, cap=2, verifies 2 executed, 2 remaining
- ✅ "defaults to 2 cycles when maxCyclesPerInvocation not set" — 5 queries, no cap config, verifies default=2
- ✅ "executes all queries when under the cycle cap" — cap=5 with 2 queries, all execute

### reviewOnly() Method
**File:** `src/engine/research/__tests__/orchestrator.test.ts` (lines 587–700)
- ✅ Generates follow-up queries and executes 1 search+analyze cycle
- ✅ Returns existing data when no follow-up queries needed
- ✅ Passes suggestion to review prompt
- ✅ Transitions to awaiting_results_review on success
- ✅ Returns null on failure
- ✅ Returns null on abort

### SSE Route Review Phase
**File:** `src/engine/research/__tests__/sse-route.test.ts` (20 tests in "review phase" describe block)
- ✅ Returns 200 with SSE headers
- ✅ Calls reviewOnly with correct args (plan, learnings, sources, images)
- ✅ Passes suggestion to reviewOnly
- ✅ Emits review-result event with accumulated data
- ✅ Includes phase in start event
- ✅ Omits review-result when result is null
- ✅ Returns 400 when plan/learnings/sources/images missing (4 validation tests)
- ✅ Calls destroy on cleanup / even when reviewOnly throws
- ✅ Streams error when reviewOnly throws / with AppError code
- ✅ Calls abort when request signal fires
- ✅ Creates search provider for review phase
- ✅ Passes language, promptOverrides, stepModelMap, provider configs

### Full Phase Absence
- ✅ No `fullSchema`, `handleFullPhase`, or `Phase 'full'` in route.ts (grep-verified)
- ✅ Route uses discriminated union with only `clarify`, `plan`, `research`, `report`, `review` (Zod `.literal()` per phase)
- Note: No explicit test that `phase=full` returns 400 — implicitly covered by Zod discriminated union rejecting unknown phases

### Auto-Review Trigger (Hook)
**File:** `src/hooks/__tests__/use-research-auto-review.test.ts` (3 tests)
- ✅ Trigger sets autoReviewCurrentRound to correct round number
- ✅ Trigger sets autoReviewTotalRounds from settings.autoReviewRounds
- ✅ Abort during auto-review sets state to aborted

### Auto-Review Store
**File:** `src/stores/__tests__/research-store-auto-review.test.ts` (12 tests)
- ✅ Initial state (autoReviewCurrentRound=0, autoReviewTotalRounds=0, autoReviewRoundsRemaining=0)
- ✅ Persistence of round fields to storage
- ✅ Hydration restores round fields / falls back to 0 / handles malformed values
- ✅ review-result handler resets rounds when remaining=0 / preserves when remaining>0
- ✅ Store reset clears all round fields
- ✅ Manual review (no auto-review) doesn't set round fields

### Auto-Review UI
**File:** `src/components/research/__tests__/ResearchActions.test.tsx` (12 tests)
- ✅ Shows "Auto-review round N/M..." banner when reviewing with round > 0
- ✅ Hides More Research / Finalize buttons during auto-review
- ✅ Shows normal review UI when no auto-review active
- ✅ Abort button visible and calls onAbortAutoReview
- ✅ Loading states for researching/analyzing
- ✅ Returns null for idle/completed states

### requestMoreResearch → Review Phase
**File:** `src/hooks/__tests__/use-research.test.ts` (lines 352–420)
- ✅ Sends phase:review with learnings/sources/images
- ✅ Omits suggestion when empty

**File:** `src/hooks/__tests__/use-research-multi-phase.test.ts`
- ✅ Sends review phase with learnings and suggestion
- ✅ Sends review phase without suggestion when empty

### Dead Code Elimination
- ✅ grep confirms zero references to `start()` in production code (only test utilities)
- ✅ grep confirms zero references to `StartOptions` (renamed to `ClarifyOptions`)
- ✅ grep confirms zero references to `phase === "full"` in src/
- ✅ Only benign comment "same shape as full ResearchResult" in types.ts

## Verification Commands

```bash
# Full test suite
pnpm test --run  # → 823 passed, 43 files

# Production build
pnpm build  # → clean, no type errors

# Dead code verification
grep -rn 'start()' src/hooks/use-research.ts src/components/research/TopicInput.tsx src/app/page.tsx  # → no matches
grep -rn 'phase.*full\|fullSchema\|handleFull' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v '_archive'  # → only benign comment
grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__  # → no matches
```

## Recommendation

This is a straightforward verification slice. All testing requirements from the milestone context are met. The planner should:

1. **T01: Run full verification** — Execute `pnpm test --run` and `pnpm build` to confirm 823 tests pass and build is clean
2. **T02: Dead code sweep** — Run grep commands confirming zero references to start(), StartOptions, phase=full, fullSchema, handleFullPhase in production code
3. **T03: Optional gap tests** — Add 2–3 small tests for explicit coverage of gaps:
   - `phase: "full"` returns 400 in sse-route.test.ts (1 test)
   - review-result learnings accumulation assertion in research-store-auto-review.test.ts (1 test)
   - These are nice-to-have, not blockers — the behavior is implicitly correct

**No skill discovery needed** — this is pure test verification with no new libraries or frameworks.

## Implementation Landscape

| File | What it does | Relevance |
|------|-------------|-----------|
| `src/engine/research/__tests__/orchestrator.test.ts` | 35 tests for orchestrator (cycle cap, reviewOnly, phase methods) | Primary verification target |
| `src/engine/research/__tests__/sse-route.test.ts` | 50 tests for SSE route (all phases including review) | Primary verification target |
| `src/stores/__tests__/research-store-auto-review.test.ts` | 12 tests for auto-review store state | Primary verification target |
| `src/hooks/__tests__/use-research-auto-review.test.ts` | 3 tests for auto-review hook trigger | Primary verification target |
| `src/hooks/__tests__/use-research.test.ts` | 32 tests including requestMoreResearch | Primary verification target |
| `src/components/research/__tests__/ResearchActions.test.tsx` | 12 tests for auto-review UI | Primary verification target |
| `src/app/api/research/stream/route.ts` | SSE route (maxDuration=300, review phase, no full phase) | Verification target (no full phase) |
| `src/engine/research/orchestrator.ts` | timeBudgetMs=180s, maxCyclesPerInvocation, reviewOnly() | Verification target |
