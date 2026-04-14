---
id: M004
title: "Eliminate Vercel Timeout Dependency"
status: complete
completed_at: 2026-04-14T18:38:09.596Z
key_decisions:
  - D024: Same 2-cycle, 180s budget across all deployment targets — no env-based branching
  - D025: Clean removal of full pipeline (no deprecation shim) — no external API consumers
  - D026: Visible auto-review state with round progress and abort — users maintain control
  - D027: Cycle cap as primary batching control (deterministic), timeBudgetMs as safety net
  - D028: Review as standalone SSE phase with distinct schema, event type, and orchestrator method
  - D029: Auto-review trigger via useEffect watching store state + persisted counter
key_files:
  - src/engine/research/types.ts
  - src/engine/research/orchestrator.ts
  - src/app/api/research/stream/route.ts
  - src/stores/research-store-events.ts
  - src/stores/research-store.ts
  - src/stores/research-store-persist.ts
  - src/hooks/use-research.ts
  - src/components/research/ResearchActions.tsx
  - src/components/research/TopicInput.tsx
  - src/app/page.tsx
  - messages/en.json
  - messages/vi.json
lessons_learned:
  - Cycle cap over time budget as primary batching control: deterministic cycle count (2) is more reliable than variable time budget for SSE connection length management
  - Separate SSE phases (research vs review) with distinct schemas and event types: avoids conditional logic in handlers and provides clean API boundaries
  - Auto-review trigger via reactive useEffect watching store state + persisted counter: simpler and more debuggable than SSE event interception, survives page refreshes
  - Test file extraction under ESLint 500-line limit: create feature-named companion files (e.g., use-research-auto-review.test.ts) instead of cramming more tests into the main file
  - fireEvent over @testing-library/user-event: project doesn't install user-event, use fireEvent from @testing-library/react
  - Dead code cleanup as dedicated slice: systematic grep sweeps for StartOptions, start(), phase=full after removal catches orphaned references that individual slices miss
---

# M004: Eliminate Vercel Timeout Dependency

**Replaced single long-running SSE connections with cycle-capped batching (2 cycles ≈ 160s per connection), added standalone reviewOnly() orchestrator phase with review SSE route, removed the full pipeline entirely, and wired auto-review with visible round progress and abort capability — all 824 tests pass, zero dead code.**

## What Happened

## Overview

M004 eliminated the Vercel Hobby 300s serverless function timeout as a constraint on the research pipeline. Every SSE connection now completes well within the limit through a triple constraint: cycle cap (2 cycles/connection), time budget (180s default), and maxDuration (300s hard limit in route.ts). The full pipeline (phase=full) that ran clarify→plan→research→report in a single SSE connection was completely removed. Auto-review and manual "More Research" were unified into a standalone review phase that sends accumulated learnings to avoid duplication.

## What Happened

### S01: Engine + API timeout overhaul
The core architectural change. Added `maxCyclesPerInvocation=2` to ResearchConfig as the primary batching control — deterministic, unlike time budget alone. The `runSearchPhase` method stops after 2 search-analyze cycles and returns `remainingQueries` for client reconnect. Added `reviewOnly()` orchestrator method for follow-up research cycles that takes plan + learnings + sources + images + optional suggestion. Removed `start()`, `runPlan()`, and `runReviewLoop()` from the orchestrator — all entry points now use individual phase methods. Changed SSE route maxDuration from 800 to 300, removed fullSchema/handleFullPhase, added reviewSchema/handleReviewPhase. Added review-result event handler in store, autoReviewRoundsRemaining to persisted state, and auto-review trigger useEffect in useResearch hook. 10 new orchestrator tests + 18 new route tests + 8 new hook tests. Total: 796 tests pass.

### S02: Hook + store review integration
Made auto-review visibly stateful. Added `autoReviewCurrentRound` and `autoReviewTotalRounds` to persisted store state with Zod validation. ResearchActions renders "Auto-review round N/M..." banner with Loader2 spinner and abort button during auto-review — all other action buttons hidden. Abort handler threaded from page.tsx through ActiveResearch → ActiveResearchCenter → ResearchActions. 4 i18n keys added to en.json and vi.json. 27 new tests across 3 files. Total: 823 tests pass.

### S03: UI cleanup + start() removal
Removed all dead code residuals. Deleted unreachable `d.phase === "full"` condition in research-store-events.ts. Renamed `StartOptions` to `ClarifyOptions` across use-research.ts, TopicInput.tsx, and page.tsx. Updated stale comments and test names referencing start(). Pure cleanup — no behavior changes. 823 tests pass.

### S04: Tests + verification
Final quality gate. Verified full test suite (823→824 tests after adding explicit unknown phase rejection test for Zod discriminated union). Ran three grep sweeps confirming zero residual references to StartOptions, start(), fullSchema, handleFullPhase, or phase==="full" in production code. Production build clean. All 6 requirements (R063–R068) validated with specific evidence.

## Key Architectural Outcomes

1. **Cycle cap as primary batching control**: `maxCyclesPerInvocation=2` is deterministic — 2 × ~80s = ~160s per connection, well within 300s limit. Time budget (180s) is a safety net.
2. **Review as standalone SSE phase**: Separate schema, separate event type (review-result), separate orchestrator method (reviewOnly()). Both auto-review and manual "More Research" use the same path.
3. **Full pipeline completely excised**: No phase=full, no start(), no runPlan(), no runReviewLoop(), no StartOptions. Zero references in production code.
4. **Auto-review reactively triggered**: useEffect watches store state for awaiting_results_review + remaining rounds, persisted counter survives refreshes.
5. **Visible auto-review**: Round N/M progress banner with spinner and abort button — users always know what the system is doing.

## Success Criteria Results

### S01: Orchestrator respects 2-cycle cap, reviewOnly() method works, route has review phase and no full phase, maxDuration=300, timeBudgetMs=180s
✅ **Met** — maxCyclesPerInvocation=2 enforced in runSearchPhase (orchestrator.ts:536), 3 dedicated tests. reviewOnly() at line 261 with 7 tests. Review phase in route (reviewSchema + handleReviewPhase). maxDuration=300 at route.ts:19. timeBudgetMs=180_000 at orchestrator.ts:533. Full pipeline removed: grep confirms zero references to fullSchema/handleFullPhase.

### S02: requestMoreResearch sends phase:review with learnings, auto-review triggers visibly after research completes with round progress
✅ **Met** — requestMoreResearch sends phase:'review' with structured learnings/sources/images/suggestion. Auto-review trigger fires when state=awaiting_results_review AND autoReviewRoundsRemaining > 0. "Auto-review round N/M..." banner with spinner and abort button in ResearchActions. 12 ResearchActions tests + 3 hook tests verify.

### S03: No start() anywhere in the codebase, all entry points use clarify(), dead code removed
✅ **Met** — grep confirms zero references to start() in orchestrator.ts, use-research.ts, TopicInput.tsx, page.tsx. StartOptions renamed to ClarifyOptions across all files. Dead phase==="full" condition removed. All 823 tests pass.

### S04: All existing tests pass + new tests for cycle cap, reviewOnly, review route, auto-review trigger, requestMoreResearch review
✅ **Met** — 824 tests pass across 43 files. New tests: 3 cycle cap, 7 reviewOnly, 18 review route, 12 store auto-review, 12 ResearchActions, 3 auto-review hook, 1 unknown phase rejection.

## Definition of Done Results

✅ **All 4 slices complete** — S01 (4/4 tasks), S02 (3/3 tasks), S03 (1/1 task), S04 (2/2 tasks). All slice summaries exist on disk.

✅ **Cross-slice integration verified** — S01's reviewOnly() consumed by S02's auto-review trigger and requestMoreResearch. S02's store fields consumed by ResearchActions UI. S03 verified S01/S02 left no dead code. S04 verified all slices together.

✅ **Test suite passes** — 824/824 tests across 43 files (2.33s).

✅ **Production build clean** — Zero type errors, all routes render.

✅ **Zero dead code** — grep confirms no StartOptions, start(), fullSchema, handleFullPhase, or phase==="full" in production code.

✅ **All requirements validated** — R063–R068 all status=validated with specific evidence.

## Requirement Outcomes

| Requirement | Status Transition | Evidence |
|------------|-------------------|----------|
| R063 | active → validated | Cycle cap (maxCyclesPerInvocation=2) enforced in runSearchPhase, timeBudgetMs=180s default. 3 dedicated cycle cap tests + grep confirmation. |
| R064 | active → validated | fullSchema/handleFullPhase/Phase 'full' removed from route.ts, start()/runPlan()/runReviewLoop() removed from orchestrator.ts. grep confirms zero references. |
| R065 | active → validated | Auto-review and manual "More Research" both use phase:review SSE endpoint with learnings. Verified by store auto-review trigger tests and route integration tests. |
| R066 | active → validated | ResearchActions shows "Auto-review round N/M..." banner with spinner. Abort button resets store and calls SSE abort. 12 ResearchActions tests verify. |
| R067 | active → validated | Review phase sends accumulated learnings, sources, and images via reviewOnly(). Both auto-review and manual review use same path. Verified by 824 passing tests. |
| R068 | active → validated | maxDuration=300 in route.ts, timeBudgetMs=180s default, cycle cap 2×~80s≈160s per connection. Triple constraint verified. |

## Deviations

None — all slices delivered exactly as planned.

## Follow-ups

None — M004 is self-contained with no deferred work.
