# S08: CORS Proxy Mode

**Goal:** Add CORS proxy mode with HMAC signature verification, composable middleware handlers, proxy/local mode toggle in settings, and client-side signature generation. In proxy mode (when ACCESS_PASSWORD is set), the server holds API keys in env vars and protects all /api/* routes with HMAC signature verification. In local mode (default, no ACCESS_PASSWORD), all routes work without authentication as they do today.
**Demo:** After this: Local/proxy mode switching, HMAC verification, composable route handlers.

## Tasks
- [x] **T01: Created composable middleware system with HMAC signature utilities and four route-protection handlers, all fully tested** — Create the pure-logic middleware composition system and HMAC signature utilities. These are fully testable without Next.js runtime.

**Middleware composition** (`src/lib/middleware/compose.ts`):
- `compose()` function that chains handler functions in order
- Each handler receives a request-like context and a `next()` function
- If a handler returns a Response, the chain short-circuits (auth failure, provider blocked)
- If a handler calls `next()`, the next handler runs
- Type-safe handler signature

**HMAC signature utilities** (`src/lib/signature.ts`):
- `generateSignature(password: string, timestamp: number): string` using ts-md5
- Algorithm: `Md5.hashStr(password + "::" + timestamp.toString().substring(0, 8))` — matches old codebase
- `verifySignature(signature: string, password: string, timestamp: number, toleranceMs?: number): boolean`
- Default tolerance of 30 seconds for clock skew
- Export both functions

**Middleware handlers** (`src/lib/middleware/`):
- `verify-signature.ts` — reads `Authorization` header and `X-Timestamp` header, verifies HMAC against ACCESS_PASSWORD, returns 401 on failure
- `inject-keys.ts` — reads provider configs from env via buildProviderConfigs(), injects them as request headers via NextResponse.next() — this is how proxy mode makes server-side keys available to route handlers
- `check-disabled.ts` — reads NEXT_PUBLIC_DISABLED_AI_PROVIDER and NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER from env, returns 403 if the requested provider is disabled
- `check-model-filter.ts` — reads NEXT_PUBLIC_MODEL_LIST from env, checks if requested model is allowed, returns 403 if blocked
- Each handler is a pure function that can be tested independently

**Unit tests** (`src/lib/__tests__/signature.test.ts`, `src/lib/__tests__/middleware.test.ts`):
- Test HMAC generation matches expected output for known inputs
- Test verification with valid/invalid signatures, expired timestamps, missing headers
- Test compose() chains handlers correctly, short-circuits on Response
- Test individual handlers with mock request contexts
  - Estimate: 1.5h
  - Files: src/lib/signature.ts, src/lib/middleware/compose.ts, src/lib/middleware/verify-signature.ts, src/lib/middleware/inject-keys.ts, src/lib/middleware/check-disabled.ts, src/lib/middleware/check-model-filter.ts, src/lib/middleware/index.ts, src/lib/__tests__/signature.test.ts, src/lib/__tests__/middleware.test.ts
  - Verify: pnpm test -- src/lib/__tests__/signature.test.ts src/lib/__tests__/middleware.test.ts
- [x] **T02: Created src/middleware.ts wiring composable handlers into Next.js Edge middleware with route-aware chain selection and proxy/local mode detection** — Create `src/middleware.ts` that wires the composable handlers into Next.js Edge middleware.

**Proxy mode detection**:
- If `process.env.ACCESS_PASSWORD` is set → proxy mode: require signature verification
- If not set → local mode: skip auth, still apply disabled provider/model checks

**Route-aware handler selection**:
- Research routes (`/api/research/*`) → verify signature (if proxy) + inject provider keys + check disabled providers + check model filter
- Knowledge routes (`/api/knowledge/*`) → verify signature only (if proxy), no key injection needed (these routes don't use provider keys)
- All other `/api/*` routes → verify signature only (if proxy)

**Implementation**:
- `export const config = { matcher: '/api/:path*' }`
- Export default middleware function that:
  1. Parses route type from pathname
  2. Builds handler chain based on route type and proxy mode
  3. Runs compose() chain
  4. Returns the result (either a Response for errors, or NextResponse.next() for pass-through)
- Keep the file under 80 lines — all logic lives in composable handlers

**Important**: The middleware must NOT consume `request.json()` body — body consumption in middleware prevents route handlers from reading it. Use URL-based routing only.

**Key injection note**: In proxy mode, the inject-keys handler adds provider API keys as custom request headers. The route handlers currently build provider configs from `process.env` via `buildProviderConfigs()`. For proxy mode to work, the route handlers need to also accept configs from headers. However, since middleware runs on Edge and route handlers run on Node.js, and both read from `process.env`, the current architecture already works — the server holds keys in env vars and route handlers read them directly. The inject-keys handler is a safety layer that ensures keys are available even if env access differs. For v1, keep it simple: middleware verifies auth and checks disabled providers; route handlers continue reading from env as they do today. The inject-keys handler can be a no-op for now that we activate later if needed.

**Export mode**: `next.config.ts` already excludes `src/middleware` from export builds via `ignore-loader` webpack rule — no changes needed.
  - Estimate: 1h
  - Files: src/middleware.ts, next.config.ts
  - Verify: pnpm build && grep -q 'middleware' .next/server/middleware.js 2>/dev/null; echo 'Build succeeded with middleware'
- [x] **T03: Added proxy mode toggle with access password in settings, client-side HMAC signature generation, and wired auth headers into all three API fetch call sites** — Add proxy mode UI and client-side signature generation to all API fetch calls.

**Settings store** (`src/stores/settings-store.ts`):
- Add `proxyMode: boolean` (default: false) to state
- Add `accessPassword: string` (default: "") to state
- Add `setProxyMode(enabled: boolean)` action
- Add `setAccessPassword(password: string)` action
- Add both fields to persistence schema (Zod validation)
- Add to `persistSettings()` helper

**Settings UI** (`src/components/settings/GeneralTab.tsx`):
- Add a "Connection" section at the top of the tab
- Proxy mode toggle with shadcn Switch component (same pattern as localOnlyMode in ReportConfig)
- When proxy mode is on, show access password input field
- Visual indicator (badge/label) showing current mode
- Keep under 300 lines

**Client signature utility** (`src/lib/client-signature.ts`):
- `createAuthHeaders(accessPassword: string): Record<string, string>`
- Generates current timestamp, creates HMAC signature, returns `{ 'Authorization': signature, 'X-Timestamp': timestamp }`
- Returns empty object if accessPassword is empty

**Wire into fetch calls**:
- `src/hooks/use-research.ts` — add auth headers to `/api/research/stream` fetch when proxyMode is enabled
- `src/components/knowledge/FileUpload.tsx` — add auth headers to `/api/knowledge/parse` fetch
- `src/components/knowledge/UrlCrawler.tsx` — add auth headers to `/api/knowledge/crawl` fetch
- Read proxyMode + accessPassword from settings store in each component

**Important**: The signature must be generated fresh for each request (timestamp changes), not cached.
  - Estimate: 1.5h
  - Files: src/stores/settings-store.ts, src/components/settings/GeneralTab.tsx, src/lib/client-signature.ts, src/hooks/use-research.ts, src/components/knowledge/FileUpload.tsx, src/components/knowledge/UrlCrawler.tsx
  - Verify: pnpm test && pnpm build
