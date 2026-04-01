---
estimated_steps: 19
estimated_files: 2
skills_used: []
---

# T02: Wire composable handlers into Next.js middleware

Create `src/middleware.ts` that wires the composable handlers into Next.js Edge middleware.

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

## Inputs

- `src/lib/middleware/compose.ts`
- `src/lib/middleware/verify-signature.ts`
- `src/lib/middleware/check-disabled.ts`
- `src/lib/middleware/check-model-filter.ts`
- `src/lib/middleware/index.ts`
- `src/lib/signature.ts`
- `src/lib/env.ts`
- `next.config.ts`

## Expected Output

- `src/middleware.ts`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Edge Runtime | ts-md5 must be pure JS (no Node crypto) | N/A | Build fails if Node APIs leak in |
| Route handler body consumption | Middleware must NOT read request body | N/A | Route handler gets empty body |
| Export mode webpack | ignore-loader excludes middleware | N/A | Export build includes middleware (bug) |

## Load Profile

- **Shared resources**: None — middleware is stateless per-request
- **Per-operation cost**: Signature verification (1 MD5 hash) + env reads
- **10x breakpoint**: N/A — middleware overhead is negligible vs AI request latency

## Negative Tests

- **Malformed inputs**: Request to /api/* with no auth headers when ACCESS_PASSWORD is set
- **Error paths**: 401 response for invalid signature, 403 for disabled provider
- **Boundary conditions**: Export mode build excludes middleware; standalone mode includes it

## Verification

pnpm build && grep -q 'middleware' .next/server/middleware.js 2>/dev/null; echo 'Build succeeded with middleware'
