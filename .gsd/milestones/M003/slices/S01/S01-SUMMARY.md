---
id: S01
parent: M003
milestone: M003
provides:
  - freeze(phase) action for creating immutable phase checkpoints
  - checkpoints object with typed clarify/plan/research/report checkpoint shapes
  - manualQueries field + setManualQueries setter for research workspace (S03)
  - Persist schema including checkpoints and manualQueries with backward-compatible defaults
  - 31 tests covering all freeze semantics, persist round-trip, and backward compatibility
requires:
  []
affects:
  - S02
  - S03
  - S04
key_files:
  - src/engine/research/types.ts
  - src/stores/research-store-persist.ts
  - src/stores/research-store.ts
  - src/stores/index.ts
  - src/stores/__tests__/research-store-freeze.test.ts
  - src/engine/provider/streaming.ts
  - src/engine/research/orchestrator.ts
  - src/engine/search/providers/model-native.ts
key_decisions:
  - AI SDK v6 API migration: CoreMessage, promptTokens/completionTokens, experimental_output, textDelta, reasoning type, useSearchGrounding model option
  - Persist schema extracted to research-store-persist.ts to keep main store under 500-line ESLint limit
  - Activity log searches for freeze events use 'Checkpoint frozen:' prefix for specificity
patterns_established:
  - Immutable checkpoint pattern: freeze(phase) copies workspace fields to typed checkpoint object with frozenAt timestamp. Checkpoint is never mutated after freeze.
  - Persist schema extraction: Zod schemas for storage extracted to separate persist.ts file to control main store file size.
  - Backward-compatible hydration: new fields (checkpoints, manualQueries) use optional().default() in persist schema so old saved state hydrates correctly.
observability_surfaces:
  - Activity log entries: 'Checkpoint frozen: {phase}' logged on each freeze() call
drill_down_paths:
  - milestones/M003/slices/S01/tasks/T01-SUMMARY.md
  - milestones/M003/slices/S01/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T15:26:32.420Z
blocker_discovered: false
---

# S01: Store Refactor — Checkpoints + Workspace Separation

**Restructured the research store with immutable checkpoints{} and mutable workspace{} separation, added freeze() action for all 4 phases, added manualQueries field, and fixed pre-existing AI SDK v6 incompatibilities. All 669 tests pass.**

## What Happened

## What Happened

This slice restructured the research store to establish the checkpointed workspace model that all subsequent M003 slices depend on.

### T01: Store implementation + AI SDK v6 fixes
The four target files (types.ts, research-store-persist.ts, research-store.ts, index.ts) already contained the planned checkpoint implementations from prior work. However, the build was broken due to pre-existing AI SDK v6 incompatibilities across 3 engine files (streaming.ts, orchestrator.ts, model-native.ts). Fixed all 7 breaking API changes:
- `ModelMessage` → `CoreMessage`
- `usage.inputTokens/outputTokens` → `usage.promptTokens/completionTokens`
- `generateText({ output })` → `generateText({ experimental_output })`
- `result.output` → `result.experimental_output`
- Stream chunk `part.text` → `part.textDelta`
- `"reasoning-delta"` → `"reasoning"` stream part type
- Google search grounding: tool-based → `useSearchGrounding: true` model option

All 638 existing tests passed after fixes. Production build succeeded.

### T02: 31 freeze semantics tests
Created comprehensive test file covering:
- freeze() for all 4 phases (7 tests) — correct field shapes, timestamps, null handling
- freeze() idempotency — double-freeze succeeds
- freeze() overwrite — re-freezing after edits updates checkpoint
- Invalid phase — no-op, no mutation
- reset() — clears all checkpoints and workspace fields
- manualQueries — init, setter, replacement, persist, hydrate (5 tests)
- Persist+hydrate round-trip — all 4 checkpoints survive reset+hydrate (5 tests)
- Backward compatibility — old state missing checkpoints/manualQueries defaults correctly (4 tests)
- Checkpoint immutability — frozen data unaffected by subsequent workspace mutations (2 tests)
- Workspace preservation — freeze doesn't clear workspace fields (2 tests)

One test fix: activity log search changed from `includes("clarify")` to `includes("Checkpoint frozen: clarify")` to avoid matching unrelated log entries.

Final count: 669 tests across 30 files, all passing.

### Minor fix
Removed unused `SearchResult` import from test file that was blocking production build.

## Verification

- `pnpm vitest run` — 669 tests pass across 30 files (638 original + 31 new freeze tests)
- `pnpm build` — production build succeeds with no errors
- freeze() action creates immutable snapshots for clarify, plan, research, report phases
- checkpoints and manualQueries persist to localforage and survive reset→hydrate round-trip
- Old state without checkpoints/manualQueries hydrates correctly with defaults
- Frozen checkpoint data is not affected by subsequent workspace mutations
- Store is 577 lines (under 500 content lines with blank/comment skip)

## Requirements Advanced

- R050 — Store has checkpoints{} with typed CheckpointPhase enum, freeze() action creates immutable snapshots, 31 tests validate all semantics
- R051 — manualQueries and checkpoints persist to localforage, survive reset→hydrate round-trip, backward compatibility with old state confirmed by 4 tests

## Requirements Validated

- R050 — CheckpointPhase type, ResearchCheckpoints interface, checkpointsSchema in types.ts. freeze() action in store. 31 tests in research-store-freeze.test.ts covering all freeze semantics.
- R051 — Persist schema in research-store-persist.ts includes checkpoints (optional().default({})) and manualQueries (optional().default([])). 5 persist+hydrate round-trip tests + 4 backward compatibility tests confirm persistence and migration.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T01 deviated significantly: the four target files already contained all planned implementations. The actual work was fixing 7 pre-existing AI SDK v6 breaking changes across streaming.ts, orchestrator.ts, and model-native.ts that were blocking the verification commands. These were pre-existing issues not anticipated in the task plan.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/engine/research/types.ts` — Added CheckpointPhase type, ResearchCheckpoints interface, checkpointsSchema, per-phase checkpoint types (ClarifyCheckpoint, PlanCheckpoint, ResearchCheckpoint, ReportCheckpoint)
- `src/stores/research-store-persist.ts` — Extracted persist schemas including checkpoints and manualQueries with backward-compatible optional defaults
- `src/stores/research-store.ts` — Added checkpoints state, freeze() action, manualQueries state + setter, updated persist subscription and hydrate to handle checkpoints
- `src/stores/__tests__/research-store-freeze.test.ts` — 31 new tests: freeze all phases, idempotency, overwrite, reset, persist round-trip, backward compat, immutability, manualQueries
- `src/engine/provider/streaming.ts` — AI SDK v6 fixes: CoreMessage, promptTokens/completionTokens, experimental_output
- `src/engine/research/orchestrator.ts` — AI SDK v6 fixes: CoreMessage, textDelta, reasoning type
- `src/engine/search/providers/model-native.ts` — AI SDK v6 fixes: Google search grounding via useSearchGrounding model option + providerMetadata extraction
