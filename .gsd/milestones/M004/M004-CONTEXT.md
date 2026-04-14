# M004: Eliminate Vercel Timeout Dependency

**Gathered:** 2026-04-14
**Status:** Ready for planning

## Project Description

Timeout-safety overhaul for the SSE research pipeline. Every SSE connection finishes well within Vercel Hobby's 300s serverless function limit. Research batches at 2 search-analyze cycles per connection (~160s) with auto-reconnect. Auto-review and manual "More Research" merge into a unified `phase: "review"` that sees existing learnings. The `full` pipeline is removed entirely.

## Why This Milestone

The current architecture assumes Vercel Pro's 800s limit. On Hobby (300s hard kill), research SSE connections get killed mid-cycle with no graceful exit and no partial results. This blocks deployment on Hobby tier and any platform with similar constraints. The fix also improves the review UX — "More Research" currently regenerates queries blindly, re-searching already-found material.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Run research on Vercel Hobby without timeout failures
- See research progress in predictable 2-cycle batches with auto-reconnect
- Click "More Research" and get targeted follow-up queries that see existing learnings (no duplication)
- See visible "Auto-review round N/M..." progress when auto-review triggers
- Abort at any point during auto-review

### Entry point / environment

- Entry point: http://localhost:3000 → Start Research
- Environment: Vercel Hobby serverless (primary), local dev, Docker
- Live dependencies involved: AI providers (Google, OpenAI-compatible), search providers (Tavily, Brave, SearXNG, model-native)

## Completion Class

- Contract complete means: orchestrator respects maxCyclesPerInvocation, reviewOnly() method works, route has review phase, route has no full phase
- Integration complete means: full end-to-end research flow on Vercel Hobby completes without timeout — clarify → plan → research (batched) → auto-review (visible) → report
- Operational complete means: deployed to Vercel Hobby, no timeout errors in function logs

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A research session with 6+ queries completes as 3 auto-reconnected batches (2+2+2) with no timeout
- Auto-review with 2 rounds triggers 2 visible SSE connections after research completes
- Manual "More Research" sends existing learnings and gets a targeted (non-duplicating) follow-up query
- The `full` pipeline code is completely absent from the codebase
- All 498+ existing tests still pass + new tests for review phase and cycle cap

## Architectural Decisions

### Same time budget everywhere

**Decision:** Docker and local dev use the same 2-cycle, 180s budget as Vercel Hobby.

**Rationale:** Simpler mental model, same UX on all platforms. Docker users just get more auto-reconnects. No env-based config branching.

**Alternatives Considered:**
- Docker keeps 780s — adds env-based config complexity for no real benefit

### Clean removal of full pipeline

**Decision:** Remove `phase: "full"`, `fullSchema`, `handleFullPhase()`, and `useResearch().start()` entirely.

**Rationale:** No external API consumers depend on it. Deprecation shim would be dead code.

**Alternatives Considered:**
- Deprecate, don't remove — more code to maintain for no benefit

### Auto-review shows visible state

**Decision:** Auto-review shows "Auto-review round N/M..." with a progress indicator. Not silent.

**Rationale:** Users need to know what the system is doing and maintain control. Silent progress feels like the app is stuck.

**Alternatives Considered:**
- Seamless/transparent — simpler but less informative, users may think the app froze

## Error Handling Strategy

- Time budget exhausted → graceful exit with remainingQueries, client auto-reconnects
- Review returns 0 queries → stop early, no error (nothing missing)
- SSE connection error → existing error handling in connectSSE (setConnectionError, store error event)
- Abort during auto-review → same abort path as any SSE connection (AbortController)

## Risks and Unknowns

- **Auto-review trigger timing** — race condition between research-result `done` event and auto-review SSE start. If auto-review reads stale store state, it sends incomplete learnings. Clear pendingRemainingQueries before trigger guards against this.
- **Review prompt quality** — reviewOnly() generates follow-up queries from plan + learnings. If the prompt doesn't produce useful gap-filling queries, review is wasted cycles. Needs prompt iteration if results are poor.
- **Existing test coverage** — 498 existing tests must continue passing. Removing full pipeline and changing research behavior may break tests that rely on the old flow.

## Existing Codebase / Prior Art

- `src/engine/research/orchestrator.ts` — State machine with phase methods. `runSearchPhase()` already has time-budget check. `runReviewLoop()` runs inside research phase. ~990 lines.
- `src/engine/research/types.ts` — ResearchConfig with timeBudgetMs default 780s. ResearchPhaseResult with remainingQueries already exists.
- `src/app/api/research/stream/route.ts` — Phase routing with handleFullPhase, handleResearchPhase, etc. maxDuration=800. ~480 lines.
- `src/hooks/use-research.ts` — connectSSE, start(), requestMoreResearch() (currently sends phase: "research"). Auto-reconnect via pendingRemainingQueries effect already works. ~440 lines.
- `src/stores/research-store-events.ts` — SSE event handler. research-result event already merges learnings across connections.

## Relevant Requirements

- R063 — research phase batched at 2 cycles per SSE connection
- R064 — full pipeline removal
- R065 — unified review phase (auto + manual)
- R066 — auto-review visible state with round progress
- R067 — review phase sees existing learnings
- R068 — SSE connections finish within Vercel Hobby timeout

## Scope

### In Scope

- maxCyclesPerInvocation config (default: 2) in ResearchConfig
- timeBudgetMs default change from 780s to 180s
- maxDuration change from 800 to 300
- Remove full pipeline (route, hook, types)
- Add reviewOnly() method to orchestrator
- Add handleReviewPhase() to route
- Rewrite requestMoreResearch() to send phase: "review" with learnings
- Add auto-review trigger effect in use-research
- Add autoReviewRoundsRemaining to research store
- Update activity log messages
- Update review prompt for optional suggestion parameter
- Remove start() from useResearch hook
- Update all callers of start() to use clarify()
- New tests for all changes

### Out of Scope / Non-Goals

- Docker deployment config changes (Docker is v0 leftover, irrelevant)
- Prompt optimization beyond adding suggestion parameter
- New UI components (existing ones adapt)
- Knowledge base changes
- i18n changes

## Technical Constraints

- ESLint max-lines: 500 lines per file (skipBlankLines, skipComments)
- All SSE event shapes must remain backward-compatible with existing store handler
- existing merge logic in research-result handler must work for review results too
- maxDuration=300 is the Vercel Hobby hard limit

## Integration Points

- Vercel serverless function runtime — the constraint driving all changes
- AI providers (Google, OpenAI-compatible) — reviewOnly() uses generateStructured for follow-up queries
- Search providers — review executes 1 search+analyze cycle per round
- Research store — auto-review state, autoReviewRoundsRemaining tracking
- useResearch hook — SSE connection lifecycle, auto-review trigger

## Testing Requirements

- Unit tests: orchestrator runSearchPhase cycle cap, reviewOnly() method, review prompt with suggestion
- Unit tests: route review phase handler, review request validation, full phase absence
- Unit tests: hook requestMoreResearch sends phase:review, auto-review trigger, start() absence
- All 498+ existing tests must continue passing
- Build must succeed clean

## Acceptance Criteria

- Orchestrator respects maxCyclesPerInvocation (stops after 2 cycles by default)
- Orchestrator timeBudgetMs defaults to 180s
- researchFromPlan() no longer calls runReviewLoop()
- reviewOnly() method generates 1 follow-up query from plan + learnings + optional suggestion
- Route has review phase, no full phase, maxDuration=300
- requestMoreResearch() sends phase: "review" with learnings/sources/images
- Auto-review triggers after research completes when rounds > 0
- Auto-review shows visible state
- start() removed from hook and all callers
- All tests pass, build clean

## Open Questions

- None — all decisions confirmed during discussion
