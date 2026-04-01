---
estimated_steps: 24
estimated_files: 9
skills_used: []
---

# T01: Build composable middleware handlers and HMAC signature utilities

Create the pure-logic middleware composition system and HMAC signature utilities. These are fully testable without Next.js runtime.

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

## Inputs

- `src/lib/env.ts`
- `src/lib/api-config.ts`
- `_archive/src-v0/utils/signature.ts`

## Expected Output

- `src/lib/signature.ts`
- `src/lib/middleware/compose.ts`
- `src/lib/middleware/verify-signature.ts`
- `src/lib/middleware/inject-keys.ts`
- `src/lib/middleware/check-disabled.ts`
- `src/lib/middleware/check-model-filter.ts`
- `src/lib/middleware/index.ts`
- `src/lib/__tests__/signature.test.ts`
- `src/lib/__tests__/middleware.test.ts`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| ts-md5 (MD5 hash) | Should never fail — pure JS computation | N/A — synchronous | N/A — deterministic output |
| env vars (ACCESS_PASSWORD, DISABLED_*) | Missing env = local mode (no auth) | N/A | Invalid format = Zod validation at app startup |

## Load Profile

- **Shared resources**: None — all handlers are stateless pure functions
- **Per-operation cost**: One MD5 hash computation (trivial CPU)
- **10x breakpoint**: N/A — no shared resources, no I/O

## Negative Tests

- **Malformed inputs**: Empty Authorization header, non-numeric X-Timestamp, missing headers, empty password
- **Error paths**: Expired timestamp (>30s), wrong signature for given password+timestamp, signature with wrong password
- **Boundary conditions**: Timestamp at exactly 30s boundary (tolerance edge), very long password strings, empty password string

## Verification

pnpm test -- src/lib/__tests__/signature.test.ts src/lib/__tests__/middleware.test.ts
