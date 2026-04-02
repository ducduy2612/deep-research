---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T04: Verify all existing tests pass after refactor

Run the full test suite to ensure the orchestrator refactor doesn't break downstream consumers:

1. `pnpm vitest run` — full test suite
2. Check that research store tests still pass (they consume SSE events)
3. Check that use-research hook tests still pass (they consume the SSE endpoint)
4. Fix any broken imports or type mismatches

The `phase: 'full'` backward compat on the SSE route should mean existing consumers don't need changes yet — but verify this.

## Inputs

- `src/engine/research/`
- `src/stores/`
- `src/hooks/`

## Expected Output

- `Full test suite green`

## Verification

pnpm vitest run
