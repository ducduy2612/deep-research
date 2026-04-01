---
id: T01
parent: S02
milestone: M001
provides: []
requires: []
affects: []
key_files: ["vitest.config.ts", "src/engine/provider/types.ts", "src/engine/provider/__tests__/types.test.ts", "package.json"]
key_decisions: ["Used z.object() with optional fields + catchall(z.never()) for StepModelMap schema instead of z.record() because Zod v4's record with enum keys requires all keys present"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "21/21 tests pass via `pnpm vitest run src/engine/provider/__tests__/types.test.ts`. ESLint reports zero warnings/errors. Vitest configured with correct path alias and test include pattern."
completed_at: 2026-03-31T17:15:51.151Z
blocker_discovered: false
---

# T01: Install vitest and create provider types with Zod v4 schemas, helpers, and 21 passing tests

> Install vitest and create provider types with Zod v4 schemas, helpers, and 21 passing tests

## What Happened
---
id: T01
parent: S02
milestone: M001
key_files:
  - vitest.config.ts
  - src/engine/provider/types.ts
  - src/engine/provider/__tests__/types.test.ts
  - package.json
key_decisions:
  - Used z.object() with optional fields + catchall(z.never()) for StepModelMap schema instead of z.record() because Zod v4's record with enum keys requires all keys present
duration: ""
verification_result: passed
completed_at: 2026-03-31T17:15:51.152Z
blocker_discovered: false
---

# T01: Install vitest and create provider types with Zod v4 schemas, helpers, and 21 passing tests

**Install vitest and create provider types with Zod v4 schemas, helpers, and 21 passing tests**

## What Happened

Installed vitest 4.1.2 as dev dependency and configured it with @/ path alias. Created src/engine/provider/types.ts with all provider types (ProviderId, ModelRole, ResearchStep, ModelCapabilities, ProviderModelConfig, ProviderConfig, StepModelMap), their Zod schemas, and two helpers (isOpenAICompatible, getModelsByRole). Adapted stepModelMapSchema from z.record() to z.object() with optional fields due to Zod v4's stricter record validation requiring all enum keys. Created 21 comprehensive tests covering schema validation, helpers, and edge cases. All tests pass, lint clean.

## Verification

21/21 tests pass via `pnpm vitest run src/engine/provider/__tests__/types.test.ts`. ESLint reports zero warnings/errors. Vitest configured with correct path alias and test include pattern.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/provider/__tests__/types.test.ts` | 0 | ✅ pass | 115ms |
| 2 | `pnpm lint` | 0 | ✅ pass | 5000ms |


## Deviations

Changed stepModelMapSchema from z.record(enumKey, valueSchema) to z.object({...optional}).catchall(z.never()) due to Zod v4's z.record() requiring all enum keys present — not compatible with Partial<Record<>> semantics.

## Known Issues

None.

## Files Created/Modified

- `vitest.config.ts`
- `src/engine/provider/types.ts`
- `src/engine/provider/__tests__/types.test.ts`
- `package.json`


## Deviations
Changed stepModelMapSchema from z.record(enumKey, valueSchema) to z.object({...optional}).catchall(z.never()) due to Zod v4's z.record() requiring all enum keys present — not compatible with Partial<Record<>> semantics.

## Known Issues
None.
