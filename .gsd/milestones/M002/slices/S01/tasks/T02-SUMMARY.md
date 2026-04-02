---
id: T02
parent: S01
milestone: M002
provides: []
requires: []
affects: []
key_files: ["src/app/api/research/stream/route.ts", "src/engine/research/__tests__/sse-route.test.ts"]
key_decisions: ["Used z.union (not discriminatedUnion) for request schema to prevent phase fields leaking through to full fallback", "Shared helpers extracted into resolveProviderConfigs, buildSearchProvider, createSSEStream, subscribeOrchestrator, cleanup", "Plan and report phase handlers omit registry creation — orchestrator creates its own internally", "Phase-specific result events (clarify-result, plan-result, research-result) emitted before done; report phase reuses existing result event"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm vitest run src/engine/research/__tests__/sse-route.test.ts — 52 tests pass (22 existing + 30 new). pnpm lint --quiet — no warnings or errors. pnpm tsc --noEmit — no type errors. pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts — 39 tests pass (unchanged)."
completed_at: 2026-04-02T07:10:59.544Z
blocker_discovered: false
---

# T02: Refactor SSE route to support multi-phase streaming with clarify/plan/research/report/full phases

> Refactor SSE route to support multi-phase streaming with clarify/plan/research/report/full phases

## What Happened
---
id: T02
parent: S01
milestone: M002
key_files:
  - src/app/api/research/stream/route.ts
  - src/engine/research/__tests__/sse-route.test.ts
key_decisions:
  - Used z.union (not discriminatedUnion) for request schema to prevent phase fields leaking through to full fallback
  - Shared helpers extracted into resolveProviderConfigs, buildSearchProvider, createSSEStream, subscribeOrchestrator, cleanup
  - Plan and report phase handlers omit registry creation — orchestrator creates its own internally
  - Phase-specific result events (clarify-result, plan-result, research-result) emitted before done; report phase reuses existing result event
duration: ""
verification_result: passed
completed_at: 2026-04-02T07:10:59.545Z
blocker_discovered: false
---

# T02: Refactor SSE route to support multi-phase streaming with clarify/plan/research/report/full phases

**Refactor SSE route to support multi-phase streaming with clarify/plan/research/report/full phases**

## What Happened

Refactored /api/research/stream/route.ts to accept a `phase` parameter (clarify, plan, research, report, full). Each phase has its own request schema, handler function, and result SSE event. Shared helpers were extracted: resolveProviderConfigs, buildSearchProvider, createSSEStream, subscribeOrchestrator, and cleanup — reducing duplication across phase handlers.

The full phase preserves backward compatibility (no phase field = full pipeline). Used z.union instead of discriminatedUnion because the .or() fallback allowed phase-specific fields to leak through as valid full requests when required fields were missing. The union approach correctly validates each variant independently.

Key design decisions: plan and report handlers don't create a registry at the route level since the orchestrator creates its own from providerConfigs. Phase-specific result events (clarify-result, plan-result, research-result) are emitted before done; report phase reuses the existing result event since it returns the same ResearchResult shape.

Extended the test suite from 22 to 52 tests: 22 existing full-pipeline tests preserved, 30 new tests covering all 4 new phases with validation, happy path, null results, error streaming, abort, and cleanup verification.

## Verification

pnpm vitest run src/engine/research/__tests__/sse-route.test.ts — 52 tests pass (22 existing + 30 new). pnpm lint --quiet — no warnings or errors. pnpm tsc --noEmit — no type errors. pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts — 39 tests pass (unchanged).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts` | 0 | ✅ pass | 161ms |
| 2 | `pnpm lint --quiet` | 0 | ✅ pass | 16000ms |
| 3 | `pnpm tsc --noEmit --pretty` | 0 | ✅ pass | 10000ms |
| 4 | `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` | 0 | ✅ pass | 257ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/research/stream/route.ts`
- `src/engine/research/__tests__/sse-route.test.ts`


## Deviations
None.

## Known Issues
None.
