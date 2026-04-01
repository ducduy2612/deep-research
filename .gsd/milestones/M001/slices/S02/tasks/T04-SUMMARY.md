---
id: T04
parent: S02
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/provider/streaming.ts", "src/app/api/research/route.ts", "src/engine/provider/__tests__/streaming.test.ts", "src/engine/provider/index.ts", "src/engine/provider/__tests__/registry.test.ts"]
key_decisions: ["AI SDK v4 has no separate onAbort callback; aborts surface through onError as DOMException with name 'AbortError', so streamWithAbort detects this in onError and routes to onAbort instead", "API route builds provider configs from env at request time (not import time) so missing keys return 500 instead of crashing startup", "generateStructured wraps generateObject errors as AI_STREAM_ABORTED (abort) or AI_INVALID_RESPONSE (all others) for clean error categorization"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran `pnpm vitest run src/engine/provider/__tests__/streaming.test.ts` — 13 tests pass. Ran `pnpm vitest run src/engine/provider/__tests__/` — all 63 tests across 4 files pass. Ran `pnpm build` — compiles and builds successfully with the API route detected as dynamic (`ƒ /api/research`)."
completed_at: 2026-03-31T17:33:35.978Z
blocker_discovered: false
---

# T04: Created streaming utilities (streamWithAbort, generateStructured) with AbortController lifecycle and POST /api/research route proving full provider stack end-to-end

> Created streaming utilities (streamWithAbort, generateStructured) with AbortController lifecycle and POST /api/research route proving full provider stack end-to-end

## What Happened
---
id: T04
parent: S02
milestone: M001
key_files:
  - src/engine/provider/streaming.ts
  - src/app/api/research/route.ts
  - src/engine/provider/__tests__/streaming.test.ts
  - src/engine/provider/index.ts
  - src/engine/provider/__tests__/registry.test.ts
key_decisions:
  - AI SDK v4 has no separate onAbort callback; aborts surface through onError as DOMException with name 'AbortError', so streamWithAbort detects this in onError and routes to onAbort instead
  - API route builds provider configs from env at request time (not import time) so missing keys return 500 instead of crashing startup
  - generateStructured wraps generateObject errors as AI_STREAM_ABORTED (abort) or AI_INVALID_RESPONSE (all others) for clean error categorization
duration: ""
verification_result: passed
completed_at: 2026-03-31T17:33:35.979Z
blocker_discovered: false
---

# T04: Created streaming utilities (streamWithAbort, generateStructured) with AbortController lifecycle and POST /api/research route proving full provider stack end-to-end

**Created streaming utilities (streamWithAbort, generateStructured) with AbortController lifecycle and POST /api/research route proving full provider stack end-to-end**

## What Happened

Created `src/engine/provider/streaming.ts` with two core functions: `streamWithAbort` wraps AI SDK `streamText` with abort/error/finish lifecycle callbacks (AI SDK v4 surfaces aborts through onError as DOMException with name 'AbortError'), and `generateStructured` wraps `generateObject` with typed Zod schema output and error recovery (AbortError → AI_STREAM_ABORTED, other → AI_INVALID_RESPONSE). Created `src/app/api/research/route.ts` — a Next.js App Router POST handler that validates request body with Zod, builds provider configs from env vars, creates registry, resolves model, and streams response via `streamText` with `abortSignal: request.signal`. Updated barrel exports. Fixed pre-existing lint issues in registry.test.ts. All 13 streaming tests and 63 total provider tests pass. Build passes with zero errors.

## Verification

Ran `pnpm vitest run src/engine/provider/__tests__/streaming.test.ts` — 13 tests pass. Ran `pnpm vitest run src/engine/provider/__tests__/` — all 63 tests across 4 files pass. Ran `pnpm build` — compiles and builds successfully with the API route detected as dynamic (`ƒ /api/research`).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/provider/__tests__/streaming.test.ts` | 0 | ✅ pass | 266ms |
| 2 | `pnpm vitest run src/engine/provider/__tests__/` | 0 | ✅ pass | 161ms |
| 3 | `pnpm build` | 0 | ✅ pass | 5000ms |


## Deviations

Removed unused imports streamText/generateObject from test file (mocks are the actual spies). Fixed pre-existing lint issues in registry.test.ts (unused ProviderRegistry import, unused opts parameter). Used expect.unreachable() to reduce test file size below 300-line limit.

## Known Issues

None.

## Files Created/Modified

- `src/engine/provider/streaming.ts`
- `src/app/api/research/route.ts`
- `src/engine/provider/__tests__/streaming.test.ts`
- `src/engine/provider/index.ts`
- `src/engine/provider/__tests__/registry.test.ts`


## Deviations
Removed unused imports streamText/generateObject from test file (mocks are the actual spies). Fixed pre-existing lint issues in registry.test.ts (unused ProviderRegistry import, unused opts parameter). Used expect.unreachable() to reduce test file size below 300-line limit.

## Known Issues
None.
