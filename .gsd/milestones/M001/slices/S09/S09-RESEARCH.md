# S09 Research: PWA, i18n, and Polish

**Calibration:** Targeted research — known technologies (Serwist, next-intl) new to this codebase, moderate integration complexity.

## Summary

S09 covers three independent work streams: (1) PWA via Serwist with offline caching, (2) i18n via next-intl with en-US and vi-VN locales, and (3) final Obsidian Deep polish. All three streams are independent and can be parallelized or sequenced. The PWA and i18n integrations are well-documented with clear patterns from the old v0 codebase. The polish pass is visual refinement against design mockups. Neither `serwist` nor `next-intl` are currently installed.

## Requirements This Slice Owns

| ID | Description | Notes |
|----|-------------|-------|
| PWA-01 | User can install the app as a PWA on desktop and mobile | Needs manifest, service worker, icons |
| PWA-02 | Service worker caches assets for offline access via Serwist | Old v0 had Serwist already (`_archive/src-v0/app/sw.ts`) |
| I18N-01 | User can switch UI language between English (en-US) and Vietnamese (vi-VN) | Old v0 had 4 locales (430-line JSON files), we ship 2 for v1 |
| I18N-02 | User can set research output language, which controls AI response language via system prompt | Already partially implemented — `settings.language` field exists, `getSystemPrompt()` appends "Respond in {language}" |
| I18N-03 | Locale files are lazy-loaded for performance | next-intl supports dynamic `import()` for message files |

## Recommendation

Three-task decomposition, one per work stream:

1. **T01 — PWA with Serwist**: Install `@serwist/next` + `serwist`, create `src/app/sw.ts` service worker (copy pattern from `_archive/src-v0/app/sw.ts`), wrap `next.config.ts` with `withSerwistInit`, add web app manifest via Next.js metadata API, add `SerwistProvider` to layout. Old v0 manifest in `_archive/src-v0/app/manifest.json` provides template. Logo files exist at `public/logo.png` and `public/logo.svg`.

2. **T02 — i18n with next-intl**: Install `next-intl`, create `src/i18n/` directory with request config (`getRequestConfig` reading locale from cookie), `src/i18n/routing.ts` defining supported locales, message JSON files (`messages/en.json`, `messages/vi.json`), wrap providers with `NextIntlClientProvider`, replace hardcoded strings with `useTranslations()` calls across ~15 component files. Settings store already has `language` field — wire it to both UI locale (via cookie) and research output language (via system prompt).

3. **T03 — Obsidian Deep Polish**: Visual review against design mockups in `design/screens/`, fix any surface hierarchy inconsistencies, ensure glassmorphism on floating elements, verify tonal layering across all components, responsive checks at mobile/desktop breakpoints. This is purely visual refinement — no new architecture.

## Implementation Landscape

### PWA (Serwist)

**Packages needed:** `@serwist/next` (v9.5.7, peer dep `next >= 14`), `serwist` (bundled with @serwist/next), `@serwist/next/react` (for SerwistProvider)

**Files to create:**
- `src/app/sw.ts` — Service worker entry (pattern from `_archive/src-v0/app/sw.ts`)
- `src/app/serwist.ts` — Client-side re-export of SerwistProvider (`"use client"; export { SerwistProvider } from "@serwist/next/react"`)

**Files to modify:**
- `next.config.ts` — Wrap with `withSerwistInit()`, add `swSrc: "src/app/sw.ts"`, `swDest: "public/sw.js"`
- `src/app/layout.tsx` — Add PWA metadata (applicationName, appleWebApp, manifest), wrap children with `<SerwistProvider swUrl="/sw.js">`, update theme_color to Obsidian Deep (#0e0e10, not #FFFFFF)
- `tsconfig.json` — Add `"src/app/sw.ts"` to includes if needed for service worker types
- `package.json` — Add `"build": "next build && serwist build"` or modify existing build script

**Key constraints:**
- Serwist uses `swSrc`/`swDest` pattern — service worker source in `src/app/sw.ts`, compiled to `public/sw.js`
- The middleware matcher (`/api/:path*`) won't conflict with SW — SW handles asset caching, middleware handles API auth
- Old manifest had `theme_color: "#FFFFFF"` and `background_color: "#FFFFFF"` — must change to Obsidian Deep values (#0e0e10)
- `skipWaiting: true` recommended for Docker redeployments (per research doc pitfall #18)
- Build mode `export` uses `ignore-loader` to strip API routes — SW must still work for static assets in export mode
- Icons already exist: `public/logo.png` (512x512) and `public/logo.svg` (any)

### i18n (next-intl)

**Packages needed:** `next-intl` (v4.8.4)

**Approach: Cookie-based locale without URL routing.** The app doesn't use locale-prefixed routes (`/en/...`, `/vi/...`), so we use next-intl's cookie-based locale detection. This is documented and supported.

**Files to create:**
- `src/i18n/request.ts` — `getRequestConfig()` reading locale from cookie `NEXT_LOCALE`, defaulting to `en`
- `messages/en.json` — English translations (key structure matches component namespaces)
- `messages/vi.json` — Vietnamese translations

**Files to modify:**
- `next.config.ts` — Wrap with `createNextIntlPlugin()` (MUST compose with Serwist wrapper — order: `withSerwist(withNextIntl(nextConfig))`)
- `src/app/providers.tsx` — Add `NextIntlClientProvider` wrapping children, passing messages from server
- `src/app/layout.tsx` — Import messages via `getMessages()` from `next-intl/server`
- `src/stores/settings-store.ts` — Change `language` field to store locale ID (`"en"` or `"vi"`) instead of language name string. Add `uiLocale` field for UI language if different from output language.
- `src/components/settings/GeneralTab.tsx` — Add language selector dropdown
- ~15 component files — Replace hardcoded strings with `useTranslations()` calls

**String audit (~77 hardcoded strings across components):**
- `Header.tsx` (6 strings): "Deep Research", "Hub", "Report", "Knowledge", "History", "Settings", "GitHub"
- `ActiveResearchCenter.tsx` (6): Step labels — "Clarifying topic", "Planning research", etc.
- `ReportConfig.tsx` (7): Style/length labels — "Balanced", "Executive", "Technical", "Concise", "Brief", "Standard", "Comprehensive"
- `TopicInput.tsx` (4): Preset labels — "Market Map", "Technical Deep Dive", "Compare Options", placeholder
- `FinalReport.tsx` (~12): "Contents", "Sources", "Date", "Report Complete", "New Research", "Share", "Export", "No report available", "Verified", "Process Time"
- `SettingsDialog.tsx` (3): Tab names
- `AIModelsTab.tsx` (6): Provider names
- `SearchTab.tsx` (7): Provider names, placeholders
- `GeneralTab.tsx` (10): Labels, section headers
- `HistoryDialog.tsx` (6): Headers, empty state text
- `AdvancedTab.tsx` (7): Labels
- `KnowledgeDialog.tsx` (2): Tab names
- `KnowledgeList.tsx` (3): Empty state text
- `FileUpload.tsx` (2): Upload prompt
- `UrlCrawler.tsx` (5): Labels, error messages

**Message file structure** (namespace by component):
```json
{
  "Header": { "appName": "Deep Research", "hub": "Hub", ... },
  "Research": { "steps": { "clarify": "Clarifying topic", ... }, ... },
  "Report": { "contents": "Contents", "sources": "Sources", ... },
  "Settings": { "tabs": { "ai": "AI Models", ... }, ... },
  "Knowledge": { "tabs": { "files": "Files", ... }, ... }
}
```

**I18N-02 (research output language):** Already partially wired — `settings.language` passes to `getSystemPrompt(language)` which appends "Respond in {language}". Need to make the language selector in GeneralTab set both `uiLocale` (for UI language) and `language` (for output language), or keep them as separate fields.

**Key constraint:** The `getRequestConfig` function in Next.js 15 must use the cookie-based approach (`cookies()` from `next/headers`), not `requestLocale` parameter (that's for locale-based routing which we don't use).

### Polish

**No new packages.** This is visual refinement.

**Reference materials:**
- `design/screens/*.png` — Visual mockups for each screen
- `design/DESIGN.md` — Design tokens, color palette, typography specs
- `design/design-system/obsidian-deep-spec.md` — Full specification

**Areas to review:**
1. **Surface hierarchy consistency** — All components use `obsidian-surface-*` tokens correctly (Well → Deck → Sheet → Raised → Float)
2. **Glassmorphism** — Floating elements (modals, command palette) use `backdrop-blur-xl` with semi-transparent backgrounds
3. **Typography** — Inter for body, JetBrains Mono for code, correct letter-spacing on headings (-0.04em)
4. **Ghost borders** — No 1px solid borders (Obsidian Deep "No-Line Rule"). Use `rgba(70, 69, 84, 0.15)` ghost borders only where structurally needed
5. **Responsive breakpoints** — Test at mobile (375px) and desktop (1440px)
6. **Component file size** — All files under 300 lines (HistoryDialog.tsx is exactly 300, the rest are well under)

## Risks and Constraints

1. **next.config.ts composition order** — Both Serwist (`withSerwistInit`) and next-intl (`createNextIntlPlugin`) wrap the config. The outer wrapper runs last, so order matters: `withSerwist(withNextIntl(nextConfig))`. This must be tested.

2. **Serwist + export mode conflict** — When `BUILD_MODE=export`, the config strips API routes and sets `output: "export"`. The SW should still work for caching static assets, but the `additionalPrecacheEntries` and `fallbacks` need to handle the offline page gracefully. Test both build modes.

3. **next-intl without routing — cookie sync** — The settings store persists `language` to localforage, but next-intl reads locale from a cookie on the server side. When user changes language, we need to set the `NEXT_LOCALE` cookie (via `document.cookie` or a server action) so the server-rendered layout picks it up on refresh. The client-side `NextIntlClientProvider` can be updated immediately via state.

4. **i18n scope is large (~77 strings)** — Replacing all hardcoded strings across 15+ files is mechanical but error-prone. Each component needs `useTranslations("Namespace")` and every string needs a key. The planner should consider batching by component group.

5. **PWA manifest theme colors** — Old v0 manifest uses `#FFFFFF` for both theme and background colors. Must change to Obsidian Deep values (`#0e0e10` for background, `#c0c1ff` for theme_color) to match the dark-only design.

## What to Build First

**Recommended order:** T01 (PWA) → T02 (i18n) → T03 (Polish)

- PWA first because it touches `next.config.ts` and `layout.tsx` — get the config composition working before adding i18n's config wrapper
- i18n second because it's the largest task (~77 strings across 15 files) and modifies the most components
- Polish last because it reviews everything in final state after PWA and i18n changes

## How to Verify

- **PWA:** `pnpm build` succeeds, Lighthouse PWA audit scores > 90, app is installable in Chrome, service worker registers and caches assets
- **i18n:** Language switch in settings changes all UI strings, locale persists across refresh (cookie), lazy-loading works (network tab shows only active locale JSON loaded), research output language works (AI responds in selected language)
- **Polish:** Visual comparison against design mockups, all surfaces use correct tokens, no 1px solid borders, glassmorphism on modals, responsive at mobile and desktop
- **Regression:** All 498+ existing tests pass, `pnpm build` succeeds in both standalone and default modes
