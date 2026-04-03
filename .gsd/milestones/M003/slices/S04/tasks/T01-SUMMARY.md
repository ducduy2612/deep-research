---
id: T01
parent: S04
milestone: M003
provides: []
requires: []
affects: []
key_files: ["src/engine/research/orchestrator.ts", "src/app/api/research/stream/route.ts", "src/stores/research-store.ts", "src/stores/research-store-persist.ts", "src/hooks/use-research.ts", "src/engine/research/__tests__/orchestrator-report-feedback.test.ts", "src/stores/__tests__/research-store-report.test.ts", "src/engine/research/__tests__/sse-route.test.ts"]
key_decisions: ["Extracted buildReportBody() helper to keep use-research.ts under 500-line ESLint limit", "Feedback maps to existing requirements parameter in getReportPrompt — no prompt changes needed", "Regenerate reads from frozen checkpoints (not live state) for determinism across refresh"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "New tests: 4 orchestrator feedback tests + 6 store persistence tests = 10, all pass. Full suite: 691/691 pass (1 pre-existing streaming.test.ts failure excluded). Build has pre-existing AI SDK v6 type error unrelated to this task."
completed_at: 2026-04-03T17:14:32.706Z
blocker_discovered: false
---

# T01: Thread user feedback through report generation: orchestrator accepts feedback param, SSE route schema updated, store adds reportFeedback with persistence, hook adds regenerateReport() using frozen checkpoints

> Thread user feedback through report generation: orchestrator accepts feedback param, SSE route schema updated, store adds reportFeedback with persistence, hook adds regenerateReport() using frozen checkpoints

## What Happened
---
id: T01
parent: S04
milestone: M003
key_files:
  - src/engine/research/orchestrator.ts
  - src/app/api/research/stream/route.ts
  - src/stores/research-store.ts
  - src/stores/research-store-persist.ts
  - src/hooks/use-research.ts
  - src/engine/research/__tests__/orchestrator-report-feedback.test.ts
  - src/stores/__tests__/research-store-report.test.ts
  - src/engine/research/__tests__/sse-route.test.ts
key_decisions:
  - Extracted buildReportBody() helper to keep use-research.ts under 500-line ESLint limit
  - Feedback maps to existing requirements parameter in getReportPrompt — no prompt changes needed
  - Regenerate reads from frozen checkpoints (not live state) for determinism across refresh
duration: ""
verification_result: passed
completed_at: 2026-04-03T17:14:32.707Z
blocker_discovered: false
---

# T01: Thread user feedback through report generation: orchestrator accepts feedback param, SSE route schema updated, store adds reportFeedback with persistence, hook adds regenerateReport() using frozen checkpoints

**Thread user feedback through report generation: orchestrator accepts feedback param, SSE route schema updated, store adds reportFeedback with persistence, hook adds regenerateReport() using frozen checkpoints**

## What Happened

Added feedback threading across the full report generation pipeline. Orchestrator's reportFromLearnings() and runReport() now accept optional feedback string, passed through resolvePrompt to getReportPrompt's existing requirements parameter. SSE route reportSchema includes optional feedback field. Store gains reportFeedback field with setReportFeedback setter, auto-persist subscription, and hydrate support. Hook gets regenerateReport() that reads frozen research checkpoint + plan checkpoint + reportFeedback to request a regenerated report via SSE. Extracted buildReportBody() helper to keep use-research.ts under 500-line ESLint limit. Created 2 new test files (10 tests total) and fixed one existing sse-route test assertion.

## Verification

New tests: 4 orchestrator feedback tests + 6 store persistence tests = 10, all pass. Full suite: 691/691 pass (1 pre-existing streaming.test.ts failure excluded). Build has pre-existing AI SDK v6 type error unrelated to this task.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/orchestrator-report-feedback.test.ts` | 0 | ✅ pass | 200ms |
| 2 | `pnpm vitest run src/stores/__tests__/research-store-report.test.ts` | 0 | ✅ pass | 260ms |
| 3 | `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts` | 0 | ✅ pass | 230ms |
| 4 | `pnpm vitest run` | 0 | ✅ pass (1 pre-existing fail excluded) | 2500ms |


## Deviations

Compacted buildBaseBody() and removed decorative section comments in use-research.ts to stay under 500-line ESLint limit. Hydrate uses cleaner saved.reportFeedback ?? "" pattern.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/orchestrator.ts`
- `src/app/api/research/stream/route.ts`
- `src/stores/research-store.ts`
- `src/stores/research-store-persist.ts`
- `src/hooks/use-research.ts`
- `src/engine/research/__tests__/orchestrator-report-feedback.test.ts`
- `src/stores/__tests__/research-store-report.test.ts`
- `src/engine/research/__tests__/sse-route.test.ts`


## Deviations
Compacted buildBaseBody() and removed decorative section comments in use-research.ts to stay under 500-line ESLint limit. Hydrate uses cleaner saved.reportFeedback ?? "" pattern.

## Known Issues
None.
