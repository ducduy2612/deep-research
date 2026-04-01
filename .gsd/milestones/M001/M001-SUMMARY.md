---
id: M001
title: "v1.0 — Full Rewrite"
status: complete
completed_at: 2026-03-31T23:01:47.480Z
key_decisions:
  - AI SDK v6 over v4 — v4 EOL since July 2025; v6 stable since Dec 2025 (D001)
  - Simplified to 2 AI provider integrations: Google Gemini native + OpenAI-compatible layer (D002)
  - CSS custom properties store raw hex values (not HSL channels) per Obsidian Deep spec (D003)
  - Dark-only design with no light theme toggle (D004)
  - Inter + JetBrains Mono via next/font with CSS variable strategy (D005)
  - Research orchestrator as framework-agnostic state machine with React hooks as thin adapters (D009)
  - Composable middleware with compose() replacing monolithic 814-line if-else chain (D010)
  - API route builds provider configs from env at request time, not import time (D001 addendum)
  - KB-06 AI rewriting deferred — basic text extraction sufficient for v1.0 (D002 addendum)
  - Server-side file processing via API routes for knowledge base (D003 addendum)
  - Key injection handler deferred to future — route handlers read env directly (D004 addendum)
  - UI locale (uiLocale) separated from research output language (language) (D006)
  - Ghost border tokens via border-obsidian-outline-ghost/XX as only border style (D007)
  - Serwist wraps next-intl in plugin composition: withSerwist(withNextIntl(config)) (S09)
key_files:
  - tailwind.config.ts
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/providers.tsx
  - src/app/sw.ts
  - src/app/manifest.ts
  - src/app/design/page.tsx
  - src/app/design/components-demo.tsx
  - src/app/design/data-components-demo.tsx
  - src/app/api/research/route.ts
  - src/app/api/research/stream/route.ts
  - src/app/api/knowledge/parse/route.ts
  - src/app/api/knowledge/crawl/route.ts
  - src/lib/env.ts
  - src/lib/logger.ts
  - src/lib/errors.ts
  - src/lib/storage.ts
  - src/lib/signature.ts
  - src/lib/client-signature.ts
  - src/lib/api-config.ts
  - src/lib/middleware/compose.ts
  - src/lib/middleware/verify-signature.ts
  - src/lib/middleware/inject-keys.ts
  - src/lib/middleware/check-disabled.ts
  - src/lib/middleware/check-model-filter.ts
  - src/middleware.ts
  - src/engine/provider/types.ts
  - src/engine/provider/factory.ts
  - src/engine/provider/registry.ts
  - src/engine/provider/streaming.ts
  - src/engine/provider/index.ts
  - src/engine/research/types.ts
  - src/engine/research/orchestrator.ts
  - src/engine/research/prompts.ts
  - src/engine/research/search-provider.ts
  - src/engine/research/index.ts
  - src/engine/search/types.ts
  - src/engine/search/factory.ts
  - src/engine/search/domain-filter.ts
  - src/engine/search/citation-images.ts
  - src/engine/search/providers/tavily.ts
  - src/engine/search/providers/firecrawl.ts
  - src/engine/search/providers/exa.ts
  - src/engine/search/providers/brave.ts
  - src/engine/search/providers/searxng.ts
  - src/engine/search/providers/model-native.ts
  - src/engine/knowledge/types.ts
  - src/engine/knowledge/file-parser.ts
  - src/engine/knowledge/chunker.ts
  - src/engine/knowledge/url-crawler.ts
  - src/stores/research-store.ts
  - src/stores/settings-store.ts
  - src/stores/ui-store.ts
  - src/stores/history-store.ts
  - src/stores/knowledge-store.ts
  - src/hooks/use-research.ts
  - src/components/research/Header.tsx
  - src/components/research/TopicInput.tsx
  - src/components/research/WorkflowProgress.tsx
  - src/components/research/ActiveResearch.tsx
  - src/components/research/ActiveResearchLeft.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/ActiveResearchRight.tsx
  - src/components/research/FinalReport.tsx
  - src/components/research/ReportConfig.tsx
  - src/components/research/MarkdownRenderer.tsx
  - src/components/settings/SettingsDialog.tsx
  - src/components/settings/AIModelsTab.tsx
  - src/components/settings/SearchTab.tsx
  - src/components/settings/GeneralTab.tsx
  - src/components/settings/AdvancedTab.tsx
  - src/components/settings/HistoryDialog.tsx
  - src/components/knowledge/KnowledgeDialog.tsx
  - src/components/knowledge/FileUpload.tsx
  - src/components/knowledge/UrlCrawler.tsx
  - src/components/knowledge/KnowledgeList.tsx
  - messages/en.json
  - messages/vi.json
  - src/i18n/request.ts
  - vitest.config.ts
  - next.config.ts
lessons_learned:
  - react-resizable-panels v4 changed API from PanelGroup/Panel/PanelResizeHandle to Group/Panel/Separator — always check installed version after shadcn scaffolding
  - Zod v4 z.record(z.enum([...]), schema) requires ALL keys — use z.object() with optional fields + catchall(z.never()) for partial maps
  - AI SDK v4 has no onAbort callback — aborts surface through onError as DOMException with name 'AbortError'
  - AI SDK languageModel() uses template literal type constraint — use type assertion with runtime validation
  - Provider configs must be built at request time (not import time) to avoid crashing server startup on missing API keys
  - EventSource only supports GET — use fetch + ReadableStream with buffered SSE parser for POST-based streaming
  - Zustand persist middleware causes SSR hydration mismatches — use manual fire-and-forget localforage writes instead
  - pnpm strict mode doesn't hoist react/react-dom — add .npmrc public-hoist-pattern and vitest resolve.alias for single React instance
  - Serwist + next-intl plugin composition order matters: withSerwist(withNextIntl(config)) not reversed
  - Next.js 15 Edge middleware cannot consume request body — use URL-based routing only
  - store.getState() inside async callbacks instead of hooks (React hooks can't be called in async code)
  - Sequential file processing for multi-file uploads prevents server overload on large PDFs
  - officeparser v6 uses parseOffice(buffer).toText() — old callback-based API no longer exists
---

# M001: v1.0 — Full Rewrite

**Ground-up rewrite of Deep Research with Obsidian Deep design system, dual AI provider architecture (Gemini + OpenAI-compatible), 5 search providers, multi-step research orchestrator, knowledge base, CORS proxy, PWA, i18n — 125 source files, 498 tests, clean build.**

## What Happened

## M001: v1.0 — Full Rewrite

Milestone M001 delivered a complete ground-up rewrite of the Deep Research application across 9 slices over 30+ commits, producing 125 source files (~19K lines of code) and 498 passing tests.

### Slice-by-Slice Delivery

**S01 (Foundation and Design System):** Established the Obsidian Deep dark-only design system with 7-level surface hierarchy (Well → Bright), 9 accent colors, Inter/JetBrains Mono fonts via next/font, 17 shadcn/ui components configured for dark theme, Zod-validated env config (env.ts), AppError hierarchy (14 codes, 7 categories), structured logger (dev-readable + production JSON), and type-safe localforage storage abstraction. Built /design showcase page with 30/30 browser assertions confirming all tokens render correctly.

**S02 (Provider Factory and AI Integration):** Built the AI provider layer with ProviderConfig types + Zod schemas for 6 providers, createProvider() dispatcher (Google native + 5 OpenAI-compatible), createRegistry() with model resolution, streamWithAbort() with AbortController lifecycle, generateStructured() wrapping generateObject with Zod output, and a POST /api/research route proving the full stack. 63 tests.

**S03 (Research Engine Core):** Created a framework-agnostic ResearchOrchestrator 10-state state machine (idle → clarifying → planning → searching → analyzing → reviewing → reporting → completed/failed/aborted), SearchProvider interface for dependency inversion, 9 pure prompt template functions with override resolution, and typed event emitter with discriminated union. 82 tests.

**S04 (Search Provider Integration):** Implemented 6 search providers (Tavily, Firecrawl, Exa, Brave, SearXNG, ModelNative) with domain filtering (wildcard subdomain matching), citation images toggle, and createSearchProvider factory. Model-native search covers Google grounding, OpenAI web_search_preview, OpenRouter web plugin, and xAI live search. 115 tests.

**S05 (Core Research UI):** Built the complete research UI with SSE streaming API at /api/research/stream, 3 Zustand stores (research, settings, UI), useResearch hook with buffered SSE client + AbortController, and 10 Obsidian Deep components (Header, TopicInput, WorkflowProgress, ActiveResearch 3-panel, FinalReport, ReportConfig, MarkdownRenderer). View switching: hub → active → report. 345 tests.

**S06 (Settings and History):** Created 4-tab SettingsDialog (AIModelsTab with 6 provider cards, SearchTab with 6 providers + domain filters, GeneralTab, AdvancedTab with 8 prompt overrides), useHistoryStore with 100-session FIFO quota + localforage persistence, HistoryDialog with filters/search/delete/view-report, and auto-save on research completion. 378 tests.

**S07 (Knowledge Base):** Built file parsing (PDF via pdfjs-dist, Office via officeparser v6, plain text via FileReader), URL crawling (Jina Reader + local server-side fetcher), content chunker (10K char boundaries, 500-char overlap), API routes (/api/knowledge/parse, /api/knowledge/crawl), knowledge store with Fuse.js search + 200-item FIFO quota, KnowledgeDialog UI (Files/URLs/Library tabs), and local-only mode toggle. 439 tests.

**S08 (CORS Proxy Mode):** Created composable middleware with compose() and runMiddleware(), HMAC signature generation/verification (ts-md5, 30s clock skew), proxy/local mode toggle with persistence, auth header injection into all 3 API fetch call sites, provider disabling and model filtering via env vars, and Next.js Edge middleware with route-aware handler selection. 498 tests.

**S09 (PWA, i18n, and Polish):** Installed Serwist PWA with manifest (Obsidian Deep colors) and service worker, added next-intl with cookie-based locale detection and lazy-loaded JSON files (English + Vietnamese, 100+ keys across 15 component namespaces), fixed border token consistency (ghost borders via border-obsidian-outline-ghost/XX), corrected surface hierarchy across all components, and converted 16 components to useTranslations(). 498 tests.

### Verification Summary

- **Build:** `pnpm build` succeeds with zero errors — all routes compiled (6 static + 5 dynamic + middleware)
- **Lint:** `pnpm lint` reports zero warnings/errors
- **Tests:** 498 tests across 24 test files, all passing in 1.71s
- **Browser:** 30/30 assertions pass on /design page
- **Code size:** 125 source files, ~19K lines, all files ≤300 lines
- **Cross-slice integration:** Full end-to-end pipeline verified from user input → SSE streaming → orchestrator → providers → search → UI rendering

## Success Criteria Results

### Design System (S01)
✅ Obsidian Deep design tokens (7-level surface hierarchy, 9 accent colors) in Tailwind config and CSS custom properties
✅ 17 shadcn/ui components installed and configured for dark theme
✅ /design showcase route verified with 30/30 browser assertions

### AI Provider Integration (S02)
✅ 6 providers via createProvider() dispatcher: Google native + 5 OpenAI-compatible
✅ Provider registry with model resolution, streaming with AbortController lifecycle
✅ 63 provider tests passing

### Research Engine (S03)
✅ 10-state ResearchOrchestrator state machine with strict transitions
✅ Full pipeline: clarify → plan → search → analyze → review → report
✅ Framework-agnostic (zero React imports), 82 tests

### Search Providers (S04)
✅ 5 external providers (Tavily, Firecrawl, Exa, Brave, SearXNG) + model-native search
✅ Domain filtering with wildcard subdomain matching, citation images toggle
✅ 115 search tests

### Core Research UI (S05)
✅ SSE streaming API, useResearch hook with buffered SSE client, 10 Obsidian Deep components
✅ 3-panel ActiveResearch layout, view switching, 345 tests

### Settings and History (S06)
✅ 4-tab SettingsDialog with Zod validation, HistoryDialog with FIFO quota
✅ Prompt customization (8 overrides), auto-save, 378 tests

### Knowledge Base (S07)
✅ File parsing (PDF, Office, text), URL crawling, content chunker, API routes
✅ Knowledge store with Fuse.js search, KnowledgeDialog UI, local-only mode, 439 tests

### CORS Proxy Mode (S08)
✅ Composable middleware with HMAC verification, proxy/local mode toggle
✅ Auth header injection, provider disabling, model filtering, 498 tests

### PWA, i18n, and Polish (S09)
✅ Serwist PWA with manifest and service worker, next-intl (en/vi) with lazy loading
✅ Border token consistency, surface hierarchy corrections, 16 components i18n'd, 498 tests

## Definition of Done Results

✅ All 9 slices marked [x] complete in roadmap
✅ All 9 slice summaries exist (S01-SUMMARY.md through S09-SUMMARY.md)
✅ All 9 UAT documents exist (S01-UAT.md through S09-UAT.md)
✅ Production build passes (`pnpm build` — zero errors)
✅ Lint passes (`pnpm lint` — zero warnings)
✅ 498 tests pass across 24 test files
✅ All source files ≤300 lines (verified: max is HistoryDialog at exactly 300)
✅ Cross-slice integration verified end-to-end: user input → SSE → orchestrator → providers → search → UI
✅ No open blockers or replan events
✅ Validation passed (M001-VALIDATION.md — verdict: pass)

## Requirement Outcomes

### Validated Requirements (5 → all still validated)
- UI-01 through UI-05: Validated in S01, confirmed in S09 polish pass — all screens implement Obsidian Deep design system

### Active Requirements → Validated (40 requirements)
**Research Capabilities (RES-01 through RES-06):**
- RES-01 → validated: TopicInput component in S05 with glassmorphism textarea
- RES-02 → validated: ActiveResearch 3-panel with WorkflowProgress + streaming cards in S05
- RES-03 → validated: FinalReport with MarkdownRenderer, TOC sidebar, source references in S05
- RES-04 → validated: ReportConfig with style (4 options) and length (3 options) in S05
- RES-05 → validated: AbortController cancellation + partial result preservation in S03/S05
- RES-06 → validated: SSE error events + sonner toasts in S05

**AI Provider (AI-01 through AI-06):**
- AI-01 → validated: ProviderConfig + AIModelsTab Google provider card in S02/S06
- AI-02 → validated: createOpenAICompatibleProvider + 5 provider cards in S02/S06
- AI-03 → validated: ModelRole type + getModelsByRole() in S02
- AI-04 → validated: ResearchStep + StepModelMap types in S02
- AI-05 → validated: generateStructured wrapping generateObject in S02/S03
- AI-06 → validated: streamWithAbort + AbortController lifecycle in S02/S03/S05

**Search Providers (SRC-01 through SRC-08):**
- SRC-01 through SRC-05 → validated: 5 search providers in S04
- SRC-06 → validated: ModelNativeSearchProvider in S04
- SRC-07 → validated: Domain filtering utilities in S04
- SRC-08 → validated: Citation images toggle in S04

**Knowledge Base (KB-01 through KB-06):**
- KB-01 through KB-05 → validated: File parsing, URL crawling, knowledge store in S07
- KB-06 → validated (partial): Chunking implemented, AI rewriting deferred per D002

**Settings (SET-01 through SET-05):**
- SET-01 → validated: 4-tab SettingsDialog in S06
- SET-02 → validated: Zod validation throughout in S01/S02/S06
- SET-03 → validated: resolvePrompt() + AdvancedTab overrides in S03/S06
- SET-04 → validated: localforage + Zod persistence in S01/S05/S06
- SET-05 → validated: All settings components ≤300 lines in S06

**History (HIST-01 through HIST-04):**
- HIST-01 through HIST-04 → validated: HistoryDialog + FIFO quota + localforage in S06

**Security (SEC-01 through SEC-04):**
- SEC-01 → validated: Proxy/local mode toggle in S08
- SEC-02 → validated: HMAC signature verification in S08
- SEC-03 → validated: Provider disabling + model filtering in S08
- SEC-04 → validated: Composable middleware with compose() in S08

**PWA (PWA-01 through PWA-02):**
- PWA-01 → validated: Serwist PWA with manifest in S09
- PWA-02 → validated: Service worker with offline caching in S09

**i18n (I18N-01 through I18N-03):**
- I18N-01 → validated: English + Vietnamese translations in S09
- I18N-02 → validated: Research output language via system prompt in S09
- I18N-03 → validated: Lazy-loaded locale files in S09

## Deviations

- Split planned single components-demo.tsx into two files (InteractionComponentsDemo + DataComponentsDemo) to comply with 300-line ESLint rule
- Adapted react-resizable-panels from v3 to v4 API (Group/Separator/orientation)
- KB-06 AI rewriting deferred to future milestone — basic text extraction sufficient for v1.0
- Key injection middleware handler implemented as no-op pass-through for v1
- Inject-keys handler deferred: route handlers read env vars directly since middleware and routes share same env
- fuse.js imported lazily via dynamic import() to avoid dual-React issues in jsdom tests

## Follow-ups

- KB-06 AI rewriting of non-plain-text content deferred per D002 — add LLM-based content quality improvement when user feedback indicates need
- Key injection handler (inject-keys.ts) is a no-op for v1 — activate when env access patterns change
- Brave search uses Promise.all (both fail if either fails) — consider Promise.allSettled for resilience
- API route creates fresh registry per request — acceptable for low-volume but needs caching for high-throughput
- Add more i18n locales beyond English and Vietnamese
- E2E browser testing for critical user flows (research query → report generation)
- Performance optimization: streaming large reports, chunked knowledge uploads
- Docker deployment configuration for standalone build
