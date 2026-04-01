---
estimated_steps: 7
estimated_files: 24
skills_used: []
---

# T02: Add i18n with next-intl (en-US and vi-VN locales)

**Slice:** S09 — PWA, i18n, and Polish
**Milestone:** M001

## Description

Install next-intl, set up cookie-based locale detection (no URL routing — the app doesn't use locale-prefixed routes), create English and Vietnamese message files covering all ~77 hardcoded strings across 15 component files, add NextIntlClientProvider to providers, add a uiLocale field to settings store with cookie sync, add a language selector dropdown to GeneralTab, and replace all hardcoded UI strings with useTranslations() calls. The existing `language` field in settings store stays for research output language (I18N-02, already wired to getSystemPrompt). Locale JSON files should be lazy-loaded via dynamic import for I18N-03.

## Steps

1. **Install next-intl**: `pnpm add next-intl`

2. **Create `src/i18n/request.ts`** — the server-side request config. Use `getRequestConfig()` from `next-intl/server`. Read locale from a cookie named `NEXT_LOCALE` using `cookies()` from `next/headers`. Default to `"en"`. Supported locales: `["en", "vi"]`. Return `{ locale, messages: (await import(`../../messages/${locale}.json`)).default }` — this dynamic import achieves I18N-03 lazy loading.

3. **Create `messages/en.json`** — English translations. Structure by component namespace:
   ```json
   {
     "Header": { "appName": "Deep Research", "hub": "Hub", "report": "Report", "knowledge": "Knowledge", "history": "History", "settings": "Settings", "github": "GitHub" },
     "Research": {
       "steps": { "clarify": "Clarifying topic", "plan": "Planning research", "search": "Searching sources", "analyze": "Analyzing findings", "review": "Reviewing report", "report": "Generating report" },
       "idleText": "Enter a topic to begin research.",
       "streaming": "streaming"
     },
     "TopicInput": {
       "title": "What would you like to research?",
       "subtitle": "Define your objective to initialize analysis.",
       "placeholder": "e.g., Deep dive into solid-state battery manufacturing trends for 2025...",
       "frameworksLabel": "Suggested Frameworks",
       "marketMap": "Market Map",
       "techDive": "Technical Deep Dive",
       "compare": "Compare Options",
       "attachSources": "Attach Sources",
       "startResearch": "Start Research",
       "helpPrefix": "Enter a topic above and press",
       "helpSuffix": "to start your research journey."
     },
     "ReportConfig": {
       "style": "Style",
       "length": "Length",
       "knowledgeMode": "Knowledge Mode",
       "localOnly": "Local Only",
       "noWebSearch": "No Web Search",
       "localOnlyDesc": "Research using only your knowledge base documents",
       "styles": { "balanced": "Balanced", "balancedDesc": "Equal depth and readability", "executive": "Executive", "executiveDesc": "High-level strategic insights", "technical": "Technical", "technicalDesc": "Detailed technical analysis", "concise": "Concise", "conciseDesc": "Brief summary of key findings" },
       "lengths": { "brief": "Brief", "briefDesc": "Quick overview (~500 words)", "standard": "Standard", "standardDesc": "Balanced depth (~1,500 words)", "comprehensive": "Comprehensive", "comprehensiveDesc": "Deep analysis (~3,000+ words)" }
     },
     "Report": {
       "contents": "Contents",
       "sources": "Sources",
       "date": "Date",
       "verified": "Verified",
       "processTime": "Process Time",
       "reportComplete": "Report Complete",
       "basedOn": "Based on {count} verified sources.",
       "newResearch": "New Research",
       "share": "Share",
       "export": "Export",
       "noReport": "No report available."
     },
     "Settings": {
       "title": "Settings",
       "tabs": { "ai": "AI Models", "search": "Search", "general": "General", "advanced": "Advanced" }
     },
     "General": {
       "connection": "Connection",
       "proxyMode": "Proxy Mode",
       "proxy": "Proxy",
       "local": "Local",
       "accessPassword": "Access Password",
       "accessPasswordPlaceholder": "Enter access password",
       "accessPasswordHint": "Required when connecting through a CORS proxy server.",
       "reportLanguage": "Report Language",
       "uiLanguage": "UI Language",
       "uiLanguageEn": "English",
       "uiLanguageVi": "Tiếng Việt",
       "style": "Style",
       "length": "Length",
       "autoReview": "Auto-Review Rounds",
       "maxSearch": "Max Search Queries"
     },
     "AIModels": { "title": "AI Models", "providers": { ... } },
     "SearchTab": { "title": "Search", ... },
     "Advanced": {
       "description": "Override default prompt templates. Leave empty to use defaults.",
       "prompts": { "system": "System", "clarify": "Clarify", "plan": "Plan", "serpQueries": "SERP Queries", "analyze": "Analyze", "review": "Review", "report": "Report", "outputGuidelines": "Output Guidelines" },
       "resetAll": "Reset All Settings",
       "resetDesc": "Restores all settings and overrides to factory defaults"
     },
     "History": {
       "title": "Research History",
       "description": "Browse, search, and manage your past research sessions.",
       "filters": { "all": "All", "completed": "Completed", "failed": "Failed" },
       "searchPlaceholder": "Search sessions...",
       "emptyNoSessions": "No research sessions yet.",
       "emptyNoMatch": "No sessions match your filter.",
       "sessionsCount": "{count} sessions",
       "thisWeek": "{count} this week",
       "sourcesCount": "{count} sources",
       "view": "View",
       "confirm": "Confirm",
       "cancel": "Cancel"
     },
     "Knowledge": {
       "title": "Knowledge Base",
       "description": "Upload files and URLs to build your research knowledge base.",
       "tabs": { "files": "Files", "urls": "URLs", "library": "Library" }
     },
     "KnowledgeList": {
       "emptyTitle": "No documents yet",
       "emptyDesc": "Upload files or add URLs to build your knowledge base.",
       "justNow": "just now",
       "minutesAgo": "{count}m ago",
       "hoursAgo": "{count}h ago",
       "daysAgo": "{count}d ago"
     },
     "FileUpload": {
       "dragDrop": "Drag & drop files here, or click to browse",
       "supportedFormats": "PDF, Office, Text, Code files supported"
     },
     "UrlCrawler": {
       "urlLabel": "URL",
       "urlPlaceholder": "https://example.com/article",
       "crawlerLabel": "Crawler",
       "crawl": "Crawl",
       "enterUrl": "Please enter a URL",
       "invalidUrl": "Please enter a valid HTTP or HTTPS URL"
     },
     "Workflow": {
       "steps": { "topic": "TOPIC", "questions": "QUESTIONS", "research": "RESEARCH", "analyze": "ANALYZE", "review": "REVIEW", "report": "REPORT" }
     }
   }
   ```
   Fill in ALL keys with English strings matching current hardcoded values.

4. **Create `messages/vi.json`** — Vietnamese translations. Same structure as en.json. Translate all values to Vietnamese. For technical terms and proper nouns (e.g., "Deep Research", "GitHub"), keep them in English. Prompt override labels ("System", "Clarify", etc.) can stay in English since they're developer-facing.

5. **Modify `next.config.ts`** — import `createNextIntlPlugin` from `next-intl/plugin`. Wrap AFTER Serwist: `const withSerwist = withSerwistInit({...}); const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts"); export default withSerwist(withNextIntl(nextConfig));`. The inner wrapper (next-intl) runs first, the outer (Serwist) wraps the result.

6. **Modify `src/app/layout.tsx`** — import `getMessages` from `next-intl/server`. In the RootLayout function, call `const messages = await getMessages()` and pass them to Providers via a prop. Update `<html lang={locale}>` to read locale dynamically.

7. **Modify `src/app/providers.tsx`** — accept `messages` and `locale` props. Import `NextIntlClientProvider` from `next-intl`. Wrap `{children}` with `<NextIntlClientProvider messages={messages} locale={locale}>`.

8. **Modify `src/stores/settings-store.ts`** — add `uiLocale: "en"` field with default. Add `setUiLocale` action. When `setUiLocale` is called, also set the `NEXT_LOCALE` cookie via `document.cookie = "NEXT_LOCALE=" + locale + ";path=/;max-age=31536000"`. Add to Zod schema and persist settings.

9. **Modify `src/components/settings/GeneralTab.tsx`** — add a "UI Language" section with a dropdown/select offering "English" and "Tiếng Việt". When changed, call `setUiLocale(value)` which triggers the cookie set. Replace all hardcoded strings with `useTranslations("General")` calls.

10. **Replace hardcoded strings in all component files** — for each component, add `import { useTranslations } from "next-intl"`, call `const t = useTranslations("Namespace")`, and replace hardcoded strings with `t("key")`. Component-to-namespace mapping:
    - `Header.tsx` → `"Header"` (6 strings: appName, hub, report, knowledge, history, settings, github)
    - `ActiveResearchCenter.tsx` → `"Research"` (step labels, idleText, streaming)
    - `TopicInput.tsx` → `"TopicInput"` (title, subtitle, placeholder, framework labels, button text, help text)
    - `ReportConfig.tsx` → `"ReportConfig"` (style/length labels, descriptions, local-only labels)
    - `WorkflowProgress.tsx` → `"Workflow"` (step labels)
    - `FinalReport.tsx` → `"Report"` (contents, sources, date, verified, processTime, reportComplete, buttons, noReport)
    - `SettingsDialog.tsx` → `"Settings"` (tab labels)
    - `AIModelsTab.tsx` → `"AIModels"` (provider names and labels)
    - `SearchTab.tsx` → `"SearchTab"` (provider names, placeholders)
    - `AdvancedTab.tsx` → `"Advanced"` (prompt labels, reset button)
    - `HistoryDialog.tsx` → `"History"` (title, filters, empty states, stats, buttons)
    - `KnowledgeDialog.tsx` → `"Knowledge"` (tab labels)
    - `KnowledgeList.tsx` → `"KnowledgeList"` (empty state, time strings)
    - `FileUpload.tsx` → `"FileUpload"` (upload prompt text)
    - `UrlCrawler.tsx` → `"UrlCrawler"` (labels, error messages)

    **Important**: For OptionButton in GeneralTab and ReportConfig, the label/desc are passed as props from data arrays. These arrays should use `t()` for the display strings.

11. **Verify**: `pnpm build` succeeds (next-intl plugin integration works), `pnpm test` passes (498+ tests)

## Must-Haves

- [ ] `src/i18n/request.ts` created with `getRequestConfig()` reading locale from `NEXT_LOCALE` cookie, defaulting to "en"
- [ ] `messages/en.json` created with all ~77 UI strings organized by component namespace
- [ ] `messages/vi.json` created with Vietnamese translations for all keys
- [ ] `next.config.ts` composes `withSerwist(withNextIntl(nextConfig))` — Serwist outer, next-intl inner
- [ ] `src/app/providers.tsx` wraps children with `NextIntlClientProvider` passing messages and locale
- [ ] `src/stores/settings-store.ts` has `uiLocale` field with cookie sync on change
- [ ] `src/components/settings/GeneralTab.tsx` has UI language selector (English / Tiếng Việt)
- [ ] All 15 component files use `useTranslations()` instead of hardcoded strings
- [ ] `pnpm build` succeeds — no TypeScript errors from i18n integration
- [ ] `pnpm test` passes — all 498+ existing tests green
- [ ] Lazy loading works — `messages/en.json` and `messages/vi.json` are dynamically imported via `getRequestConfig`

## Verification

- `pnpm build` — confirms next-intl plugin and all component changes compile
- `pnpm test` — all 498+ tests pass
- `grep -r 'useTranslations' src/components/ | wc -l` returns 15+ (one per component file)
- `diff <(jq -r 'keys | sort[]' messages/en.json) <(jq -r 'keys | sort[]' messages/vi.json)` — same namespaces in both locale files

## Inputs

- `src/app/layout.tsx` — root layout to add getMessages() and locale prop
- `src/app/providers.tsx` — client providers to wrap with NextIntlClientProvider
- `next.config.ts` — already wrapped with Serwist (from T01), add next-intl wrapper inside
- `src/stores/settings-store.ts` — add uiLocale field
- `src/components/settings/GeneralTab.tsx` — add UI language selector, replace strings
- `src/components/Header.tsx` — replace 6 hardcoded strings
- `src/components/research/ActiveResearchCenter.tsx` — replace step labels + idle text
- `src/components/research/FinalReport.tsx` — replace ~12 strings
- `src/components/research/TopicInput.tsx` — replace ~10 strings
- `src/components/research/ReportConfig.tsx` — replace ~14 strings
- `src/components/research/WorkflowProgress.tsx` — replace 6 step labels
- `src/components/settings/SettingsDialog.tsx` — replace 3 tab labels
- `src/components/settings/AIModelsTab.tsx` — replace ~6 provider labels
- `src/components/settings/SearchTab.tsx` — replace ~7 provider labels
- `src/components/settings/AdvancedTab.tsx` — replace ~7 prompt labels
- `src/components/settings/HistoryDialog.tsx` — replace ~12 strings
- `src/components/knowledge/KnowledgeDialog.tsx` — replace 2 tab labels
- `src/components/knowledge/KnowledgeList.tsx` — replace ~3 strings
- `src/components/knowledge/FileUpload.tsx` — replace ~2 strings
- `src/components/knowledge/UrlCrawler.tsx` — replace ~5 strings
- `src/engine/research/prompts.ts` — reference only (don't modify — language field already wired)

## Expected Output

- `src/i18n/request.ts` — next-intl request config with cookie-based locale and dynamic message import
- `messages/en.json` — complete English translation file (~77 keys across 15 namespaces)
- `messages/vi.json` — complete Vietnamese translation file
- `src/app/layout.tsx` — getMessages() call, locale prop, dynamic html lang
- `src/app/providers.tsx` — NextIntlClientProvider wrapping children
- `next.config.ts` — withSerwist(withNextIntl(nextConfig)) composition
- `src/stores/settings-store.ts` — uiLocale field with cookie sync
- `src/components/settings/GeneralTab.tsx` — UI language selector + translated strings
- `src/components/Header.tsx` — useTranslations("Header")
- `src/components/research/ActiveResearchCenter.tsx` — useTranslations("Research")
- `src/components/research/FinalReport.tsx` — useTranslations("Report")
- `src/components/research/TopicInput.tsx` — useTranslations("TopicInput")
- `src/components/research/ReportConfig.tsx` — useTranslations("ReportConfig")
- `src/components/research/WorkflowProgress.tsx` — useTranslations("Workflow")
- `src/components/settings/SettingsDialog.tsx` — useTranslations("Settings")
- `src/components/settings/AIModelsTab.tsx` — useTranslations("AIModels")
- `src/components/settings/SearchTab.tsx` — useTranslations("SearchTab")
- `src/components/settings/AdvancedTab.tsx` — useTranslations("Advanced")
- `src/components/settings/HistoryDialog.tsx` — useTranslations("History")
- `src/components/knowledge/KnowledgeDialog.tsx` — useTranslations("Knowledge")
- `src/components/knowledge/KnowledgeList.tsx` — useTranslations("KnowledgeList")
- `src/components/knowledge/FileUpload.tsx` — useTranslations("FileUpload")
- `src/components/knowledge/UrlCrawler.tsx` — useTranslations("UrlCrawler")
