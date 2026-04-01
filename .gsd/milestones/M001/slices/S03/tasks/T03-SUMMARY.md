---
id: T03
parent: S03
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/research/orchestrator.ts", "src/engine/research/index.ts", "src/engine/research/__tests__/orchestrator.test.ts"]
key_decisions: ["Used vi.mock to mock provider registry and streaming modules at the module level since MockLanguageModelV1 cannot be injected through the real createRegistry flow", "Used mutable mockContainer object referenced by hoisted vi.mock factories to avoid vitest hoisting initialization errors", "Dropped local images variable from search phase since search results flow through analyze step return value into allImages accumulator"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 145 tests pass across 7 test files (19 orchestrator + 45 prompts + 18 types + 63 provider). Production build succeeds. No React/Zustand/Next.js imports in orchestrator. No circular imports in barrel export."
completed_at: 2026-03-31T18:29:43.700Z
blocker_discovered: false
---

# T03: Built ResearchOrchestrator state machine driving full research pipeline with typed events, abort support, and 19-test suite

> Built ResearchOrchestrator state machine driving full research pipeline with typed events, abort support, and 19-test suite

## What Happened
---
id: T03
parent: S03
milestone: M001
key_files:
  - src/engine/research/orchestrator.ts
  - src/engine/research/index.ts
  - src/engine/research/__tests__/orchestrator.test.ts
key_decisions:
  - Used vi.mock to mock provider registry and streaming modules at the module level since MockLanguageModelV1 cannot be injected through the real createRegistry flow
  - Used mutable mockContainer object referenced by hoisted vi.mock factories to avoid vitest hoisting initialization errors
  - Dropped local images variable from search phase since search results flow through analyze step return value into allImages accumulator
duration: ""
verification_result: passed
completed_at: 2026-03-31T18:29:43.704Z
blocker_discovered: false
---

# T03: Built ResearchOrchestrator state machine driving full research pipeline with typed events, abort support, and 19-test suite

**Built ResearchOrchestrator state machine driving full research pipeline with typed events, abort support, and 19-test suite**

## What Happened

Created the ResearchOrchestrator class in src/engine/research/orchestrator.ts — a framework-agnostic state machine that drives the complete research pipeline: clarify → plan → search (SERP query generation via generateStructured + SearchProvider calls) → analyze (streaming) → review loop (capped by autoReviewRounds) → report (streaming). The orchestrator manages 10 states (idle, clarifying, planning, searching, analyzing, reviewing, reporting, completed, failed, aborted), emits typed lifecycle events (step-start, step-delta, step-reasoning, step-complete, step-error, progress) with typed payloads via ResearchEventMap, supports AbortController-based cancellation at any step, and assembles a ResearchResult with title, report, learnings, sources, and images. Model resolution uses stepModelMap with fallbacks (thinking for clarify/plan/review/report, networking for search/analyze). Created barrel export in src/engine/research/index.ts re-exporting all types, schemas, provider, prompts, and orchestrator. Created comprehensive test suite with 19 tests using module-level vi.mock for registry/streaming/factory modules — the mockContainer pattern was needed because the orchestrator creates a real provider registry which requires real API keys. Tests cover: initial state, full state transitions, event emission, abort handling, multiple abort calls, error handling, SERP query generation, review loop execution/capping/skipping, model resolution, unsubscribe, destroy, result assembly, NoOpSearchProvider, title extraction, and empty SERP queries.

## Verification

All 145 tests pass across 7 test files (19 orchestrator + 45 prompts + 18 types + 63 provider). Production build succeeds. No React/Zustand/Next.js imports in orchestrator. No circular imports in barrel export.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/` | 0 | ✅ pass | 210ms |
| 2 | `pnpm vitest run (full suite)` | 0 | ✅ pass | 250ms |
| 3 | `pnpm build` | 0 | ✅ pass | 4800ms |


## Deviations

Used module-level vi.mock for registry/streaming/factory instead of MockLanguageModelV1 injection — the orchestrator creates a real provider registry via createRegistry which requires real API keys, so MockLanguageModelV1 cannot be injected through the constructor. The mockContainer pattern with hoisted factories was necessary to avoid vitest hoisting initialization errors.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/orchestrator.ts`
- `src/engine/research/index.ts`
- `src/engine/research/__tests__/orchestrator.test.ts`


## Deviations
Used module-level vi.mock for registry/streaming/factory instead of MockLanguageModelV1 injection — the orchestrator creates a real provider registry via createRegistry which requires real API keys, so MockLanguageModelV1 cannot be injected through the constructor. The mockContainer pattern with hoisted factories was necessary to avoid vitest hoisting initialization errors.

## Known Issues
None.
