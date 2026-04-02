---
estimated_steps: 32
estimated_files: 2
skills_used: []
---

# T05: Add multi-phase states and fields to research store

Extend ResearchState to include checkpoint pause states:

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

## Inputs

- `src/stores/research-store.ts`
- `src/engine/research/types.ts`
- `S01 orchestrator output`

## Expected Output

- `Updated research store with multi-phase state`

## Verification

pnpm vitest run src/stores/__tests__/research-store.test.ts
