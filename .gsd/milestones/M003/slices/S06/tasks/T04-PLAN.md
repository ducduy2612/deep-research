---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T04: Run full test suite + lint + build

After browser verification confirms everything works:
1. Run full vitest suite — all tests must pass
2. Run pnpm lint — no errors
3. Run pnpm build — production build succeeds

Fix any issues found.

## Inputs

- `src/`

## Expected Output

- Update the implementation and proof artifacts needed for this task.

## Verification

pnpm vitest run && pnpm lint && pnpm build — all green.
