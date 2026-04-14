# S01: Engine + API timeout overhaul

**Goal:** Overhaul the research pipeline to complete all SSE connections within Vercel Hobby's 300s serverless limit. Cap search-analyze cycles at 2 per invocation, extract review into a standalone phase behind a new SSE route, remove the full pipeline (phase=full), and change timeBudgetMs default to 180s with maxDuration=300.
**Demo:** Orchestrator respects 2-cycle cap, reviewOnly() method works, route has review phase and no full phase, maxDuration=300, timeBudgetMs=180s

## Must-Haves

- runSearchPhase stops after 2 search-analyze cycles per invocation and returns remainingQueries
- reviewOnly() orchestrator method works: takes plan + learnings + sources + images + optional suggestion, generates follow-up queries, executes 1 cycle, returns accumulated data
- Route has review phase handler, no full phase handler, maxDuration=300
- researchFromPlan() no longer calls runReviewLoop() internally
- useResearch.start() removed, requestMoreResearch sends phase: "review"
- Auto-review trigger fires after research completion when autoReviewRounds > 0
- All tests pass, clean build, clean lint

## Proof Level

- This slice proves: integration

## Integration Closure

Upstream surfaces consumed: ResearchConfig, ResearchOrchestrator public methods, SSE route schemas, research-store event handler, useResearch hook actions, settings-store autoReviewRounds field.
New wiring introduced: reviewOnly() → handleReviewPhase() → SSE review-result event → store handler → auto-review trigger effect loop.
What remains: S02 (Auto-review UX — visible progress, abort button, round tracking in UI) consumes the autoReviewRoundsRemaining store field and review-result events surfaced by this slice.

## Verification

- Signals added: review-result SSE event type, autoReviewRoundsRemaining store field tracking review round progress, cycle cap hit logged via logger.warn with remaining query count.
- Inspection surfaces: research-store.state.autoReviewRoundsRemaining visible in React DevTools, logger output shows cycle cap exhaustion and review round completion.
- Failure state exposed: If review round fails, step-error event fires with review step, store transitions to failed state, auto-review loop stops.

## Tasks

- [x] **T01: Add cycle cap config, change timeBudgetMs default, add reviewOnly() to orchestrator** `est:2h`
  Update ResearchConfig with maxCyclesPerInvocation field, change timeBudgetMs default from 780s to 180s, add cycle cap to runSearchPhase, add reviewOnly() public method that generates follow-up queries from plan + learnings + optional suggestion and executes 1 search+analyze cycle, remove runReviewLoop() call from researchFromPlan(). Do NOT remove start() yet — that happens in T04.
  - Files: `src/engine/research/types.ts`, `src/engine/research/orchestrator.ts`
  - Verify: pnpm test -- --run src/engine/research/__tests__/orchestrator.test.ts 2>&1 | tail -5

- [x] **T02: Remove full pipeline from SSE route, add review phase, change maxDuration to 300** `est:1.5h`
  In route.ts: change maxDuration from 800 to 300, remove fullSchema/handleFullPhase/Phase 'full' case, add reviewSchema (fields: phase='review', plan, learnings, sources, images, optional suggestion), add handleReviewPhase that calls orchestrator.reviewOnly(), update requestSchema union to include reviewSchema, update Phase type to remove 'full' and add 'review', update default case to return error instead of falling through to full.
  - Files: `src/app/api/research/stream/route.ts`
  - Verify: pnpm test -- --run src/engine/research/__tests__/sse-route.test.ts 2>&1 | tail -5

- [x] **T03: Add review-result store handler, auto-review trigger in hook, remove start()** `est:2h`
  In research-store-events.ts: add review-result handler that merges learnings/sources/images like research-result does. In research-store.ts: add autoReviewRoundsRemaining to state/INITIAL_STATE. In research-store-persist.ts: add autoReviewRoundsRemaining to persistedStateSchema. In use-research.ts: (a) remove start() method and StartOptions type (keep it for clarify parameter), (b) remove start from UseResearchReturn interface, (c) update requestMoreResearch to send phase:'review' with learnings/sources/images/suggestion from store, (d) add auto-review trigger effect: when research-result done fires AND autoReviewRounds > 0 AND autoReviewRoundsRemaining > 0, decrement counter and fire review SSE connection, (e) set autoReviewRoundsRemaining from settings when research phase starts.
  - Files: `src/stores/research-store-events.ts`, `src/stores/research-store.ts`, `src/stores/research-store-persist.ts`, `src/hooks/use-research.ts`
  - Verify: pnpm test -- --run src/hooks/__tests__/use-research.test.ts src/hooks/__tests__/use-research-multi-phase.test.ts 2>&1 | tail -5

- [ ] **T04: Remove orchestrator.start(), update all broken tests, add cycle cap and review tests** `est:2.5h`
  Remove the start() method from orchestrator.ts. Update test files: (1) orchestrator.test.ts — remove/convert ~17 start() test cases (the 'phase chaining' describe block already tests the multi-phase flow), add test for cycle cap enforcement (mock 4 queries, verify only 2 run), add test for reviewOnly() producing queries from learnings and executing 1 cycle, add test for researchFromPlan not calling runReviewLoop; (2) sse-route.test.ts — remove full-pipeline test block (lines ~182+), add review phase test; (3) use-research.test.ts — convert start() tests to clarify() tests, remove start-specific assertions; (4) use-research-multi-phase.test.ts — verify requestMoreResearch sends phase:'review'. After all updates: pnpm test, pnpm build, pnpm lint must all pass.
  - Files: `src/engine/research/orchestrator.ts`, `src/engine/research/__tests__/orchestrator.test.ts`, `src/engine/research/__tests__/sse-route.test.ts`, `src/hooks/__tests__/use-research.test.ts`, `src/hooks/__tests__/use-research-multi-phase.test.ts`
  - Verify: pnpm test --run 2>&1 | tail -10 && pnpm build 2>&1 | tail -5 && pnpm lint 2>&1 | tail -5

## Files Likely Touched

- src/engine/research/types.ts
- src/engine/research/orchestrator.ts
- src/app/api/research/stream/route.ts
- src/stores/research-store-events.ts
- src/stores/research-store.ts
- src/stores/research-store-persist.ts
- src/hooks/use-research.ts
- src/engine/research/__tests__/orchestrator.test.ts
- src/engine/research/__tests__/sse-route.test.ts
- src/hooks/__tests__/use-research.test.ts
- src/hooks/__tests__/use-research-multi-phase.test.ts
