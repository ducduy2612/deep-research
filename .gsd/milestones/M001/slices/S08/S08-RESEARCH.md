# S08 Research: CORS Proxy Mode

**Slice:** S08 — CORS Proxy Mode
**Requirements:** SEC-01 (local/proxy switching), SEC-02 (HMAC verification), SEC-03 (provider disabling/model filtering), SEC-04 (composable route handlers)
**Depth:** Targeted — known technology (Next.js middleware, HMAC), moderately complex integration with existing architecture

## Summary

S08 adds an authentication and API-key-injection layer to the server's API routes. In **proxy mode**, the server holds API keys in environment variables and protects routes with HMAC signature verification derived from an `ACCESS_PASSWORD`. In **local mode** (current behavior), no auth is required and the client either stores keys itself or relies on server env vars. The core deliverables are: (1) a composable middleware system in `src/middleware.ts`, (2) HMAC signature utilities, (3) proxy/local mode toggle in settings with UI, and (4) client-side signature generation in the SSE hook.

## Recommendation

Build 3 tasks:
1. **Composable middleware + HMAC utilities** — pure logic, fully testable without Next.js
2. **Next.js middleware integration** — wire composable handlers into `src/middleware.ts`, add proxy mode detection
3. **Settings UI + client integration** — proxy mode toggle, access password field, signature generation in use-research hook

## Implementation Landscape

### Current Architecture (What Exists)

**API Routes (4 routes, no auth):**
- `src/app/api/research/stream/route.ts` — SSE research streaming, builds provider configs from env via `buildProviderConfigs()` in `src/lib/api-config.ts`
- `src/app/api/research/route.ts` — direct AI streaming, has a DUPLICATE `buildProviderConfigs()` function (cleanup needed)
- `src/app/api/knowledge/parse/route.ts` — file upload/parsing, no API key dependency
- `src/app/api/knowledge/crawl/route.ts` — URL crawling, no API key dependency

**No middleware exists** — `src/middleware.ts` does not exist. The `next.config.ts` export mode has webpack rules to exclude `src/middleware` from static export builds.

**Settings store** (`src/stores/settings-store.ts`):
- Already has `localOnlyMode` and `selectedKnowledgeIds` fields
- Already persists to localforage via Zod schema
- Does NOT have: `proxyMode`, `accessPassword`

**Env config** (`src/lib/env.ts`):
- Already defines `ACCESS_PASSWORD` (optional) — unused but schema-ready
- Already defines `NEXT_PUBLIC_DISABLED_AI_PROVIDER`, `NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER`, `NEXT_PUBLIC_MODEL_LIST`
- Already defines `NEXT_PUBLIC_BUILD_MODE` (export/standalone)

**Client-server flow** (`src/hooks/use-research.ts`):
- Client sends `{ topic, search: { provider, includeDomains, ... }, ... }` to `/api/research/stream`
- Client does NOT send provider API keys — server builds them from env
- No authentication header sent currently

**Old codebase reference** (`_archive/src-v0/middleware.ts`):
- 814-line monolithic middleware with repeated if-else blocks per provider
- Uses `ts-md5` (already installed) for HMAC-like signature: `MD5(accessPassword + "::" + timestamp.substring(0,8))`
- Verifies signature against `ACCESS_PASSWORD`
- Injects real API keys via `NextResponse.next({ request: { headers } })`
- Checks disabled providers and model filtering
- **Key flaw:** old signature uses truncated timestamp only — vulnerable to replay attacks within same 10-second window

### What Needs to Be Built

**1. Composable middleware system** (`src/lib/middleware/`)
- `compose()` function that chains handlers
- Individual handlers: `verifySignature()`, `injectProviderKeys()`, `checkDisabledProviders()`, `checkModelFilter()`
- Each handler is independently testable
- Replace old 814-line monolith with ~150 lines of composable code

**2. HMAC signature utilities** (`src/lib/signature.ts`)
- `generateSignature(password, timestamp)` — uses `ts-md5` (already installed)
- `verifySignature(signature, password, timestamp)` — validates with time-window tolerance
- Match old codebase algorithm for backward compatibility: `MD5(password + "::" + timestamp.substring(0,8))`
- Consider adding nonce support for replay protection

**3. Next.js middleware** (`src/middleware.ts`)
- `export const config = { matcher: "/api/:path*" }`
- Detect proxy mode: if `ACCESS_PASSWORD` is set, require signature verification
- If no `ACCESS_PASSWORD`, skip auth (local mode)
- Apply disabled provider/model checks in both modes
- For knowledge routes (`/api/knowledge/*`), only verify access if ACCESS_PASSWORD set (no API key injection needed)

**4. Settings additions**
- Add `proxyMode: boolean` and `accessPassword: string` to settings store
- Add UI toggle for proxy/local mode in GeneralTab or a new "Connection" section
- Access password field (only shown when proxy mode is on)
- Persist proxy mode + access password in localforage

**5. Client integration** (`src/hooks/use-research.ts`)
- When proxy mode is enabled, generate HMAC signature and add `Authorization: Bearer <signature>` header
- Include `X-Timestamp` header for signature verification
- Also add to knowledge API route calls (`/api/knowledge/parse`, `/api/knowledge/crawl`)

### Natural Seams

**Seam 1 — Pure logic layer** (middleware composition + HMAC):
- `src/lib/middleware/compose.ts` — compose function
- `src/lib/middleware/verify-signature.ts` — signature verification handler
- `src/lib/middleware/inject-keys.ts` — API key injection handler  
- `src/lib/middleware/check-disabled.ts` — provider/model disable handler
- `src/lib/signature.ts` — generate/verify HMAC signatures
- All testable with unit tests, no Next.js dependency

**Seam 2 — Next.js integration** (`src/middleware.ts`):
- Wire composable handlers into Next.js middleware
- Route-aware handler selection (research routes need key injection, knowledge routes need auth only)
- ~50 lines

**Seam 3 — UI + client wiring**:
- Settings store: add `proxyMode`, `accessPassword` fields
- GeneralTab: proxy mode section with toggle + password field
- use-research.ts: add signature headers when proxy mode enabled
- Knowledge components: add signature headers to fetch calls

### Key Files and What They Do

| File | Role | S08 Impact |
|------|------|-----------|
| `src/lib/env.ts` | Zod-validated env vars | Already has ACCESS_PASSWORD, DISABLED_*, MODEL_LIST — use these |
| `src/lib/api-config.ts` | Provider config builder from env | Used by middleware for key injection — no changes needed |
| `src/app/api/research/route.ts` | Direct AI streaming | Has duplicate buildProviderConfigs() — clean up |
| `src/app/api/research/stream/route.ts` | SSE research streaming | Protected by middleware, no code changes |
| `src/app/api/knowledge/parse/route.ts` | File parsing | Protected by middleware (auth only), no code changes |
| `src/app/api/knowledge/crawl/route.ts` | URL crawling | Protected by middleware (auth only), no code changes |
| `src/hooks/use-research.ts` | SSE client hook | Add signature headers when proxy mode |
| `src/stores/settings-store.ts` | Settings state | Add proxyMode, accessPassword |
| `src/components/settings/GeneralTab.tsx` | General settings UI | Add proxy mode section |
| `src/components/knowledge/FileUpload.tsx` | File upload UI | Add signature headers to fetch |
| `src/components/knowledge/UrlCrawler.tsx` | URL crawl UI | Add signature headers to fetch |
| `_archive/src-v0/middleware.ts` | Old middleware reference | 814-line example of what NOT to do |
| `_archive/src-v0/utils/signature.ts` | Old signature utils | Reference for HMAC algorithm |

### Constraints

- **`ts-md5` is already installed** — use it for HMAC signatures, don't add crypto dependencies
- **Middleware runs on Edge runtime** — no Node.js APIs available in middleware. `ts-md5` needs to be Edge-compatible (it is — it's pure JS)
- **Static export mode** must exclude middleware — `next.config.ts` already has webpack rules for this
- **Knowledge routes use `runtime = "nodejs"`** — middleware still runs before them on Edge, which is fine
- **Export mode has no API routes** — proxy mode only applies to standalone builds
- **NEXT_PUBLIC_BUILD_MODE** already exists for detecting export vs standalone
- **Provider disabling** env vars already exist in env.ts schema but need to be enforced
- **`localOnlyMode` already exists** in settings — it's different from proxy mode (localOnly = no web search; proxy = server-side keys)

### Risks

1. **Edge runtime compatibility** — `ts-md5` uses pure JS MD5, should work on Edge. Verify with a test.
2. **Request body consumption in middleware** — the old middleware reads `request.json()` for model checking, which consumes the body. Next.js middleware can't re-read the body in the route handler. The old code works around this, but the composable approach should avoid body consumption where possible. Use URL-based routing instead.
3. **Replay attacks** — old signature uses 10-second windows (timestamp first 8 chars). This is acceptable for v1 but should be documented.
4. **Middleware + export mode interaction** — the webpack `ignore-loader` already handles this for export builds. Verify it works.

### Don't Hand-Roll

- **HMAC** — use `ts-md5` (already installed, matches old codebase algorithm)
- **Middleware composition** — simple function composition pattern, not a library concern
- **No new packages needed** — everything uses existing dependencies

### Sources

- `_archive/src-v0/middleware.ts` — reference for proxy mode behavior (814 lines)
- `_archive/src-v0/utils/signature.ts` — HMAC algorithm (MD5-based)
- `src/lib/env.ts` — env var schema (ACCESS_PASSWORD already defined)
- `src/lib/api-config.ts` — provider config builder (reused by middleware)
- Next.js middleware docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
