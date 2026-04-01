---
id: S08
parent: M001
milestone: M001
provides:
  - Composable middleware system with compose() and runMiddleware()
  - HMAC signature generation and verification (server + client)
  - Proxy/local mode toggle in settings with persistence
  - Auth header injection into all API fetch call sites
  - Provider disabling and model filtering via env vars
requires:
  - slice: S07
    provides: Settings store infrastructure, GeneralTab component, useSettingsStore pattern
  - slice: S05
    provides: use-research hook with connectSSE pattern
  - slice: S01
    provides: Zod validation patterns, storage abstraction, shadcn/ui components
affects:
  - S09
key_files:
  - src/lib/signature.ts
  - src/lib/client-signature.ts
  - src/lib/middleware/compose.ts
  - src/lib/middleware/verify-signature.ts
  - src/lib/middleware/inject-keys.ts
  - src/lib/middleware/check-disabled.ts
  - src/lib/middleware/check-model-filter.ts
  - src/lib/middleware/index.ts
  - src/middleware.ts
  - src/stores/settings-store.ts
  - src/components/settings/GeneralTab.tsx
  - src/hooks/use-research.ts
  - src/components/knowledge/FileUpload.tsx
  - src/components/knowledge/UrlCrawler.tsx
  - src/lib/__tests__/signature.test.ts
  - src/lib/__tests__/middleware.test.ts
  - src/lib/__tests__/client-signature.test.ts
key_decisions:
  - Factory-pattern handlers (createXxxHandler) with DI for testability + default exports for process.env
  - inject-keys handler intentionally deferred to no-op — route handlers already read from process.env directly
  - compose() chains handlers right-to-left with terminal NextResponse.next() callback
  - store.getState() used inside async callbacks in FileUpload/UrlCrawler since React hooks can't be called in async context
  - Mode badge uses styled span instead of shadcn Badge component
patterns_established:
  - Composable middleware with factory pattern + DI for testable route handlers
  - Client-side HMAC signature generation with per-request freshness
  - Settings-driven proxy mode with conditional auth header injection pattern: `...(proxyMode ? createAuthHeaders(accessPassword) : {})`
  - Route classification by pathname prefix for middleware chain selection
observability_surfaces:
  - Middleware returns structured HTTP errors: 401 for auth failures, 403 for disabled providers/models
  - Proxy vs local mode determined by ACCESS_PASSWORD env var presence
drill_down_paths:
  - milestones/M001/slices/S08/tasks/T01-SUMMARY.md
  - milestones/M001/slices/S08/tasks/T02-SUMMARY.md
  - milestones/M001/slices/S08/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T22:07:44.865Z
blocker_discovered: false
---

# S08: CORS Proxy Mode

**Composable middleware architecture with HMAC signature verification, proxy/local mode toggle in settings, client-side signature generation, and auth headers wired into all API fetch call sites.**

## What Happened

S08 delivered the CORS proxy mode system across three tasks:

**T01 — Composable middleware system + HMAC signatures**: Built the pure-logic middleware layer with `compose()` function for chaining handlers, `generateSignature()`/`verifySignature()` utilities matching the v0 MD5 algorithm (ts-md5, timestamp truncated to 8 digits, 30s clock skew tolerance), and four route-protection handlers: `verify-signature` (HMAC auth), `inject-keys` (provider API key injection), `check-disabled` (disabled provider detection), and `check-model-filter` (model allowlist). Each handler uses a factory pattern with dependency injection for testability plus a default export reading from process.env. 52 comprehensive unit tests covering all edge cases.

**T02 — Next.js Edge middleware wiring**: Created `src/middleware.ts` (63 lines) that classifies incoming `/api/*` requests into three route types (research, knowledge, other), builds a handler chain based on route type and proxy mode (detected by `ACCESS_PASSWORD` env var), and runs the composed chain. Research routes get signature verification + disabled provider checks + model filter. Knowledge and other routes get signature verification only. The inject-keys handler was intentionally deferred to a no-op since route handlers already read from `process.env` directly.

**T03 — Client-side proxy mode UI + signature generation**: Extended the settings store with `proxyMode` and `accessPassword` fields with Zod validation and persistence. Added a Connection section to GeneralTab with proxy mode Switch toggle and conditional access password input. Created `src/lib/client-signature.ts` with `createAuthHeaders()` that generates fresh HMAC signatures per request. Wired auth headers into all three API fetch call sites: `use-research.ts` (via React hooks), `FileUpload.tsx` and `UrlCrawler.tsx` (via `store.getState()` inside async callbacks). 12 additional unit tests for client signature generation.

All 498 tests pass (64 new), production build succeeds with middleware compiled at 61.5 kB, zero regressions.

## Verification

- pnpm test: 498 tests pass across 24 test files (64 new tests for signature, middleware, and client-signature)
- pnpm build: Production build succeeds, middleware compiled at 61.5 kB, all new modules included
- All three task verification commands passed independently during execution
- Middleware correctly classifies routes and builds handler chains
- Settings store persists proxyMode and accessPassword via localforage
- Auth headers generated fresh per-request with current timestamp

## Requirements Advanced

- SEC-01 — Proxy/local mode toggle implemented in settings store + GeneralTab UI, client-side signature generation wired into all API fetch sites
- SEC-02 — HMAC signature verification with 30s tolerance implemented in verify-signature handler, matching client-side createAuthHeaders algorithm
- SEC-03 — check-disabled and check-model-filter handlers read from env vars, return 403 for blocked providers/models
- SEC-04 — compose() function chains handlers, each independently testable, replacing monolithic if-else chain
- SET-01 — Connection section added to GeneralTab with proxy mode toggle and access password input
- SET-04 — proxyMode and accessPassword fields persisted via localforage with Zod schema validation

## Requirements Validated

- SEC-01 — Settings store has proxyMode/accessPassword with persistence, GeneralTab has Connection section with Switch and password input, all 3 API fetch sites conditionally inject auth headers
- SEC-02 — 52 unit tests for HMAC generation/verification, server verify-signature handler enforces auth in proxy mode, client createAuthHeaders generates matching signatures
- SEC-03 — check-disabled handler reads NEXT_PUBLIC_DISABLED_AI_PROVIDER and NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER, check-model-filter reads NEXT_PUBLIC_MODEL_LIST, both return 403 on violations
- SEC-04 — compose() chains handlers with short-circuit support, 4 independent handler modules with factory pattern, middleware.ts builds route-aware chains

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None — all three tasks implemented exactly as planned.

## Known Limitations

- inject-keys handler is a pass-through (no-op) for v1; route handlers read from process.env directly. Can be activated later if env access patterns change.
- The middleware runs on Edge runtime, so it cannot access Node.js-specific APIs. Current handlers only read env vars and headers, which are Edge-compatible.

## Follow-ups

None — slice goal fully achieved.

## Files Created/Modified

- `src/lib/signature.ts` — HMAC signature generation and verification utilities (server-side)
- `src/lib/client-signature.ts` — Client-side HMAC signature generation for proxy mode auth headers
- `src/lib/middleware/compose.ts` — compose() and runMiddleware() for chaining middleware handlers
- `src/lib/middleware/verify-signature.ts` — HMAC signature verification handler with factory pattern
- `src/lib/middleware/inject-keys.ts` — Provider API key injection handler (deferred no-op for v1)
- `src/lib/middleware/check-disabled.ts` — Disabled provider detection handler
- `src/lib/middleware/check-model-filter.ts` — Model allowlist filter handler
- `src/lib/middleware/index.ts` — Re-exports all middleware composition types and handlers
- `src/middleware.ts` — Next.js Edge middleware entry point with route-aware handler selection
- `src/stores/settings-store.ts` — Added proxyMode and accessPassword fields with persistence
- `src/components/settings/GeneralTab.tsx` — Added Connection section with proxy mode toggle and password input
- `src/hooks/use-research.ts` — Wired auth headers into research stream fetch when proxy mode enabled
- `src/components/knowledge/FileUpload.tsx` — Wired auth headers into knowledge parse fetch when proxy mode enabled
- `src/components/knowledge/UrlCrawler.tsx` — Wired auth headers into knowledge crawl fetch when proxy mode enabled
- `src/lib/__tests__/signature.test.ts` — 52 unit tests for HMAC signature generation and verification
- `src/lib/__tests__/middleware.test.ts` — Unit tests for compose(), individual handlers, and full chain integration
- `src/lib/__tests__/client-signature.test.ts` — 12 unit tests for client-side signature generation
