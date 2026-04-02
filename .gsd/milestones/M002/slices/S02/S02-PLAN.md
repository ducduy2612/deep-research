# S02: State: Research Store Multi-Phase State Machine

**Goal:** Update the research store to handle multi-phase state with pause states for user input at each checkpoint.
**Demo:** After this: After this: research store correctly tracks idle→clarifying→awaiting_feedback→planning→awaiting_plan_review→researching→awaiting_results_review→reporting→completed

## Tasks
- [ ] **T05: Add multi-phase states and fields to research store** — Extend ResearchState to include checkpoint pause states:

```typescript
export type ResearchState =
  | 'idle'
  | 'clarifying'
  | 'awaiting_feedback'     // NEW: clarify done, waiting for user
  | 'planning'
  | 'awaiting_plan_review'  // NEW: plan done, waiting for user
  | 'searching'
  | 'analyzing'
  | 'reviewing'
  | 'awaiting_results_review' // NEW: research done, waiting for user
  | 'reporting'
  | 'completed'
  | 'failed'
  | 'aborted';
```

Add new store fields:
- `questions: string` — clarify step output (editable)
- `feedback: string` — user's feedback on questions
- `plan: string` — plan step output (editable)
- `suggestion: string` — user's suggestion for more research

Add new store actions:
- `setQuestions(text: string)` — update questions (for editing)
- `setFeedback(text: string)` — set feedback
- `setPlan(text: string)` — update plan (for editing)
- `setSuggestion(text: string)` — set suggestion

Update handleEvent to handle new SSE events:
- `clarify-result` → store questions, transition to awaiting_feedback
- `plan-result` → store plan, transition to awaiting_plan_review
- `research-result` → store learnings/sources/images, transition to awaiting_results_review

Existing events still work for the full-pipeline flow.
  - Estimate: 1.5 hours
  - Files: src/stores/research-store.ts, src/engine/research/types.ts
  - Verify: pnpm vitest run src/stores/__tests__/research-store.test.ts
- [ ] **T06: Write tests for multi-phase research store** — Write comprehensive tests for the multi-phase research store:

1. State transition tests:
   - idle → clarifying → awaiting_feedback (via clarify-result event)
   - awaiting_feedback → planning → awaiting_plan_review (via plan-result event)
   - awaiting_plan_review → searching → analyzing → reviewing → awaiting_results_review
   - awaiting_results_review → reporting → completed
   - Invalid transitions rejected

2. Data persistence across phases:
   - Questions stored from clarify-result
   - Plan stored from plan-result
   - Learnings/sources accumulated across multiple research phases
   - Feedback, suggestion, plan edits preserved

3. User input actions:
   - setQuestions() updates questions field
   - setFeedback() updates feedback field
   - setPlan() updates plan field
   - setSuggestion() updates suggestion field

4. Abort and reset from any state:
   - Abort from awaiting_feedback → aborted
   - Abort from awaiting_plan_review → aborted
   - Abort from awaiting_results_review → aborted
   - Reset clears all fields back to idle

5. Backward compat:
   - Full pipeline events (existing) still transition correctly
   - Old start/step-start/step-delta/step-complete/result/done still works
  - Estimate: 1.5 hours
  - Files: src/stores/__tests__/research-store.test.ts
  - Verify: pnpm vitest run src/stores/__tests__/research-store.test.ts
- [ ] **T07: Verify full test suite passes with store changes** — Run full test suite to verify nothing is broken:

1. `pnpm vitest run`
2. Fix any broken type checks
3. Verify research-store test updates don't break use-research tests
  - Estimate: 30 min
  - Verify: pnpm vitest run
