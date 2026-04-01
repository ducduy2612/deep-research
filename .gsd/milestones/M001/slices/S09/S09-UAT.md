# S09: PWA, i18n, and Polish — UAT

**Milestone:** M001
**Written:** 2026-03-31T22:54:07.942Z

# S09 UAT — PWA, i18n, and Polish

## Preconditions
- Application running at http://localhost:3000
- Browser with DevTools available (Chrome/Edge recommended for PWA testing)
- No API keys required for UI testing

---

## Test Case 1: PWA Manifest and Installability

**Goal:** Verify the app exposes a valid PWA manifest with correct Obsidian Deep theme.

1. Navigate to http://localhost:3000
2. Open DevTools → Application → Manifest
   - **Expected:** `name` = "Deep Research", `display` = "standalone"
   - **Expected:** `background_color` = "#0e0e10", `theme_color` = "#c0c1ff"
   - **Expected:** Icons listed with 512x512 maskable + SVG entry
3. Check Application → Service Workers
   - **Expected:** One registered service worker with status "activated and is running"
4. In Chrome address bar, look for install icon (⊕ or install prompt)
   - **Expected:** Install prompt is available (app is installable)

## Test Case 2: Service Worker Offline Caching

**Goal:** Verify service worker caches assets for offline access.

1. Navigate to http://localhost:3000 with network online
2. Open DevTools → Application → Cache Storage
   - **Expected:** Serwist precache entries exist with hashed URLs
3. In DevTools → Network, check "Offline" mode
4. Refresh the page
   - **Expected:** Page loads from service worker cache (not network error)
   - **Expected:** Core UI renders (may show error for API-dependent features — that's OK)

## Test Case 3: i18n — Language Switching

**Goal:** Verify UI language can be switched between English and Vietnamese.

1. Navigate to http://localhost:3000
2. Click the Settings gear icon in the header
3. In General tab, locate the "Language" or "UI Language" dropdown
   - **Expected:** Dropdown shows "English" and "Tiếng Việt" options
4. Select "Tiếng Việt"
   - **Expected:** All UI labels immediately update to Vietnamese text
   - **Expected:** Header nav items show Vietnamese labels
   - **Expected:** Settings dialog tabs show Vietnamese labels
   - **Expected:** Topic input placeholder shows Vietnamese text
5. Close and reopen Settings
   - **Expected:** Language persists (still showing Vietnamese)
6. Switch back to "English"
   - **Expected:** All labels return to English

## Test Case 4: i18n — Locale Persistence

**Goal:** Verify locale selection persists across page reloads.

1. Set UI language to "Tiếng Việt" via Settings → General
2. Reload the page (F5)
   - **Expected:** Page loads with Vietnamese UI (NOT reverting to English)
3. Open DevTools → Application → Cookies
   - **Expected:** NEXT_LOCALE cookie is set to "vi"
4. Switch back to English, reload
   - **Expected:** Page loads in English
   - **Expected:** NEXT_LOCALE cookie is "en"

## Test Case 5: i18n — Translation Coverage

**Goal:** Verify all major UI screens have translated strings.

1. With language set to Vietnamese, navigate through:
   - **Header:** Nav items should show Vietnamese text
   - **Topic Input:** Placeholder text in Vietnamese
   - **Report Config:** Style/length labels in Vietnamese
   - **Settings Dialog:** All tab labels in Vietnamese (AI Models, Search, General, Advanced)
   - **Settings → AI Models Tab:** Provider labels, model fields in Vietnamese
   - **Settings → Search Tab:** Provider names, API key labels in Vietnamese
   - **Settings → Advanced Tab:** Prompt override labels in Vietnamese
   - **Settings → General Tab:** All labels in Vietnamese
   - **Knowledge Dialog:** Upload/crawl labels in Vietnamese
   - **History Dialog:** Research session labels in Vietnamese
2. **Expected:** No English strings visible in any Vietnamese-screen (except brand name "Deep Research")

## Test Case 6: Obsidian Deep — Border Token Compliance

**Goal:** Verify no visible 1px solid borders; only ghost borders are used.

1. Navigate to http://localhost:3000
2. Inspect the following elements for border styling:
   - Session cards in History dialog
   - Knowledge item cards in Knowledge dialog
   - Settings tab content areas
   - Report config panel
3. **Expected:** Any borders use `rgba(70, 69, 84, 0.15)` or similar ghost style
4. **Expected:** No `border-solid` or visible gray lines separating content areas

## Test Case 7: Obsidian Deep — Surface Hierarchy

**Goal:** Verify surface hierarchy is correct across all screens.

1. Check the following surface assignments:
   - **Well (darkest):** Page background
   - **Deck:** Sidebar navigation areas
   - **Sheet:** Content cards (session cards, knowledge cards, research panels)
   - **Raised:** Buttons, interactive elements
   - **Float:** Dropdown menus, popover content, modals
2. History session cards → **Expected:** `bg-obsidian-surface-sheet` (not Deck)
3. Knowledge item cards → **Expected:** `bg-obsidian-surface-sheet` (not Deck)
4. Settings dialog → **Expected:** Glassmorphism with backdrop-blur
5. Knowledge dialog → **Expected:** Glassmorphism with backdrop-blur

## Test Case 8: Component Line Count Compliance

**Goal:** Verify no component file exceeds 300 lines.

1. Run: `find src/components -name '*.tsx' -exec wc -l {} + | sort -rn | head -5`
   - **Expected:** Maximum line count is ≤ 300 (HistoryDialog may be exactly 300)
   - **Expected:** No file exceeds 300 lines

## Test Case 9: Responsive Layout Verification

**Goal:** Verify responsive behavior at mobile and desktop viewports.

1. Set viewport to 375×812 (iPhone mobile)
   - **Expected:** Nav items collapse to icons only
   - **Expected:** Topic input and config remain usable
   - **Expected:** Dialogs fit within mobile viewport
2. Set viewport to 1440×900 (desktop)
   - **Expected:** Full nav labels visible
   - **Expected:** Three-panel research layout works correctly
   - **Expected:** All dialogs centered with proper sizing

## Test Case 10: Build and Test Suite

**Goal:** Verify full build and test suite pass.

1. Run `pnpm build`
   - **Expected:** Build succeeds with (serwist) service worker compilation step
   - **Expected:** /manifest.webmanifest route generated
2. Run `pnpm test`
   - **Expected:** All 498 tests pass
3. Run `ls -la public/sw.js`
   - **Expected:** File exists, ~43KB
