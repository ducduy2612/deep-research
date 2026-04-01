# S08: CORS Proxy Mode — UAT

**Milestone:** M001
**Written:** 2026-03-31T22:07:44.865Z

# S08 UAT — CORS Proxy Mode

## Preconditions
- App running at http://localhost:3000 (`pnpm dev`)
- No `ACCESS_PASSWORD` in `.env.local` (default local mode)

---

## Test 1: Local Mode — No Auth Required (Default)

**Goal:** Verify all API routes work without authentication when ACCESS_PASSWORD is not set.

1. Open http://localhost:3000
2. Open Settings → General tab
3. Verify "Connection" section shows "Local" mode badge
4. Verify proxy mode switch is OFF
5. Close settings, start a research query (any topic)
6. **Expected:** Research begins streaming without any auth errors
7. Verify browser DevTools Network tab shows requests to `/api/research/stream` with NO Authorization or X-Timestamp headers

## Test 2: Proxy Mode Toggle — Settings UI

**Goal:** Verify proxy mode toggle shows password field and updates mode indicator.

1. Open Settings → General tab
2. Toggle proxy mode switch ON
3. **Expected:** Mode badge changes to "Proxy"
4. **Expected:** Access password input field appears below the toggle
5. Enter a password (e.g., "test-secret-123") in the password field
6. **Expected:** Password field shows masked value
7. Toggle proxy mode switch OFF
8. **Expected:** Password field disappears, mode badge shows "Local"
9. Toggle proxy mode ON again
10. **Expected:** Previously entered password is still there (persistence)
11. Refresh the page
12. **Expected:** Proxy mode is ON and password persists after page reload

## Test 3: Proxy Mode — Auth Headers Generated

**Goal:** Verify auth headers are sent when proxy mode is enabled.

1. Open Settings → General tab
2. Toggle proxy mode ON
3. Enter access password "my-secret-key"
4. Open browser DevTools Network tab
5. Start a research query
6. **Expected:** Request to `/api/research/stream` includes:
   - `Authorization` header with MD5 signature (32-char hex)
   - `X-Timestamp` header with current Unix timestamp in milliseconds
7. Start a second research query
8. **Expected:** Authorization and X-Timestamp headers are DIFFERENT from the first request (fresh per-request)

## Test 4: Proxy Mode — Knowledge API Auth

**Goal:** Verify auth headers are sent on knowledge API calls when proxy mode is enabled.

1. Open Settings → General tab, enable proxy mode with a password
2. Navigate to Knowledge tab
3. Upload a test file (any supported format)
4. **Expected:** Request to `/api/knowledge/parse` includes Authorization and X-Timestamp headers
5. Add a URL to crawl
6. **Expected:** Request to `/api/knowledge/crawl` includes Authorization and X-Timestamp headers

## Test 5: HMAC Signature Algorithm Correctness

**Goal:** Verify the signature algorithm matches between client and server.

1. With proxy mode enabled and password "test-pass", check DevTools Network tab
2. Find a request to `/api/research/stream`
3. Note the `X-Timestamp` header value (e.g., "1743461234567")
4. Compute expected signature: `MD5("test-pass::" + timestamp.substring(0, 8))`
   - For timestamp "1743461234567", truncated to "17434612"
   - Expected data: `"test-pass::17434612"`
5. **Expected:** The Authorization header matches the computed MD5 hash

## Test 6: Middleware — Proxy Mode Blocked Without Auth

**Goal:** Verify middleware rejects requests without valid auth when ACCESS_PASSWORD is set.

1. Add `ACCESS_PASSWORD=server-secret` to `.env.local`
2. Restart dev server
3. Open Settings → General tab, enable proxy mode with password "server-secret"
4. Start a research query
5. **Expected:** Research works normally (auth headers match server password)
6. Now change the access password in settings to "wrong-password"
7. Start a new research query
8. **Expected:** Request to `/api/research/stream` returns 401 Unauthorized
9. **Expected:** Error is displayed to the user with recovery options
10. Remove ACCESS_PASSWORD from `.env.local`, restart server
11. **Expected:** All routes work again without auth (back to local mode)

## Test 7: Middleware — Disabled Provider Check

**Goal:** Verify check-disabled handler blocks disabled providers.

1. Add `NEXT_PUBLIC_DISABLED_AI_PROVIDER=google` to `.env.local`
2. Restart dev server
3. Try to start research with Google Gemini provider selected
4. **Expected:** Request returns 403 Forbidden (provider disabled)
5. Switch to a non-disabled provider (e.g., openai)
6. **Expected:** Research works normally
7. Remove the env var, restart server

## Test 8: Middleware — Model Filter Check

**Goal:** Verify check-model-filter handler blocks disallowed models.

1. Add `NEXT_PUBLIC_MODEL_LIST=gpt-4o,gemini-2.0-flash` to `.env.local`
2. Restart dev server
3. Try to start research with a model NOT in the allowlist
4. **Expected:** Request returns 403 Forbidden (model not allowed)
5. Switch to a model in the allowlist
6. **Expected:** Research works normally
7. Remove the env var, restart server

## Edge Cases

### EC-1: Empty Access Password
1. Enable proxy mode but leave password empty
2. Start research
3. **Expected:** No auth headers sent (createAuthHeaders returns empty object for empty password)

### EC-2: Rapid Sequential Requests
1. Enable proxy mode with a password
2. Start multiple research queries rapidly
3. **Expected:** Each request has a unique timestamp and signature
4. **Expected:** All requests succeed (no timestamp collision issues)

### EC-3: Clock Skew Tolerance
1. This is validated by unit tests — verifySignature accepts ±30 second tolerance
2. Manual test: intercept a request and modify X-Timestamp to be 20 seconds in the past
3. **Expected:** Server still accepts (within 30s tolerance)
4. Modify X-Timestamp to be 60 seconds in the past
5. **Expected:** Server rejects with 401 (exceeds tolerance)

