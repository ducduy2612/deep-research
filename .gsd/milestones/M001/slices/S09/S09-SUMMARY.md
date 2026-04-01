---
id: S09
parent: M001
milestone: M001
provides:
  - PWA installability with service worker and offline asset caching
  - i18n framework with English and Vietnamese translations across all 15+ component namespaces
  - UI language selector in settings (English/Tiếng Việt)
  - Lazy-loaded locale files for performance
  - Ghost border token consistency across all components
  - Correct surface hierarchy (Sheet for content cards, Deck for nav, Float for dropdowns)
  - All components under 300 lines
requires:
  - slice: S01
    provides: Complete Obsidian Deep component library with design tokens, shadcn/ui primitives, and surface hierarchy
  - slice: S06
    provides: Settings store infrastructure for persisting user preferences
  - slice: S05
    provides: All component files with hardcoded UI strings ready for i18n replacement
affects:
  []
key_files:
  - src/app/sw.ts
  - src/app/manifest.ts
  - src/i18n/request.ts
  - messages/en.json
  - messages/vi.json
  - next.config.ts
  - src/stores/settings-store.ts
  - src/components/settings/GeneralTab.tsx
  - tailwind.config.ts
key_decisions:
  - PWA: Serwist with withSerwistInit() wrapping next.config.ts, SerwistProvider via dynamic import with ssr:false, manifest as Next.js metadata route with Obsidian Deep colors
  - i18n: Cookie-based locale detection (NEXT_LOCALE cookie) via next-intl — no URL routing restructuring needed
  - uiLocale vs language: uiLocale field controls UI display (en/vi via next-intl), language field controls research output language via system prompt — two separate concerns
  - Plugin composition: withSerwist(withNextIntl(nextConfig)) — Serwist must wrap next-intl (outer vs inner matters)
  - Border tokens: All ghost borders use border-obsidian-outline-ghost/XX, with backward-compatible alias in Tailwind config
  - Surface hierarchy: Content cards use Sheet level (not Deck — Deck is for sidebars/nav only)
patterns_established:
  - Serwist PWA pattern: withSerwistInit() wrapping next.config, dynamic import SerwistProvider, manifest as metadata route
  - Cookie-based i18n: NEXT_LOCALE cookie for locale detection, lazy-loaded JSON files, no URL restructuring
  - useTranslations() in every component: all UI strings go through translation keys, never hardcoded
  - uiLocale vs language separation: UI display language and research output language are independent settings
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M001/slices/S09/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S09/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S09/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T22:54:07.942Z
blocker_discovered: false
---

# S09: PWA, i18n, and Polish

**PWA installability via Serwist, i18n with English/Vietnamese using next-intl, and Obsidian Deep design polish across all screens.**

## What Happened

S09 delivered the final polish layer for the v1.0 Deep Research application: PWA installability, i18n support, and Obsidian Deep design system compliance verification.

**T01 (PWA Configuration):** Installed @serwist/next (v9.5.7) and serwist (v9.5.7). Created service worker entry at src/app/sw.ts with defaultCache, skipWaiting, clientsClaim, and navigationPreload. Wrapped next.config.ts with withSerwistInit() — Serwist outer, next-intl inner (composition order matters). Created manifest.ts as a Next.js metadata route with Obsidian Deep theme colors (#0e0e10 background, #c0c1ff theme_color), standalone display mode, and icon references. Added SerwistProvider to providers via dynamic import with ssr:false to avoid SSR issues. Key discovery: serwist must be installed as explicit dependency because @serwist/next doesn't re-export its types. ThemeColor must go in viewport export per Next.js 15. Build outputs 43KB public/sw.js.

**T02 (i18n Integration):** Installed next-intl 4.8.4. Implemented cookie-based locale detection via NEXT_LOCALE cookie — avoids the need to restructure routes under [locale] segments. Created two complete translation files: messages/en.json and messages/vi.json with 100+ keys across 15 component namespaces. Locale files are lazy-loaded via dynamic import in getRequestConfig(). Added uiLocale field to settings store (separate from language — uiLocale controls UI display, language controls research output via system prompt). Added UI language selector dropdown in GeneralTab. Replaced all hardcoded UI strings across 15 component files with useTranslations() calls. Plugin composition: withSerwist(withNextIntl(nextConfig)) — order is critical.

**T03 (Obsidian Deep Polish Pass):** Audited all components against design/DESIGN.md. Fixed three categories of issues: (1) Border tokens — replaced all border-obsidian-border/XX references (which silently didn't resolve) with border-obsidian-outline-ghost/XX (correct ghost border token). Added backward-compatible border alias in tailwind.config.ts. (2) Surface hierarchy — changed content cards from bg-obsidian-surface-deck (sidebar level) to bg-obsidian-surface-sheet (content card level) in HistoryDialog and KnowledgeList. Changed UrlCrawler SelectContent to bg-obsidian-surface-float. (3) Line count — reduced HistoryDialog to exactly 300 lines via import consolidation.

All 498 tests pass. Build succeeds with service worker compilation and manifest route generation. No component exceeds 300 lines. 16 component files now use useTranslations().

## Verification

pnpm build succeeds with service worker compilation and manifest route generation (exit 0). pnpm test passes with all 498 tests green (exit 0). Service worker at public/sw.js (43KB). No component exceeds 300 lines (max: HistoryDialog at exactly 300). All border-obsidian-border references replaced with border-obsidian-outline-ghost (0 matches for old token, 15 matches for correct token). 16 component files use useTranslations(). Both en.json and vi.json have matching namespace keys. Visual verification at mobile (375px) and desktop (1440px) viewports confirmed responsive behavior and glassmorphism.

## Requirements Advanced

- PWA-01 — Serwist PWA configured with manifest, service worker, metadata, and theme colors
- PWA-02 — Service worker with defaultCache, skipWaiting, clientsClaim, precaching static assets
- I18N-01 — next-intl with cookie-based locale, useTranslations in 15+ components, language selector in settings
- I18N-02 — Separate uiLocale field for UI display vs language field for research output, both configurable
- I18N-03 — Dynamic import in getRequestConfig() loads only active locale's JSON per request

## Requirements Validated

- PWA-01 — Serwist PWA with manifest (standalone display, Obsidian Deep colors), service worker at public/sw.js (43KB), build produces /manifest.webmanifest
- PWA-02 — Service worker with defaultCache, skipWaiting, clientsClaim, navigationPreload. Build outputs public/sw.js (43KB)
- I18N-01 — next-intl with cookie-based locale, useTranslations in 15+ component files, language selector dropdown in GeneralTab
- I18N-02 — uiLocale field in settings store for UI display, separate language field for research output. Both configurable independently.
- I18N-03 — Locale files lazy-loaded via dynamic import in getRequestConfig() — only active locale loaded per request

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Minor deviations: (1) Installed serwist as explicit dependency alongside @serwist/next for type resolution — not in original plan. (2) Moved themeColor from metadata to viewport export per Next.js 15 requirement. (3) Added border token alias to tailwind.config.ts for backward compatibility.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/app/sw.ts` — New service worker entry with defaultCache, skipWaiting, clientsClaim
- `src/app/manifest.ts` — New PWA manifest with Obsidian Deep theme colors, standalone display
- `next.config.ts` — Wrapped with withSerwist(withNextIntl()) — Serwist outer, next-intl inner
- `src/app/layout.tsx` — PWA metadata (applicationName, appleWebApp, icons), viewport export with themeColor, NextIntlClientProvider setup
- `src/app/providers.tsx` — Added SerwistProvider via dynamic import with ssr:false
- `src/i18n/request.ts` — New next-intl request config with cookie-based locale detection and lazy-loaded locale files
- `messages/en.json` — New English translations — 100+ keys across 15 component namespaces
- `messages/vi.json` — New Vietnamese translations — matching namespaces and keys
- `src/stores/settings-store.ts` — Added uiLocale field with cookie sync (separate from language for research output)
- `src/components/settings/GeneralTab.tsx` — Added UI language selector dropdown (English/Tiếng Việt), useTranslations
- `src/components/Header.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/research/ActiveResearchCenter.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/research/FinalReport.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/research/TopicInput.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/research/ReportConfig.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/research/WorkflowProgress.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/settings/SettingsDialog.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/settings/AIModelsTab.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/settings/SearchTab.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/settings/AdvancedTab.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/settings/HistoryDialog.tsx` — Replaced hardcoded strings with useTranslations, fixed surface hierarchy, reduced to 300 lines
- `src/components/knowledge/KnowledgeDialog.tsx` — Replaced hardcoded strings with useTranslations
- `src/components/knowledge/KnowledgeList.tsx` — Replaced hardcoded strings with useTranslations, fixed surface hierarchy (Deck→Sheet)
- `src/components/knowledge/FileUpload.tsx` — Replaced hardcoded strings with useTranslations, fixed border tokens
- `src/components/knowledge/UrlCrawler.tsx` — Replaced hardcoded strings with useTranslations, fixed surface hierarchy for SelectContent
- `tailwind.config.ts` — Added border alias under obsidian colors for backward compatibility
