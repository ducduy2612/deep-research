---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T03: Add review-result store handler, auto-review trigger in hook, remove start()

In research-store-events.ts: add review-result handler that merges learnings/sources/images like research-result does. In research-store.ts: add autoReviewRoundsRemaining to state/INITIAL_STATE. In research-store-persist.ts: add autoReviewRoundsRemaining to persistedStateSchema. In use-research.ts: (a) remove start() method and StartOptions type (keep it for clarify parameter), (b) remove start from UseResearchReturn interface, (c) update requestMoreResearch to send phase:'review' with learnings/sources/images/suggestion from store, (d) add auto-review trigger effect: when research-result done fires AND autoReviewRounds > 0 AND autoReviewRoundsRemaining > 0, decrement counter and fire review SSE connection, (e) set autoReviewRoundsRemaining from settings when research phase starts.

## Inputs

- ``src/stores/research-store-events.ts` — event handler switch`
- ``src/stores/research-store.ts` — ResearchStoreState, INITIAL_STATE`
- ``src/stores/research-store-persist.ts` — persistedStateSchema`
- ``src/hooks/use-research.ts` — start(), requestMoreResearch(), UseResearchReturn, auto-reconnect effect`

## Expected Output

- ``src/stores/research-store-events.ts` — review-result case in handler`
- ``src/stores/research-store.ts` — autoReviewRoundsRemaining in state`
- ``src/stores/research-store-persist.ts` — autoReviewRoundsRemaining in schema`
- ``src/hooks/use-research.ts` — no start(), requestMoreResearch sends phase:review, auto-review trigger effect`

## Verification

pnpm test -- --run src/hooks/__tests__/use-research.test.ts src/hooks/__tests__/use-research-multi-phase.test.ts 2>&1 | tail -5

## Observability Impact

Auto-review trigger logs round number and remaining count. review-result event merges data into store visibly.
