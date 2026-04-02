---
estimated_steps: 25
estimated_files: 1
skills_used: []
---

# T06: Write tests for multi-phase research store

Write comprehensive tests for the multi-phase research store:

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

## Inputs

- `src/stores/research-store.ts`

## Expected Output

- `New test file for multi-phase store behavior`

## Verification

pnpm vitest run src/stores/__tests__/research-store.test.ts
