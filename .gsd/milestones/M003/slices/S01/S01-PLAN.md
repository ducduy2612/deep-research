# S01: Store Refactor — Checkpoints + Workspace Separation

**Goal:** Restructure the research store to add an immutable `checkpoints` object alongside existing flat mutable workspace fields. Add a `freeze(phase)` action that copies workspace data into frozen checkpoints. Add `manualQueries` field for the research workspace (S03). All state persists across refresh. All 638+ existing tests continue passing.
**Demo:** After this: Store has checkpoints{} + workspace{} separation. Workspace edits (questions, feedback, suggestion, manual queries) survive refresh. Frozen data is immutable — freeze() action prevents mutation. All 617+ existing tests pass.

## Tasks
- [x] **T01: Verify checkpoint types, persist schemas, freeze action, and fix pre-existing AI SDK v6 compatibility issues** — Extract persistence schemas from research-store.ts into a new research-store-persist.ts helper to keep the store under 500 lines. Add checkpoint type definitions to engine/research/types.ts. Add checkpoints, manualQueries, and freeze() to the store. Update reset(), persist schema, auto-persist, hydrate, and barrel exports.
  - Estimate: 1h
  - Files: src/engine/research/types.ts, src/stores/research-store-persist.ts, src/stores/research-store.ts, src/stores/index.ts
  - Verify: pnpm vitest run && pnpm build
- [ ] **T02: Write tests for freeze semantics, persist round-trip, and backward compat** — Create a new test file covering the checkpoint/freeze/persist surface: freeze() for all 4 phases, freeze() idempotency, freeze() overwrite (regeneration), reset() clearing checkpoints, persist+hydrate round-trip with checkpoints, hydrate with old state missing checkpoints, manualQueries state and setter.
  - Estimate: 45m
  - Files: src/stores/__tests__/research-store-freeze.test.ts
  - Verify: pnpm vitest run -- src/stores/__tests__/research-store-freeze.test.ts && pnpm vitest run
