---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T01: Extract persist schemas + add checkpoint types + implement freeze action

Extract persistence schemas from research-store.ts into a new research-store-persist.ts helper to keep the store under 500 lines. Add checkpoint type definitions to engine/research/types.ts. Add checkpoints, manualQueries, and freeze() to the store. Update reset(), persist schema, auto-persist, hydrate, and barrel exports.

## Inputs

- ``src/engine/research/types.ts` — existing types (Source, ImageSource, ResearchResult, sourceSchema, imageSourceSchema)`
- ``src/stores/research-store.ts` — current 603-line store to refactor`
- ``src/stores/index.ts` — barrel exports to update`

## Expected Output

- ``src/engine/research/types.ts` — checkpoint type definitions and checkpointSchema added`
- ``src/stores/research-store-persist.ts` — new file with extracted persistence schemas`
- ``src/stores/research-store.ts` — refactored store with checkpoints, freeze(), manualQueries under 500 content lines`
- ``src/stores/index.ts` — updated barrel exports`

## Verification

pnpm vitest run && pnpm build

## Observability Impact

Checkpoint state inspectable via useResearchStore.getState().checkpoints. Freeze action logs to activityLog. Persistence failures already surface via console.error.
