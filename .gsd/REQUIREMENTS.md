# Requirements

## Active

## Validated

### UI-01 — All 6 screens implement Obsidian Deep design system (dark-only, tonal layering, no borders)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01 — Design tokens, Tailwind config, /design page with 30/30 browser assertions; M001-S09 — polish pass confirmed across all components

All 6 screens implement Obsidian Deep design system (dark-only, tonal layering, no borders)

### UI-02 — System uses surface hierarchy (Well → Deck → Sheet → Raised → Float) consistently across all components

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01 — 7 surface levels as swatches on /design page; M001-S09 — surface hierarchy corrections applied

System uses surface hierarchy (Well → Deck → Sheet → Raised → Float) consistently across all components

### UI-03 — Floating elements use glassmorphism (backdrop-blur, semi-transparent backgrounds)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01 — Glassmorphism demo with backdrop-blur(20px) + rgba(53,52,55,0.7); S05/S06 — glassmorphism dialogs

Floating elements use glassmorphism (backdrop-blur, semi-transparent backgrounds)

### UI-04 — Typography uses Inter for body and JetBrains Mono for code, with consistent spacing tokens

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01 — Inter + JetBrains Mono via next/font, CSS variable strategy, 4 typography roles demonstrated

Typography uses Inter for body and JetBrains Mono for code, with consistent spacing tokens

### UI-05 — No component file exceeds 300 lines

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01 through S09 — wc -l confirms all files under 300 lines (max: HistoryDialog at 300)

No component file exceeds 300 lines

### RES-01 — User can input a research topic via the Research Hub screen

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S05 — TopicInput component with glassmorphism textarea and Start Research button

User can input a research topic via the Research Hub screen

### RES-02 — User can watch real-time streaming progress of each research step (clarifying questions, report plan, search tasks, report generation)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S05 — ActiveResearch 3-panel layout with WorkflowProgress step indicator and streaming cards

User can watch real-time streaming progress of each research step (clarifying questions, report plan, search tasks, report generation)

### RES-03 — User receives a structured markdown final report with citations, source references, and optional images

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S05 — FinalReport with MarkdownRenderer, TOC sidebar, source references

User receives a structured markdown final report with citations, source references, and optional images

### RES-04 — User can configure report style (balanced, executive, technical, concise) and length (brief, standard, comprehensive)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S05 — ReportConfig with style (4 options) and length (3 options) selectors

User can configure report style (balanced, executive, technical, concise) and length (brief, standard, comprehensive)

### RES-05 — User can abort an in-progress research session and see partial results

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S03 — AbortController cancellation; M001-S05 — useResearch hook abort + partial result preservation

User can abort an in-progress research session and see partial results

### RES-06 — User receives clear error feedback when any research step fails (API limits, bad keys, network errors) with recovery options

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S05 — SSE error events + sonner toasts for all failure modes

User receives clear error feedback when any research step fails (API limits, bad keys, network errors) with recovery options

### AI-01 — User can configure Google Gemini provider with API key and select thinking/networking models

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S02 — ProviderConfig supports Google with apiKey + models; M001-S06 — AIModelsTab Google provider card

User can configure Google Gemini provider with API key and select thinking/networking models

### AI-02 — User can configure OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Groq, xAI) with API key, base URL, and model selection

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S02 — createOpenAICompatibleProvider handles 5 providers; M001-S06 — AIModelsTab 5 provider cards

User can configure OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Groq, xAI) with API key, base URL, and model selection

### AI-03 — User can assign separate thinking and networking models per provider (dual-model architecture)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S02 — ModelRole type + getModelsByRole() helper, 21 type tests pass

User can assign separate thinking and networking models per provider (dual-model architecture)

### AI-04 — User can customize which model is used at each step of the research workflow (clarify, plan, search, analyze, review, report)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S02 — ResearchStep + StepModelMap types for per-step model assignment

User can customize which model is used at each step of the research workflow (clarify, plan, search, analyze, review, report)

### AI-05 — System uses AI SDK structured output (`generateObject`) instead of raw JSON parsing for all structured AI responses

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S02 — generateStructured wrapping generateObject with Zod schema; M001-S03 — orchestrator usage

System uses AI SDK structured output (`generateObject`) instead of raw JSON parsing for all structured AI responses

### AI-06 — System properly cleans up AI streams on abort/unmount with AbortController to prevent memory leaks

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S02 — streamWithAbort with AbortController lifecycle; M001-S05 — useResearch AbortController cleanup

System properly cleans up AI streams on abort/unmount with AbortController to prevent memory leaks

### SRC-01 — User can configure and use Tavily as a search provider

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — TavilyProvider with Bearer auth, tested

User can configure and use Tavily as a search provider

### SRC-02 — User can configure and use Firecrawl as a search provider

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — FirecrawlProvider with markdown scrape, tested

User can configure and use Firecrawl as a search provider

### SRC-03 — User can configure and use Exa as a search provider

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — ExaProvider with text+summary content, tested

User can configure and use Exa as a search provider

### SRC-04 — User can configure and use Brave Search as a search provider

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — BraveProvider with dual web+image parallel requests, tested

User can configure and use Brave Search as a search provider

### SRC-05 — User can configure and use SearXNG as a self-hosted search provider

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — SearXNGProvider with score-based filtering, tested

User can configure and use SearXNG as a self-hosted search provider

### SRC-06 — System uses model-native search (Gemini grounding, OpenAI web_search_preview) when available for the selected provider

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — ModelNativeSearchProvider for Google, OpenAI, OpenRouter, xAI, tested

System uses model-native search (Gemini grounding, OpenAI web_search_preview) when available for the selected provider

### SRC-07 — User can restrict search to specific domains (include) or exclude domains with wildcard subdomain matching

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — domain-filter.ts with normalizeDomain, parseDomainList, matchDomain, isUrlAllowed, applyDomainFilters

User can restrict search to specific domains (include) or exclude domains with wildcard subdomain matching

### SRC-08 — User can toggle citation images to embed relevant images from search results into the final report

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S04 — citation-images.ts toggle, FilteringSearchProvider decorator in S05

User can toggle citation images to embed relevant images from search results into the final report

### KB-01 — User can upload PDF files and have them parsed via LLM-based OCR

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S07 — PDF parsing via pdfjs-dist in server-side API route

User can upload PDF files and have them parsed via LLM-based OCR

### KB-02 — User can upload Office documents (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) and have them parsed via officeparser

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S07 — officeparser v6 for Office documents, tested

User can upload Office documents (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) and have them parsed via officeparser

### KB-03 — User can upload plain text files (TXT, JSON, XML, YAML, code) and have them parsed

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S07 — FileReader for plain text formats, tested

User can upload plain text files (TXT, JSON, XML, YAML, code) and have them parsed

### KB-04 — User can crawl URLs for content via Jina Reader or local crawler

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S07 — Jina Reader + local server-side URL crawler, tested

User can crawl URLs for content via Jina Reader or local crawler

### KB-05 — User can toggle local-only mode to research using only uploaded knowledge base documents without web search

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S07 — Local-only mode toggle in ReportConfig with Switch and amber badge

User can toggle local-only mode to research using only uploaded knowledge base documents without web search

### KB-06 — System chunks uploaded content at 10K character boundaries and rewrites non-plain-text content via AI

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S07 — Chunker with 10K char boundaries and 500-char overlap implemented. AI rewriting deferred per D002 — basic text extraction sufficient for most documents.

System chunks uploaded content at 10K character boundaries and rewrites non-plain-text content via AI

### SET-01 — User can configure all settings through a tabbed settings dialog (AI Models, Search, Research Preferences, General, Advanced)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S06 — 4-tab SettingsDialog (AIModelsTab, SearchTab, GeneralTab, AdvancedTab)

User can configure all settings through a tabbed settings dialog (AI Models, Search, Research Preferences, General, Advanced)

### SET-02 — System validates all settings input via Zod schemas with clear error messages

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01/S02/S06 — env.ts, provider Zod schemas, all settings fields Zod-validated

System validates all settings input via Zod schemas with clear error messages

### SET-03 — User can override any prompt in the research pipeline (system instruction, questions, plan, SERP generation, review, report, rewriting)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S03 — resolvePrompt() override support; M001-S06 — AdvancedTab with 8 prompt override textareas

User can override any prompt in the research pipeline (system instruction, questions, plan, SERP generation, review, report, rewriting)

### SET-04 — Settings persist across sessions via localforage (IndexedDB)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S01 — storage.ts abstraction; M001-S05/S06 — settings store + history store with localforage + Zod

Settings persist across sessions via localforage (IndexedDB)

### SET-05 — Settings sub-components are each under 300 lines, replacing the monolithic settings component

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S06 — All 6 settings components verified ≤300 lines (max: HistoryDialog at 300)

Settings sub-components are each under 300 lines, replacing the monolithic settings component

### HIST-01 — User can view a list of past research sessions with topic, date, and status

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S06 — HistoryDialog with session cards, topic, date, status badges, source counts

User can view a list of past research sessions with topic, date, and status

### HIST-02 — User can open a past research session and view the full report and sources

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S06 — view-report action loads past session into research store

User can open a past research session and view the full report and sources

### HIST-03 — User can delete individual research sessions

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S06 — delete button with confirmation dialog

User can delete individual research sessions

### HIST-04 — System persists research sessions to localforage (IndexedDB) with quota management and cleanup policies

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S06 — useHistoryStore with 100-session FIFO quota, Zod validation, localforage persistence

System persists research sessions to localforage (IndexedDB) with quota management and cleanup policies

### SEC-01 — User can switch between local mode (browser calls APIs directly) and proxy mode (server-side API key injection)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S08 — Proxy/local mode toggle in GeneralTab with persistence

User can switch between local mode (browser calls APIs directly) and proxy mode (server-side API key injection)

### SEC-02 — Proxy mode verifies access via HMAC signature from configured access password

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S08 — HMAC signature generation/verification (ts-md5, 30s clock skew tolerance)

Proxy mode verifies access via HMAC signature from configured access password

### SEC-03 — Proxy mode supports provider disabling and model filtering via environment variables

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S08 — check-disabled and check-model-filter handlers

Proxy mode supports provider disabling and model filtering via environment variables

### SEC-04 — Middleware is decomposed into composable route handlers (replacing monolithic if-else chain)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S08 — compose() with 4 independent handlers, runMiddleware() entry point

Middleware is decomposed into composable route handlers (replacing monolithic if-else chain)

### PWA-01 — User can install the app as a PWA on desktop and mobile

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S09 — Serwist PWA with manifest (standalone display, Obsidian Deep colors), service worker

User can install the app as a PWA on desktop and mobile

### PWA-02 — Service worker caches assets for offline access via Serwist

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S09 — Service worker with defaultCache, skipWaiting, clientsClaim

Service worker caches assets for offline access via Serwist

### I18N-01 — User can switch UI language between English (en-US) and Vietnamese (vi-VN)

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S09 — next-intl with en/vi, useTranslations in 16 components, language selector in GeneralTab

User can switch UI language between English (en-US) and Vietnamese (vi-VN)

### I18N-02 — User can set research output language, which controls AI response language via system prompt

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S09 — uiLocale field separate from language field; language wired to system prompt

User can set research output language, which controls AI response language via system prompt

### I18N-03 — Locale files are lazy-loaded for performance

- Status: validated
- Class: core-capability
- Source: inferred
- Validation: M001-S09 — Lazy-loaded locale files via dynamic import() in getRequestConfig()

Locale files are lazy-loaded for performance

## Deferred

### KB-06-partial — AI rewriting of non-plain-text content for knowledge base

- Status: deferred
- Class: enhancement
- Source: M001-S07 decision D002
- Notes: Chunking implemented; AI rewriting deferred — basic text extraction sufficient for most documents. Revisit when user feedback indicates content quality issues.

AI rewriting of non-plain-text content deferred per D002 — basic text extraction sufficient for v1.0.

## Out of Scope
