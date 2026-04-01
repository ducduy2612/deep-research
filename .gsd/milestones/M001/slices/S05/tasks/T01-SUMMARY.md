---
id: T01
parent: S05
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/app/api/research/stream/route.ts", "src/engine/research/__tests__/sse-route.test.ts", "src/lib/api-config.ts"]
key_decisions: ["Extracted default model lists and env config builders into src/lib/api-config.ts to keep route under 300-line lint limit", "Used FilteringSearchProvider decorator pattern to apply domain filters and citation-image filtering post-search, keeping orchestrator decoupled", "Search config is optional in request body with fallback to auto-detection from env vars", "SSE error events used for all error responses including validation failures, not just runtime errors"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts` — all 22 tests pass. Ran `pnpm build` — compiles and type-checks successfully. The /api/research/stream endpoint appears in the build output as a dynamic route."
completed_at: 2026-03-31T19:40:29.253Z
blocker_discovered: false
---

# T01: Create SSE API route for research streaming at /api/research/stream

> Create SSE API route for research streaming at /api/research/stream

## What Happened
---
id: T01
parent: S05
milestone: M001
key_files:
  - src/app/api/research/stream/route.ts
  - src/engine/research/__tests__/sse-route.test.ts
  - src/lib/api-config.ts
key_decisions:
  - Extracted default model lists and env config builders into src/lib/api-config.ts to keep route under 300-line lint limit
  - Used FilteringSearchProvider decorator pattern to apply domain filters and citation-image filtering post-search, keeping orchestrator decoupled
  - Search config is optional in request body with fallback to auto-detection from env vars
  - SSE error events used for all error responses including validation failures, not just runtime errors
duration: ""
verification_result: passed
completed_at: 2026-03-31T19:40:29.254Z
blocker_discovered: false
---

# T01: Create SSE API route for research streaming at /api/research/stream

**Create SSE API route for research streaming at /api/research/stream**

## What Happened

Built the POST /api/research/stream SSE route that accepts research configuration (topic, language, report style, search config, domain filters, citation images), builds provider configs from environment variables, creates a search provider with domain/citation-image filtering via a FilteringSearchProvider decorator, instantiates ResearchOrchestrator, subscribes to all 6 event types (step-start, step-delta, step-reasoning, step-complete, step-error, progress), and streams them as SSE to the client. The route handles client abort via request.signal, cleans up subscriptions and destroys the orchestrator in a finally block. Extracted shared API config helpers into src/lib/api-config.ts to avoid route file exceeding 300-line lint limit. All validation errors return SSE error events for consistent client-side parsing. Test suite covers 22 cases: validation (5), streaming (4), config (2), search provider (3), abort (1), errors (5), env config (1), null result (1).

## Verification

Ran `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts` — all 22 tests pass. Ran `pnpm build` — compiles and type-checks successfully. The /api/research/stream endpoint appears in the build output as a dynamic route.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/sse-route.test.ts` | 0 | ✅ pass | 180ms |
| 2 | `pnpm build` | 0 | ✅ pass | 12000ms |


## Deviations

Extracted src/lib/api-config.ts to hold default model lists and env-based builder functions — not in the original plan, but needed to stay under the 300-line ESLint max-lines rule. The existing src/app/api/research/route.ts still has its own copy of these defaults; that duplication can be cleaned up later. Zod schema for search field uses .optional() with code-level defaults instead of .default({}) due to TypeScript strict mode inference issues with nested Zod defaults.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/research/stream/route.ts`
- `src/engine/research/__tests__/sse-route.test.ts`
- `src/lib/api-config.ts`


## Deviations
Extracted src/lib/api-config.ts to hold default model lists and env-based builder functions — not in the original plan, but needed to stay under the 300-line ESLint max-lines rule. The existing src/app/api/research/route.ts still has its own copy of these defaults; that duplication can be cleaned up later. Zod schema for search field uses .optional() with code-level defaults instead of .default({}) due to TypeScript strict mode inference issues with nested Zod defaults.

## Known Issues
None.
