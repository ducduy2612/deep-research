---
id: S03
parent: M001
milestone: M001
provides:
  - ResearchOrchestrator class — complete state machine for multi-step research workflow
  - ResearchState enum and ResearchConfig Zod schema — typed configuration
  - ResearchEventMap — typed lifecycle events for UI binding
  - SearchProvider interface — contract for S04 search implementations
  - Prompt template functions with override resolution — supports SET-03
  - Barrel export from src/engine/research/index.ts
requires:
  - slice: S02
    provides: Provider registry, streamWithAbort, createRegistry, model resolution types
affects:
  - S04
key_files:
  - src/engine/research/types.ts
  - src/engine/research/search-provider.ts
  - src/engine/research/prompts.ts
  - src/engine/research/orchestrator.ts
  - src/engine/research/index.ts
  - src/engine/research/__tests__/types.test.ts
  - src/engine/research/__tests__/prompts.test.ts
  - src/engine/research/__tests__/orchestrator.test.ts
key_decisions:
  - 10-state ResearchState enum (idle, clarifying, planning, searching, analyzing, reviewing, reporting, completed, failed, aborted) with strict transition enforcement
  - Pure prompt functions with typed parameters instead of template string constants — enables testing and override resolution
  - SearchProvider interface with NoOpSearchProvider stub — decouples S03 from S04 search implementation
  - Per-step model resolution via stepModelMap with thinking/networking fallbacks
  - generateStructured for SERP query generation instead of raw JSON parsing
  - mockContainer pattern for vi.mock testing of code that creates internal registries
patterns_established:
  - Framework-agnostic state machine pattern — orchestrator has zero React/Next.js dependencies, making it testable in isolation
  - Typed event emitter with discriminated union (ResearchEventMap) — consumers subscribe to specific event types with full type safety
  - SearchProvider interface for dependency inversion — search execution is injected, not hardcoded
  - Prompt pure functions with DEFAULT_PROMPTS map + resolvePrompt() override resolver — supports SET-03 prompt customization
  - Barrel export pattern (index.ts) with re-exports of all types, schemas, interfaces, and orchestrator
observability_surfaces:
  - Structured logging at each state transition (from/to states logged)
  - Step completion logs with duration, query, and result counts
  - Error logging with step context and error codes
  - Research completion summary log with title, learnings count, sources count, images count
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T18:40:05.170Z
blocker_discovered: false
---

# S03: Research Engine Core

**Built the ResearchOrchestrator state machine driving the full research pipeline (clarify → plan → search → analyze → [review loop] → report) with typed lifecycle events, AbortController cancellation, per-step model resolution, prompt overrides, and 82 passing tests.**

## What Happened

S03 delivered the core research engine as a framework-agnostic state machine in `src/engine/research/`. The work was split across three tasks:

**T01 (Type Foundation):** Created `types.ts` with ResearchState enum (10 states: idle, clarifying, planning, searching, analyzing, reviewing, reporting, completed, failed, aborted), Zod schemas for Source, ImageSource, SearchTask, and ResearchConfig, plus the ResearchEventMap discriminated union. Created `search-provider.ts` with the SearchProvider interface and NoOpSearchProvider stub for S03 development. 18 tests.

**T02 (Prompt Templates):** Ported prompt templates from the old codebase into 9 pure functions in `prompts.ts` — each takes explicit typed parameters with no global state. Includes DEFAULT_PROMPTS map and resolvePrompt() for override resolution (supports SET-03). 45 tests. Zero external dependencies beyond type-only imports.

**T03 (Orchestrator):** Built the ResearchOrchestrator class in `orchestrator.ts` (706 lines) — a state machine driving the full pipeline: clarify → plan → search (SERP query generation via generateStructured + SearchProvider calls) → analyze (streaming) → optional review loop (capped by autoReviewRounds config) → report (streaming). Emits typed lifecycle events (step-start, step-delta, step-reasoning, step-complete, step-error, progress) via ResearchEventMap. Supports AbortController-based cancellation at any step. Per-step model resolution uses stepModelMap with fallbacks (thinking for clarify/plan/review/report, networking for search/analyze). Assembles ResearchResult with title (extracted from first markdown heading), report, learnings, sources, and images. Created barrel export in index.ts. 19 comprehensive tests using module-level vi.mock with mockContainer pattern.

**Key decisions:** Used z.record(z.string().superRefine(...)) for PromptOverrides (z.record(z.enum()) requires all keys). Used vi.mock with mutable mockContainer for testing (orchestrator creates real registry internally). Dropped local images variable — search results flow through analyze step return value.

**Total: 82 tests across 3 test files, 2,499 lines of code (source + tests). Production build passes.**

## Verification

All 82 tests pass across 3 test files (18 types + 45 prompts + 19 orchestrator). Full project test suite passes. Production build succeeds with no errors. No React/Zustand/Next.js imports in orchestrator — it's framework-agnostic. No circular imports in barrel export.

## Requirements Advanced

- AI-05 — Orchestrator uses generateStructured (AI SDK structured output) for SERP query generation — the search phase generates typed queries via generateObject with Zod schema
- AI-06 — Orchestrator creates AbortController per run and passes signal to all streamText/generateObject calls — abort transitions state machine to 'aborted'
- RES-05 — AbortController-based cancellation at any step — abort() transitions to 'aborted' state, all streaming calls receive the abort signal
- SET-03 — resolvePrompt() merges user overrides onto DEFAULT_PROMPTS — all 9 prompt templates support per-key override

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None beyond task-level deviations (PromptOverrides schema, vi.mock pattern) already documented in task summaries.

## Known Limitations

Search execution uses NoOpSearchProvider — real search providers deferred to S04. The orchestrator has not been integration-tested with real AI models (all tests use mocks).

## Follow-ups

S04 (Search Provider Integration) will implement real SearchProvider implementations and wire them into the orchestrator. S05 (Core Research UI) will create React hooks wrapping the orchestrator and the streaming UI.

## Files Created/Modified

- `src/engine/research/types.ts` — Research state enum, config schemas, event map, source/search types — 196 lines
- `src/engine/research/search-provider.ts` — SearchProvider interface and NoOpSearchProvider stub — 26 lines
- `src/engine/research/prompts.ts` — 9 pure prompt template functions with DEFAULT_PROMPTS and resolvePrompt() — 369 lines
- `src/engine/research/orchestrator.ts` — ResearchOrchestrator state machine with full pipeline, events, abort, model resolution — 706 lines
- `src/engine/research/index.ts` — Barrel export re-exporting all types, schemas, provider, prompts, orchestrator — 52 lines
- `src/engine/research/__tests__/types.test.ts` — 18 tests for schemas, types, NoOpSearchProvider — 226 lines
- `src/engine/research/__tests__/prompts.test.ts` — 45 tests for all prompt functions and resolvePrompt — 314 lines
- `src/engine/research/__tests__/orchestrator.test.ts` — 19 tests for orchestrator state machine, events, abort, review loop — 610 lines
