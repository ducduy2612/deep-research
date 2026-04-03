---
id: T01
parent: S01
milestone: M003
provides: []
requires: []
affects: []
key_files: ["src/engine/research/types.ts", "src/stores/research-store-persist.ts", "src/stores/research-store.ts", "src/stores/index.ts", "src/engine/provider/streaming.ts", "src/engine/research/orchestrator.ts", "src/engine/search/providers/model-native.ts"]
key_decisions: ["AI SDK v6 API migration: CoreMessage, promptTokens/completionTokens, experimental_output, textDelta, reasoning type, useSearchGrounding model option for Google search grounding"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 638 tests pass across 29 test files. Production build succeeds. Store has checkpoints{} + workspace{} separation, freeze() action creates immutable snapshots, manualQueries field present, all state persists via localforage."
completed_at: 2026-04-03T15:15:52.656Z
blocker_discovered: false
---

# T01: Verify checkpoint types, persist schemas, freeze action, and fix pre-existing AI SDK v6 compatibility issues

> Verify checkpoint types, persist schemas, freeze action, and fix pre-existing AI SDK v6 compatibility issues

## What Happened
---
id: T01
parent: S01
milestone: M003
key_files:
  - src/engine/research/types.ts
  - src/stores/research-store-persist.ts
  - src/stores/research-store.ts
  - src/stores/index.ts
  - src/engine/provider/streaming.ts
  - src/engine/research/orchestrator.ts
  - src/engine/search/providers/model-native.ts
key_decisions:
  - AI SDK v6 API migration: CoreMessage, promptTokens/completionTokens, experimental_output, textDelta, reasoning type, useSearchGrounding model option for Google search grounding
duration: ""
verification_result: passed
completed_at: 2026-04-03T15:15:52.657Z
blocker_discovered: false
---

# T01: Verify checkpoint types, persist schemas, freeze action, and fix pre-existing AI SDK v6 compatibility issues

**Verify checkpoint types, persist schemas, freeze action, and fix pre-existing AI SDK v6 compatibility issues**

## What Happened

The task plan's four target files (types.ts, research-store-persist.ts, research-store.ts, index.ts) already contained all the planned implementations: checkpoint types (CheckpointPhase, ResearchCheckpoints, checkpointsSchema), extracted persistence schemas in a separate file, freeze() action in the store, manualQueries field, and correct barrel exports. The store is 483 content lines (under 500 limit).

However, the build was failing due to multiple pre-existing AI SDK v6 incompatibilities that prevented verification. Fixed all of them:
1. `ModelMessage` → `CoreMessage` in streaming.ts and orchestrator.ts
2. `usage.inputTokens/outputTokens` → `usage.promptTokens/completionTokens` in streaming.ts
3. `generateText({ output: ... })` → `generateText({ experimental_output: ... })` in streaming.ts
4. `result.output` → `result.experimental_output` in streaming.ts
5. Stream chunk `part.text` → `part.textDelta` in orchestrator.ts
6. `"reasoning-delta"` → `"reasoning"` in orchestrator.ts
7. Google search grounding changed from `google.tools.googleSearch({})` tool to `useSearchGrounding: true` model option, with sources extracted from `providerMetadata.google.groundingChunks`
8. Removed unused `sourceSchema`/`imageSourceSchema` imports from persist file
9. Fixed persist data type cast from `z.infer<>` to `as never`
10. Updated all affected tests (orchestrator, streaming, model-native) for the new API shapes

## Verification

All 638 tests pass across 29 test files. Production build succeeds. Store has checkpoints{} + workspace{} separation, freeze() action creates immutable snapshots, manualQueries field present, all state persists via localforage.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run` | 0 | ✅ pass | 2389ms |
| 2 | `pnpm build` | 0 | ✅ pass | 13111ms |


## Deviations

Significant deviation: The planned task was to create/modify the four target files. All four already existed with correct implementations. The bulk of the work was fixing pre-existing AI SDK v6 breaking changes across streaming.ts, orchestrator.ts, model-native.ts, and their tests that were blocking the verification commands.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/types.ts`
- `src/stores/research-store-persist.ts`
- `src/stores/research-store.ts`
- `src/stores/index.ts`
- `src/engine/provider/streaming.ts`
- `src/engine/research/orchestrator.ts`
- `src/engine/search/providers/model-native.ts`


## Deviations
Significant deviation: The planned task was to create/modify the four target files. All four already existed with correct implementations. The bulk of the work was fixing pre-existing AI SDK v6 breaking changes across streaming.ts, orchestrator.ts, model-native.ts, and their tests that were blocking the verification commands.

## Known Issues
None.
