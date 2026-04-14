# S01 — Engine + API Timeout Overhaul — Research

**Date:** 2026-04-14

## Summary

This slice overhauls the research pipeline to complete all SSE connections within Vercel Hobby's 300s serverless limit. The current engine defaults to 780s time budgets, runs an unbounded review loop inside the research phase, and exposes a `full` pipeline that runs clarify→plan→research→report in a single SSE connection — all incompatible with 300s constraints. The route also sets `maxDuration = 800`, which only works on Vercel Pro.

The fix involves four coordinated changes: (1) cap `runSearchPhase` at 2 search-analyze cycles per invocation via a new `maxCyclesPerInvocation` config (default: 2), (2) remove the `start()` full-pipeline method and all associated route/hook/types code, (3) extract review into a standalone `reviewOnly()` orchestrator method behind a new `phase: "review"` route, and (4) change `timeBudgetMs` default to 180s and `maxDuration` to 300.

The auto-reconnect mechanism (`pendingRemainingQueries` effect in `use-research.ts`) already works correctly for batching — the orchestrator returns `remainingQueries` and the hook fires a new SSE connection. The review extraction requires a new SSE event handler for `review-result` and a new auto-review trigger effect.

## Recommendation

**Top-down approach:** Change orchestrator internals first (cycle cap, timeBudgetMs, review extraction), then update the route (remove full, add review, maxDuration=300), then update the hook (remove start(), update requestMoreResearch, add auto-review trigger), then update store events (review-result handler). This order ensures each layer's changes are testable in isolation.

The changes are moderately complex but follow existing patterns closely. The `reviewOnly()` method mirrors `researchFromPlan()` structure. The route's `handleReviewPhase` mirrors `handleResearchPhase`. The auto-review trigger mirrors the existing `pendingRemainingQueries` effect.

## Implementation Landscape

### Key Files

- **`src/engine/research/types.ts`** (193 lines) — `ResearchConfig` needs `maxCyclesPerInvocation?: number` field and `timeBudgetMs` default change from 780s to 180s. `researchConfigSchema` needs the new field. `ResearchPhaseResult` already has `remainingQueries` — no change needed. `Phase` type for SSE request schema (currently no explicit type, uses union).
- **`src/engine/research/orchestrator.ts`** (currently ~990 lines, has eslint-disable max-lines) — Three changes: (a) `runSearchPhase` needs cycle cap using `maxCyclesPerInvocation` (currently loops over all `queries` with only time-budget gating), (b) new `reviewOnly()` public method that generates follow-up queries from plan + learnings + optional suggestion, executes 1 search+analyze cycle, returns accumulated data, (c) `researchFromPlan()` must stop calling `runReviewLoop()`. Also change `timeBudgetMs` default from 780_000 to 180_000. The `start()` method needs removal (but see note about 500-line test file below).
- **`src/engine/research/prompts.ts`** — `getReviewPrompt()` already accepts optional `suggestion` parameter. The `resolvePrompt("review", ...)` call in `runReviewLoop` already passes plan + learnings. For `reviewOnly()`, we can reuse `getReviewPrompt` as-is. No changes needed.
- **`src/app/api/research/stream/route.ts`** (currently ~480 lines, has eslint-disable max-lines) — (a) Change `maxDuration` from 800 to 300. (b) Remove `fullSchema`, `handleFullPhase()`, and the `"full"` case from the Phase type and switch. (c) Add `reviewSchema` with fields: `phase: "review"`, `plan`, `learnings`, `sources`, `images`, optional `suggestion`. (d) Add `handleReviewPhase()` that creates orchestrator with `reviewOnly()` call. (e) Update `requestSchema` union to include `reviewSchema`, remove `fullSchema`. (f) Default case in switch should route to clarify or return error — not full.
- **`src/hooks/use-research.ts`** (~440 lines) — (a) Remove `start()` method entirely. (b) Update `requestMoreResearch()` to send `phase: "review"` with learnings/sources/images from store result. (c) Add auto-review trigger effect: when research-result `done` fires AND `autoReviewRounds > 0`, automatically fire a review SSE connection. Track `autoReviewRoundsRemaining` in store. (d) Remove `start` from `UseResearchReturn` interface.
- **`src/stores/research-store-events.ts`** (~290 lines) — (a) Add `review-result` SSE event handler that merges learnings/sources/images like `research-result` does. (b) Add `autoReviewRoundsRemaining` field to store state (for tracking auto-review progress). (c) Update `done` handler to handle `reviewing` → `awaiting_results_review` transition.
- **`src/stores/research-store.ts`** (~340 lines) — Add `autoReviewRoundsRemaining` to `ResearchStoreState` and `INITIAL_STATE`.
- **`src/stores/research-store-persist.ts`** — Add `autoReviewRoundsRemaining` to `persistedStateSchema`.
- **`src/app/page.tsx`** — Already uses `clarify` as entry point (via `HubView onStart={clarify}`). No change needed — `start` is not destructured.
- **`src/components/research/TopicInput.tsx`** — Uses `onStart` prop bound to `clarify`. No change needed.

### Build Order

1. **Orchestrator internals first** — Add `maxCyclesPerInvocation` to types + config, change `timeBudgetMs` default, add cycle cap to `runSearchPhase`, add `reviewOnly()` method, remove `runReviewLoop()` call from `researchFromPlan()`. This is the riskiest change and unblocks everything downstream.
2. **Route changes** — Remove full pipeline, add review phase, change `maxDuration=300`. Can be tested with SSE tests.
3. **Store events** — Add `review-result` handler, `autoReviewRoundsRemaining` tracking.
4. **Hook changes** — Remove `start()`, update `requestMoreResearch()` to send review phase, add auto-review trigger effect.
5. **Orchestrator `start()` removal** — Remove the method itself. Update orchestrator tests that call `start()`.
6. **Test updates** — Fix broken tests across all files, add new tests for review phase, cycle cap.

### Verification Approach

- `pnpm test` — all existing 479+ tests pass (or are intentionally updated)
- `pnpm build` — clean build with no type errors
- `pnpm lint` — no new lint errors
- Unit tests: cycle cap enforcement (mock 4 queries, verify only 2 run), `reviewOnly()` produces queries from learnings, route review phase works, `requestMoreResearch()` sends `phase: "review"`, auto-review triggers after research completion
- Grep verification: no references to `start()` in UI code, no `fullSchema` or `handleFullPhase` in route, `maxDuration = 300` in route

## Constraints

- **500-line ESLint max-lines rule** — `orchestrator.ts` already has `eslint-disable max-lines`. The route also has it. Removing the `start()` method and `runReviewLoop()` call from `researchFromPlan()` may help, but adding `reviewOnly()` adds lines. The planner should consider extracting helpers if files approach limits.
- **SSE event backward compatibility** — The `research-result` event shape must remain unchanged. The new `review-result` event is additive. Existing merge logic in `research-store-events.ts` for `research-result` already accumulates across connections — `review-result` should follow the same pattern.
- **`pendingRemainingQueries` auto-reconnect** — This effect must continue working. The cycle cap returns `remainingQueries` through the same `ResearchPhaseResult` path. No change to the effect needed — just verify it still fires.
- **`autoReviewRounds` from settings** — Currently stored in settings store (default: 0, max: 5). The auto-review trigger reads this from settings at the time of research completion. No settings store changes needed.

## Common Pitfalls

- **Cycle cap vs time budget** — Both `maxCyclesPerInvocation` and `timeBudgetMs` limit the research phase. The cycle cap is the primary limiter (2 cycles ≈ 160s). The time budget (180s) is a safety net. Both must be checked in `runSearchPhase`. Currently only `timeBudgetMs` is checked. Adding the cycle cap before the time budget check avoids running a 3rd cycle that would exceed time budget.
- **reviewOnly() creates its own AbortController** — Following the pattern of all other phase methods. Each creates its own controller.
- **Auto-review race condition** — The milestone context warns about this. When research-result `done` fires, auto-review must read the LATEST store state (merged learnings). The `pendingRemainingQueries` effect already clears before reconnecting. Auto-review trigger should similarly clear any pending state before connecting.
- **requestMoreResearch currently sends phase: "research"** — Changing to `phase: "review"` is a behavior change. The review phase handler must accept `learnings`, `sources`, `images` (unlike research phase which only takes `plan` + optional `queries`). This is the biggest behavioral shift.
- **Removing start() breaks orchestrator tests** — The orchestrator test file has extensive `start()` tests (~15 test cases). These need to either be removed or converted to phase-chaining tests. The existing "phase chaining" describe block already tests clarify→plan→research→report in sequence.

## Open Risks

- **Auto-review loop in hook** — Each auto-review round opens a new SSE connection. If the round-trip takes ~70s each and the user has `autoReviewRounds: 5`, that's 350s of auto-review after research completes. The UX shows progress, but the user must wait. The `autoReviewRounds` setting max is 5 (in settings store), which is excessive under the new model. Consider whether to lower the max or document the expectation.
- **Review prompt quality** — `getReviewPrompt()` generates follow-up queries from plan + learnings. If the prompt doesn't produce useful gap-filling queries, review rounds are wasted cycles. This is a known risk from the milestone context.
- **Existing test bulk** — 479+ tests across the research subsystem. Removing `start()` and changing route schemas will break tests in `orchestrator.test.ts`, `sse-route.test.ts`, `use-research.test.ts`, and `use-research-multi-phase.test.ts`. The planner should allocate a dedicated task for test updates.

## Sources

- Codebase analysis of `src/engine/research/orchestrator.ts`, `types.ts`, `prompts.ts`
- Codebase analysis of `src/app/api/research/stream/route.ts`
- Codebase analysis of `src/hooks/use-research.ts`
- Codebase analysis of `src/stores/research-store-events.ts`, `research-store.ts`, `research-store-persist.ts`
- Test analysis of `orchestrator.test.ts`, `sse-route.test.ts`, `use-research.test.ts`, `use-research-multi-phase.test.ts`
