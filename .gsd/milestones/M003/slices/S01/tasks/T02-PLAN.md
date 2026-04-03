---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Write tests for freeze semantics, persist round-trip, and backward compat

Create a new test file covering the checkpoint/freeze/persist surface: freeze() for all 4 phases, freeze() idempotency, freeze() overwrite (regeneration), reset() clearing checkpoints, persist+hydrate round-trip with checkpoints, hydrate with old state missing checkpoints, manualQueries state and setter.

## Inputs

- ``src/stores/research-store.ts` — store with freeze(), checkpoints, manualQueries (from T01)`
- ``src/stores/research-store-persist.ts` — persistence schemas (from T01)`
- ``src/stores/__tests__/research-store-persistence.test.ts` — reference for persist test patterns (mock storage approach)`

## Expected Output

- ``src/stores/__tests__/research-store-freeze.test.ts` — comprehensive test file covering freeze semantics, persist round-trip, backward compat, manualQueries`

## Verification

pnpm vitest run -- src/stores/__tests__/research-store-freeze.test.ts && pnpm vitest run

## Observability Impact

Tests serve as executable documentation for checkpoint semantics — a future agent can read this test file to understand freeze() behavior for all phases.
