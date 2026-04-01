---
estimated_steps: 24
estimated_files: 6
skills_used: []
---

# T03: Add proxy mode settings and client-side signature generation

Add proxy mode UI and client-side signature generation to all API fetch calls.

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

## Inputs

- `src/stores/settings-store.ts`
- `src/components/settings/GeneralTab.tsx`
- `src/hooks/use-research.ts`
- `src/components/knowledge/FileUpload.tsx`
- `src/components/knowledge/UrlCrawler.tsx`
- `src/lib/signature.ts`

## Expected Output

- `src/stores/settings-store.ts`
- `src/components/settings/GeneralTab.tsx`
- `src/lib/client-signature.ts`
- `src/hooks/use-research.ts`
- `src/components/knowledge/FileUpload.tsx`
- `src/components/knowledge/UrlCrawler.tsx`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Settings store persistence | localforage write fails → in-memory only | N/A | Settings lost on refresh |
| Signature generation | Empty password = empty headers (graceful) | N/A | Request goes without auth → server 401 |
| ts-md5 in browser | Must work client-side (pure JS, no Node) | N/A | Signature generation throws → no auth headers |

## Load Profile

- **Shared resources**: None — each request generates its own signature
- **Per-operation cost**: 1 MD5 hash + Date.now() per API call
- **10x breakpoint**: N/A — negligible cost per request

## Negative Tests

- **Malformed inputs**: Empty access password string, very long password, special characters in password
- **Error paths**: Proxy mode on but no password set → empty headers → server rejects. Password set but proxy mode off → no headers sent.
- **Boundary conditions**: Password with Unicode characters, password with :: separator (matches algorithm delimiter)

## Verification

pnpm test && pnpm build
