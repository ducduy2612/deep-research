# S01: Store Refactor — Checkpoints + Workspace Separation — UAT

**Milestone:** M003
**Written:** 2026-04-03T15:26:32.420Z

# S01 UAT: Store Refactor — Checkpoints + Workspace Separation

## Preconditions
- Dev server running (`pnpm dev`)
- Test environment: `pnpm vitest run`

## Test Cases

### TC-01: freeze() creates immutable clarify checkpoint
**Precondition:** Fresh store state (call reset()).
1. Set questions: `store.setQuestions(["What is quantum computing?"])`
2. Call `store.freeze("clarify")`
3. **Assert:** `store.checkpoints.clarify` is not null
4. **Assert:** `store.checkpoints.clarify.questions` equals `["What is quantum computing?"]`
5. **Assert:** `store.checkpoints.clarify.frozenAt` is a valid ISO timestamp
6. Change questions: `store.setQuestions(["Different question"])`
7. **Assert:** `store.checkpoints.clarify.questions` still equals `["What is quantum computing?"]` — checkpoint is immutable

### TC-02: freeze() creates immutable plan checkpoint
**Precondition:** Fresh store state.
1. Set plan: `store.setPlan("## Research Plan\n1. Step one")`
2. Call `store.freeze("plan")`
3. **Assert:** `store.checkpoints.plan` is not null
4. **Assert:** `store.checkpoints.plan.plan` equals `"## Research Plan\n1. Step one"`
5. Change plan: `store.setPlan("Modified plan")`
6. **Assert:** `store.checkpoints.plan.plan` still equals `"## Research Plan\n1. Step one"`

### TC-03: freeze() creates research and report checkpoints
**Precondition:** Fresh store state with result populated.
1. Set result with learnings/sources: `store.setResult({ learnings: ["finding 1"], sources: [...] })`
2. Call `store.freeze("research")`
3. **Assert:** `store.checkpoints.research` exists with learnings
4. Call `store.freeze("report")`
5. **Assert:** `store.checkpoints.report` exists with result

### TC-04: freeze() is idempotent
**Precondition:** Fresh store state.
1. `store.setQuestions(["Q1"])`
2. `store.freeze("clarify")`
3. `store.freeze("clarify")` — call again
4. **Assert:** No error thrown, checkpoint still valid

### TC-05: freeze() overwrite (regeneration scenario)
**Precondition:** Fresh store state.
1. `store.setQuestions(["Old questions"])`
2. `store.freeze("clarify")`
3. Record first `frozenAt` timestamp
4. `store.setQuestions(["New questions"])`
5. `store.freeze("clarify")` — re-freeze
6. **Assert:** `store.checkpoints.clarify.questions` equals `["New questions"]`
7. **Assert:** `frozenAt` is newer than first timestamp

### TC-06: reset() clears all checkpoints
**Precondition:** Store with frozen checkpoints.
1. Freeze clarify and plan
2. Call `store.reset()`
3. **Assert:** `store.checkpoints` equals `{}`
4. **Assert:** All workspace fields (questions, plan, feedback, manualQueries) are reset

### TC-07: manualQueries state management
**Precondition:** Fresh store state.
1. **Assert:** `store.manualQueries` equals `[]`
2. `store.setManualQueries(["custom query 1", "custom query 2"])`
3. **Assert:** `store.manualQueries` equals `["custom query 1", "custom query 2"]`
4. `store.setManualQueries([])`
5. **Assert:** `store.manualQueries` equals `[]`

### TC-08: Persist + hydrate round-trip preserves checkpoints
**Precondition:** Fresh store state.
1. Set questions and freeze clarify
2. Set plan and freeze plan
3. Call `store.persistToStorage()`
4. Call `store.reset()` — clears everything
5. Call `store.hydrateFromStorage()`
6. **Assert:** `store.checkpoints.clarify` exists with correct questions
7. **Assert:** `store.checkpoints.plan` exists with correct plan

### TC-09: Backward compatibility with old state
**Precondition:** Old saved state without checkpoints/manualQueries fields.
1. Save state to localforage without checkpoints field
2. Call `store.hydrateFromStorage()`
3. **Assert:** `store.checkpoints` equals `{}` (default)
4. **Assert:** `store.manualQueries` equals `[]` (default)

### TC-10: Invalid phase string is no-op
**Precondition:** Fresh store state.
1. `store.setQuestions(["Test"])`
2. `store.freeze("invalid_phase" as any)`
3. **Assert:** `store.checkpoints` equals `{}` — no mutation occurred

### TC-11: All existing tests still pass
**Precondition:** None.
1. Run `pnpm vitest run`
2. **Assert:** 669 tests pass across 30 files
3. Run `pnpm build`
4. **Assert:** Production build succeeds

## Edge Cases Covered
- Report freeze with null result → no-op
- Research freeze with null result → captures correctly
- Partial checkpoints (only clarify frozen) → other phases remain null
- Freeze does not clear workspace fields (feedback persists independently)

