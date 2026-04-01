---
id: T03
parent: S08
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/lib/client-signature.ts", "src/stores/settings-store.ts", "src/components/settings/GeneralTab.tsx", "src/hooks/use-research.ts", "src/components/knowledge/FileUpload.tsx", "src/components/knowledge/UrlCrawler.tsx", "src/lib/__tests__/client-signature.test.ts"]
key_decisions: ["FileUpload and UrlCrawler read proxyMode/accessPassword from store.getState() (not hooks) since they're inside async callbacks", "use-research reads proxyMode/accessPassword via hooks at component level, passing into connectSSE closure", "Mode badge uses styled span instead of shadcn Badge component (not available)"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 498 tests pass (12 new client-signature tests + 486 existing with zero regressions). Production build succeeds cleanly with all new modules compiled."
completed_at: 2026-03-31T22:02:59.762Z
blocker_discovered: false
---

# T03: Added proxy mode toggle with access password in settings, client-side HMAC signature generation, and wired auth headers into all three API fetch call sites

> Added proxy mode toggle with access password in settings, client-side HMAC signature generation, and wired auth headers into all three API fetch call sites

## What Happened
---
id: T03
parent: S08
milestone: M001
key_files:
  - src/lib/client-signature.ts
  - src/stores/settings-store.ts
  - src/components/settings/GeneralTab.tsx
  - src/hooks/use-research.ts
  - src/components/knowledge/FileUpload.tsx
  - src/components/knowledge/UrlCrawler.tsx
  - src/lib/__tests__/client-signature.test.ts
key_decisions:
  - FileUpload and UrlCrawler read proxyMode/accessPassword from store.getState() (not hooks) since they're inside async callbacks
  - use-research reads proxyMode/accessPassword via hooks at component level, passing into connectSSE closure
  - Mode badge uses styled span instead of shadcn Badge component (not available)
duration: ""
verification_result: passed
completed_at: 2026-03-31T22:02:59.762Z
blocker_discovered: false
---

# T03: Added proxy mode toggle with access password in settings, client-side HMAC signature generation, and wired auth headers into all three API fetch call sites

**Added proxy mode toggle with access password in settings, client-side HMAC signature generation, and wired auth headers into all three API fetch call sites**

## What Happened

Created src/lib/client-signature.ts with createAuthHeaders() that generates fresh HMAC signatures per request using the same MD5 algorithm as server-side verification (ts-md5, timestamp truncated to 8 digits). Returns empty headers when password is empty. Wrote 12 unit tests covering happy paths, special characters, Unicode, :: separator, and negative cases.

Extended settings store with proxyMode (boolean) and accessPassword (string) fields including Zod schema validation, defaults, action methods, and persistence wiring.

Updated GeneralTab.tsx with a Connection section at top containing proxy mode Switch toggle (same pattern as localOnlyMode in ReportConfig), a styled mode indicator badge, and conditional access password input.

Wired auth headers into all three API fetch call sites: use-research.ts (reads proxyMode/accessPassword via React hooks, merges into connectSSE fetch), FileUpload.tsx (reads from useSettingsStore.getState() inside async callback), and UrlCrawler.tsx (same getState pattern). Each uses the pattern `...(proxyMode ? createAuthHeaders(accessPassword) : {})`.

## Verification

All 498 tests pass (12 new client-signature tests + 486 existing with zero regressions). Production build succeeds cleanly with all new modules compiled.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test -- src/lib/__tests__/client-signature.test.ts` | 0 | ✅ pass | 1400ms |
| 2 | `pnpm test` | 0 | ✅ pass | 1350ms |
| 3 | `pnpm build` | 0 | ✅ pass | 15000ms |


## Deviations

None

## Known Issues

None

## Files Created/Modified

- `src/lib/client-signature.ts`
- `src/stores/settings-store.ts`
- `src/components/settings/GeneralTab.tsx`
- `src/hooks/use-research.ts`
- `src/components/knowledge/FileUpload.tsx`
- `src/components/knowledge/UrlCrawler.tsx`
- `src/lib/__tests__/client-signature.test.ts`


## Deviations
None

## Known Issues
None
