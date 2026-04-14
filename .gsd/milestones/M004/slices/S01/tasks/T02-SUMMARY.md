---
id: T02
parent: S01
milestone: M004
key_files:
  - src/app/api/research/stream/route.ts
  - src/engine/research/__tests__/sse-route.test.ts
key_decisions:
  - Review phase emits 'review-result' SSE event type (not 'result') to distinguish from report phase
  - Default switch case returns explicit error instead of falling through — no implicit phase fallback
duration: 
verification_result: passed
completed_at: 2026-04-14T17:23:38.124Z
blocker_discovered: false
---

# T02: Remove full pipeline SSE route, add review phase handler, change maxDuration to 300

**Remove full pipeline SSE route, add review phase handler, change maxDuration to 300**

## What Happened

Updated the SSE route at /api/research/stream to remove the full pipeline (phase=full) and add a review phase. Changes:

1. Changed maxDuration from 800 to 300 to fit Vercel Hobby's 300s serverless limit.
2. Removed fullSchema (which accepted phase="full" or no phase) and handleFullPhase function.
3. Added reviewSchema with fields: phase='review', plan, learnings, sources, images, and optional suggestion.
4. Added handleReviewPhase that creates an orchestrator with search provider, calls orchestrator.reviewOnly() (added in T01), streams events as SSE, and emits a 'review-result' event on success.
5. Updated Phase type from "clarify" | "plan" | "research" | "report" | "full" to "clarify" | "plan" | "research" | "report" | "review".
6. Updated requestSchema union to replace fullSchema with reviewSchema.
7. Changed the switch default case from falling through to handleFullPhase to returning a 400 error with "Unknown phase" message.
8. Updated the file-level docstring to list review instead of full.

Updated the test file to match: replaced the "full pipeline (default)" describe block with a "review phase" describe block (18 tests covering validation, SSE streaming, suggestion passthrough, abort, error handling, config construction, search provider creation). Also added a "general validation" section for JSON parsing. Removed the now-unused validBody helper. Fixed a pre-existing test in the research phase section that expected researchFromPlan to be called with only the plan string (route also passes queries as second arg). Added reviewOnly to the mock orchestrator instance and resetMocks.

All 50 tests pass, ESLint clean on both files.

## Verification

Ran pnpm vitest run src/engine/research/__tests__/sse-route.test.ts — all 50 tests pass (65ms). ESLint clean on both modified files (route.ts and test file). Verified: maxDuration=300, no fullSchema/handleFullPhase present, reviewSchema/handleReviewPhase added, Phase type has "review" not "full", default switch case returns error.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts` | 0 | ✅ pass | 224ms |
| 2 | `npx eslint src/app/api/research/stream/route.ts src/engine/research/__tests__/sse-route.test.ts` | 0 | ✅ pass | 2500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/research/stream/route.ts`
- `src/engine/research/__tests__/sse-route.test.ts`
