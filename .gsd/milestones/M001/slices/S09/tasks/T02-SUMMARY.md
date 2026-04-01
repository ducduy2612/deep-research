---
id: T02
parent: S09
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/i18n/request.ts", "messages/en.json", "messages/vi.json", "next.config.ts", "src/app/layout.tsx", "src/app/providers.tsx", "src/stores/settings-store.ts", "src/components/settings/GeneralTab.tsx", "src/components/Header.tsx", "src/components/research/ActiveResearchCenter.tsx", "src/components/research/FinalReport.tsx", "src/components/research/TopicInput.tsx", "src/components/research/ReportConfig.tsx", "src/components/research/WorkflowProgress.tsx", "src/components/settings/SettingsDialog.tsx", "src/components/settings/AIModelsTab.tsx", "src/components/settings/SearchTab.tsx", "src/components/settings/AdvancedTab.tsx", "src/components/settings/HistoryDialog.tsx", "src/components/knowledge/KnowledgeDialog.tsx", "src/components/knowledge/KnowledgeList.tsx", "src/components/knowledge/FileUpload.tsx", "src/components/knowledge/UrlCrawler.tsx"]
key_decisions: ["Used cookie-based locale detection (NEXT_LOCALE) instead of URL routing", "Composed withSerwist(withNextIntl(nextConfig)) — next-intl inner, Serwist outer", "Added uiLocale field separate from language field (language controls research output, uiLocale controls UI display)", "Lazy-loaded locale JSON files via dynamic import in getRequestConfig"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm build succeeds (exit 0, next-intl plugin integration compiles). pnpm test passes with all 498 tests green (exit 0). grep -rl 'useTranslations' src/components/ returns 15 files. Both locale JSON files have identical namespace keys via diff check."
completed_at: 2026-03-31T22:41:24.379Z
blocker_discovered: false
---

# T02: Added next-intl i18n with cookie-based locale detection, English and Vietnamese translations across 15 component namespaces, and UI language selector in settings

> Added next-intl i18n with cookie-based locale detection, English and Vietnamese translations across 15 component namespaces, and UI language selector in settings

## What Happened
---
id: T02
parent: S09
milestone: M001
key_files:
  - src/i18n/request.ts
  - messages/en.json
  - messages/vi.json
  - next.config.ts
  - src/app/layout.tsx
  - src/app/providers.tsx
  - src/stores/settings-store.ts
  - src/components/settings/GeneralTab.tsx
  - src/components/Header.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/FinalReport.tsx
  - src/components/research/TopicInput.tsx
  - src/components/research/ReportConfig.tsx
  - src/components/research/WorkflowProgress.tsx
  - src/components/settings/SettingsDialog.tsx
  - src/components/settings/AIModelsTab.tsx
  - src/components/settings/SearchTab.tsx
  - src/components/settings/AdvancedTab.tsx
  - src/components/settings/HistoryDialog.tsx
  - src/components/knowledge/KnowledgeDialog.tsx
  - src/components/knowledge/KnowledgeList.tsx
  - src/components/knowledge/FileUpload.tsx
  - src/components/knowledge/UrlCrawler.tsx
key_decisions:
  - Used cookie-based locale detection (NEXT_LOCALE) instead of URL routing
  - Composed withSerwist(withNextIntl(nextConfig)) — next-intl inner, Serwist outer
  - Added uiLocale field separate from language field (language controls research output, uiLocale controls UI display)
  - Lazy-loaded locale JSON files via dynamic import in getRequestConfig
duration: ""
verification_result: passed
completed_at: 2026-03-31T22:41:24.381Z
blocker_discovered: false
---

# T02: Added next-intl i18n with cookie-based locale detection, English and Vietnamese translations across 15 component namespaces, and UI language selector in settings

**Added next-intl i18n with cookie-based locale detection, English and Vietnamese translations across 15 component namespaces, and UI language selector in settings**

## What Happened

Installed next-intl 4.8.4 and configured full i18n pipeline: server-side request config reading NEXT_LOCALE cookie (defaulting to "en"), two complete translation files (messages/en.json and messages/vi.json) with ~100+ keys across 15 component namespaces, next-intl plugin composed inside Serwist wrapper in next.config.ts, NextIntlClientProvider added to providers with messages/locale from getMessages()/getLocale() in layout, uiLocale field added to settings store with cookie sync on change, UI language selector dropdown added to GeneralTab (English/Tiếng Việt), and all 15 component files updated to use useTranslations() instead of hardcoded strings. Build succeeds, all 498 tests pass, 15 component files confirmed using useTranslations.

## Verification

pnpm build succeeds (exit 0, next-intl plugin integration compiles). pnpm test passes with all 498 tests green (exit 0). grep -rl 'useTranslations' src/components/ returns 15 files. Both locale JSON files have identical namespace keys via diff check.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm build` | 0 | ✅ pass | 19000ms |
| 2 | `pnpm test` | 0 | ✅ pass | 3200ms |
| 3 | `grep -rl 'useTranslations' src/components/ | wc -l` | 0 | ✅ pass (15 files) | 200ms |


## Deviations

FileUpload.tsx needed useTranslations import added separately after initial write. KnowledgeList.tsx uses "History" namespace for confirm/cancel buttons. vi.json Workflow steps use uppercase Vietnamese matching original English style.

## Known Issues

None.

## Files Created/Modified

- `src/i18n/request.ts`
- `messages/en.json`
- `messages/vi.json`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/stores/settings-store.ts`
- `src/components/settings/GeneralTab.tsx`
- `src/components/Header.tsx`
- `src/components/research/ActiveResearchCenter.tsx`
- `src/components/research/FinalReport.tsx`
- `src/components/research/TopicInput.tsx`
- `src/components/research/ReportConfig.tsx`
- `src/components/research/WorkflowProgress.tsx`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/settings/AIModelsTab.tsx`
- `src/components/settings/SearchTab.tsx`
- `src/components/settings/AdvancedTab.tsx`
- `src/components/settings/HistoryDialog.tsx`
- `src/components/knowledge/KnowledgeDialog.tsx`
- `src/components/knowledge/KnowledgeList.tsx`
- `src/components/knowledge/FileUpload.tsx`
- `src/components/knowledge/UrlCrawler.tsx`


## Deviations
FileUpload.tsx needed useTranslations import added separately after initial write. KnowledgeList.tsx uses "History" namespace for confirm/cancel buttons. vi.json Workflow steps use uppercase Vietnamese matching original English style.

## Known Issues
None.
