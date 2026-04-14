# M004: Eliminate Vercel Timeout Dependency

## Vision
Every SSE research connection finishes well within Vercel Hobby's 300s serverless function limit. Research batches at 2 search-analyze cycles per connection (~160s) with auto-reconnect for remaining queries. Auto-review and manual "More Research" merge into a unified review phase that sees existing learnings (no blind duplication). The full pipeline (phase=full) is completely removed.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | high | — | ✅ | Orchestrator respects 2-cycle cap, reviewOnly() method works, route has review phase and no full phase, maxDuration=300, timeBudgetMs=180s |
| S02 | S02 | medium | — | ✅ | requestMoreResearch sends phase:review with learnings, auto-review triggers visibly after research completes with round progress |
| S03 | S03 | low | — | ✅ | No start() anywhere in the codebase, all entry points use clarify(), dead code removed |
| S04 | S04 | low | — | ✅ | All 498+ existing tests pass + new tests for cycle cap, reviewOnly, review route, auto-review trigger, requestMoreResearch review |
