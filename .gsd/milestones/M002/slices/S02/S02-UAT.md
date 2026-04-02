# S02: State: Research Store Multi-Phase State Machine — UAT

**Milestone:** M002
**Written:** 2026-04-02T07:42:53.978Z

# S02 UAT: Research Store Multi-Phase State Machine

## Preconditions
- All dependencies installed (`pnpm install`)
- No environment variables needed (pure unit tests)

## Test Cases

### TC-01: Multi-phase clarify lifecycle
1. Create fresh store instance via `useResearchStore.getState()`
2. Call `store.reset()` — verify state is `idle`, questions is `""`
3. Dispatch `handleEvent("start", { topic: "quantum computing" })` — verify state is `clarifying`
4. Dispatch `handleEvent("clarify-result", { questions: "What aspect?" })` — verify state is `awaiting_feedback`, questions is `"What aspect?"`
5. Call `store.setFeedback("Focus on error correction")` — verify feedback field updated
6. **Expected:** State machine correctly pauses at `awaiting_feedback` with questions preserved and feedback editable.

### TC-02: Multi-phase plan lifecycle
1. Start from `awaiting_feedback` state
2. Dispatch `handleEvent("step-start", { step: "plan", state: "planning" })` — verify state is `planning`
3. Dispatch `handleEvent("plan-result", { plan: "1. Introduction\n2. Methods" })` — verify state is `awaiting_plan_review`, plan is stored
4. Call `store.setPlan("1. Introduction\n2. Methods\n3. Conclusion")` — verify plan updated (user edit)
5. **Expected:** State machine pauses at `awaiting_plan_review` with editable plan.

### TC-03: Multi-phase research results lifecycle
1. Start from `awaiting_plan_review` state
2. Dispatch step-start events for searching → analyzing → reviewing
3. Dispatch `handleEvent("research-result", { learnings: ["fact1"], sources: [{url:"https://example.com", title:"Example"}], images: [] })`
4. Verify state is `awaiting_results_review`
5. Call `store.setSuggestion("Check recent 2025 papers")` — verify suggestion stored
6. **Expected:** State machine pauses at `awaiting_results_review` with learnings/sources stored and suggestion editable.

### TC-04: Full multi-phase to completion
1. Go through idle → clarifying → awaiting_feedback → planning → awaiting_plan_review → searching → analyzing → reviewing → awaiting_results_review → reporting
2. Dispatch `handleEvent("result", { title: "Report", report: "# Report content" })`
3. Dispatch `handleEvent("done", {})`
4. Verify state is `completed`, completedAt is set, result has correct title/report
5. **Expected:** Full lifecycle completes with all checkpoint data preserved.

### TC-05: Abort from checkpoint states
1. Reach `awaiting_feedback` state with questions stored
2. Call `store.abort()` — verify state is `aborted`, questions still preserved
3. Reset and reach `awaiting_plan_review` with plan stored
4. Call `store.abort()` — verify state is `aborted`, plan still preserved
5. Reset and reach `awaiting_results_review` with learnings stored
6. Call `store.abort()` — verify state is `aborted`, learnings still preserved
7. **Expected:** Abort from any checkpoint state preserves accumulated data.

### TC-06: Reset clears all checkpoint fields
1. Reach `awaiting_results_review` with questions, plan, feedback, suggestion all populated
2. Call `store.reset()` — verify state is `idle`, ALL fields (questions, feedback, plan, suggestion, result, error) are empty/null
3. **Expected:** Reset returns to clean idle state with no leftover checkpoint data.

### TC-07: Backward compatibility — old pipeline events
1. Dispatch `handleEvent("start", { topic: "test" })` — state is `clarifying`
2. Dispatch step-start, step-delta, step-complete for clarify step
3. Dispatch step-start, step-delta, step-complete for plan step
4. Continue through all steps without any checkpoint events
5. Dispatch result + done
6. **Expected:** Old continuous pipeline flow works identically — no checkpoint states entered.

### TC-08: Interleaved checkpoint and pipeline events
1. Start research, dispatch clarify-result → awaiting_feedback
2. Dispatch plan step-start → planning, then plan-result → awaiting_plan_review
3. Dispatch research-result → awaiting_results_review
4. Dispatch reporting step-start → reporting, then result + done
5. **Expected:** Checkpoint events and pipeline events can interleave correctly.

### Automated Verification
Run: `pnpm vitest run src/stores/__tests__/research-store.test.ts`
Expected: 62 tests pass

Run: `pnpm vitest run`
Expected: 596 tests pass across 24 files

