---
id: T01
parent: S01
milestone: M004
key_files:
  - src/engine/research/types.ts
  - src/engine/research/orchestrator.ts
  - src/engine/research/__tests__/orchestrator.test.ts
key_decisions:
  - Default maxCyclesPerInvocation=2 to stay within Vercel Hobby 300s limit with ~80s per cycle estimate
  - reviewOnly() executes all follow-up queries in a single invocation (no sub-cycle cap) since it's already scoped to 1 review round
  - Added isAborted() check after generateStructured in reviewOnly() to prevent post-abort state transitions
duration: 
verification_result: passed
completed_at: 2026-04-14T17:18:20.373Z
blocker_discovered: false
---

# T01: Add cycle cap config, change timeBudgetMs to 180s, add reviewOnly() method to orchestrator

**Add cycle cap config, change timeBudgetMs to 180s, add reviewOnly() method to orchestrator**

## What Happened

Updated ResearchConfig with `maxCyclesPerInvocation` field (default 2) and changed `timeBudgetMs` default from 780s to 180s to stay within Vercel Hobby's 300s limit. Added cycle cap enforcement in `runSearchPhase` that stops after maxCycles search-analyze iterations, returning remaining queries. Added `reviewOnly()` public method that generates follow-up queries from plan + learnings + optional suggestion, executes 1 search+analyze cycle per query, and returns accumulated data. Removed `runReviewLoop()` call from `researchFromPlan()` — review is now a separate phase handled by `reviewOnly()`. Added abort check after `generateStructured` in `reviewOnly()` to prevent post-abort state transitions.

Added 10 new test cases: 3 for cycle cap enforcement (cap hit returns remaining, default cap is 2, under-cap executes all), 7 for reviewOnly (happy path with queries, no queries needed, suggestion passthrough, state transition, failure, abort). Updated 1 existing test in researchFromPlan describe block that expected review loop to run (now expects it not to).

## Verification

Ran `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` — all 48 tests pass (197ms). Lint clean on all 3 modified files. Cycle cap tests verify: 4 queries with cap=2 stops after 2 and returns 2 remaining; default cap=2 with 5 queries stops after 2; cap=5 with 2 queries executes all. ReviewOnly tests verify: generates follow-up queries and executes search+analyze, returns existing data when no follow-up needed, passes suggestion to prompt, transitions to awaiting_results_review, returns null on failure/abort. researchFromPlan test verifies review loop is NOT called.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` | 0 | ✅ pass | 355ms |
| 2 | `npx eslint src/engine/research/types.ts src/engine/research/orchestrator.ts src/engine/research/__tests__/orchestrator.test.ts` | 0 | ✅ pass | 2500ms |

## Deviations

Minor: test assertion for "executes all queries when under the cycle cap" uses `remainingQueries ?? []` instead of direct access since `researchFromPlan` conditionally omits the field when empty. This matches existing patterns in the codebase.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/types.ts`
- `src/engine/research/orchestrator.ts`
- `src/engine/research/__tests__/orchestrator.test.ts`
