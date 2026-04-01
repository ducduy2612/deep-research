---
id: S07
parent: M001
milestone: M001
provides:
  - KnowledgeItem type with Zod validation for downstream consumers
  - knowledge-store with CRUD, FIFO quota, Fuse.js search, localforage persistence
  - Two API routes for file parsing and URL crawling
  - KnowledgeDialog UI with Files/URLs/Library tabs
  - localOnly mode flag in settings store and SSE request body
  - knowledgeContent array in SSE request body for research integration
requires:
  - slice: S06
    provides: Settings store pattern, localforage persistence pattern, Dialog pattern, barrel export convention
affects:
  - S08 — CORS Proxy Mode (may need knowledge API routes in proxy mode)
  - S09 — PWA, i18n, and Polish (knowledge UI may need i18n strings)
key_files:
  - src/engine/knowledge/types.ts
  - src/engine/knowledge/file-parser.ts
  - src/engine/knowledge/chunker.ts
  - src/engine/knowledge/url-crawler.ts
  - src/engine/knowledge/index.ts
  - src/app/api/knowledge/parse/route.ts
  - src/app/api/knowledge/crawl/route.ts
  - src/stores/knowledge-store.ts
  - src/components/knowledge/KnowledgeDialog.tsx
  - src/components/knowledge/FileUpload.tsx
  - src/components/knowledge/UrlCrawler.tsx
  - src/components/knowledge/KnowledgeList.tsx
  - src/components/Header.tsx
  - src/app/page.tsx
  - src/components/research/ReportConfig.tsx
  - src/hooks/use-research.ts
  - src/stores/ui-store.ts
  - src/stores/settings-store.ts
key_decisions:
  - Server-side file processing via API routes to avoid browser compatibility issues with officeparser and pdfjs-dist
  - Added officeparser/pdfjs-dist to serverExternalPackages in next.config.ts for ESM bundling compatibility
  - Fuse.js index rebuilt per-search rather than cached — simpler, no stale-index bugs, negligible cost at 200 items
  - Lazy dynamic import of knowledge-store in use-research.ts to avoid fuse.js breaking jsdom tests
  - KB-06 AI rewriting deferred — basic text extraction sufficient for most documents
  - Sequential file processing in FileUpload to avoid server overload on multi-file drops
patterns_established:
  - Knowledge engine pure-logic module separated from UI (same pattern as search providers and research engine)
  - Server-side file parsing API routes with Zod validation matching existing route patterns
  - Knowledge store following same Zustand + localforage + Zod pattern as history-store and settings-store
  - Manual overlay dialog pattern (matching SettingsDialog) for KnowledgeDialog with glassmorphism
  - Lazy dynamic import for heavy store dependencies to avoid test environment conflicts
observability_surfaces:
  - Toast notifications for file upload/crawl success/failure
  - Progress indication during file parsing
  - Sonner toasts for error feedback from API routes
drill_down_paths:
  - milestones/M001/slices/S07/tasks/T01-SUMMARY.md
  - milestones/M001/slices/S07/tasks/T02-SUMMARY.md
  - milestones/M001/slices/S07/tasks/T03-SUMMARY.md
  - milestones/M001/slices/S07/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T21:38:04.362Z
blocker_discovered: false
---

# S07: Knowledge Base

**Built complete Knowledge Base subsystem with file upload/parsing (PDF, Office, text), URL crawling (Jina/Local), Zustand store with IndexedDB persistence and Fuse.js search, tabbed KnowledgeDialog UI, and local-only research mode integration.**

## What Happened

Slice S07 delivered the full Knowledge Base subsystem across 4 tasks:

**T01 — Knowledge Engine Module:** Built the pure-logic layer with type definitions (Zod 4 schemas for KnowledgeItem, KnowledgeContent, CrawlResult), file parsing pipeline routing by MIME type to pdfjs-dist (PDF), officeparser v6 (Office documents), or FileReader (plain text), content chunker with 10K char boundaries and 500-char overlap, URL crawlers (Jina Reader API + local server-side fetcher), and two API routes (/api/knowledge/parse, /api/knowledge/crawl) with Zod validation. Key adaptation: added officeparser/pdfjs-dist to serverExternalPackages for ESM bundling compatibility. 34 new tests.

**T02 — Knowledge Store:** Built Zustand store with localforage persistence, Zod validation, FIFO quota (200 items), Fuse.js fuzzy search over title and content fields. Rebuilds Fuse index per-search call for simplicity. Barrel exported and hydrated in providers.tsx. 24 tests.

**T03 — Knowledge UI Components:** Built 4 components following Obsidian Deep design system: FileUpload (drag-and-drop, sequential processing, type validation), UrlCrawler (URL input with Jina/Local selector), KnowledgeList (searchable list with delete), KnowledgeDialog (tabbed container with glassmorphism overlay). All under 300 lines. Added "knowledge" to DialogType union.

**T04 — App Integration:** Wired everything together — Knowledge button in Header, KnowledgeDialog in page.tsx, local-only mode toggle in ReportConfig with shadcn Switch, extended SSE request body with knowledge content and localOnly flag. Fixed pre-existing pnpm dual-React test issue with .npmrc hoist patterns and vitest config aliases. Lazy-loaded knowledge store to avoid fuse.js test conflicts. 3 integration tests.

Final state: 439 tests across 21 files, clean production build with both API routes registered.

## Verification

- All 439 tests pass across 21 test files (34 knowledge engine + 24 store + 3 integration + 378 existing)
- Production build succeeds cleanly with /api/knowledge/parse and /api/knowledge/crawl routes registered
- All 4 UI components under 300 lines (FileUpload: 183, UrlCrawler: 167, KnowledgeList: 199, KnowledgeDialog: 104)
- Knowledge store: 161 lines, under 300-line limit
- Knowledge engine module: 520 lines across 5 source files
- API routes validate input with Zod and return structured error responses

## Requirements Advanced

- KB-01 — PDF parsing via pdfjs-dist in server-side API route, FileUpload drag-and-drop, 16 file-parser tests
- KB-02 — Office parsing via officeparser v6 in server-side API route, supports all required formats
- KB-03 — Plain text parsing (TXT, JSON, XML, YAML, CSV, MD, code) via FileReader in file-parser
- KB-04 — URL crawling via Jina Reader API and local server-side fetcher, UrlCrawler component with selector
- KB-05 — Local-only mode toggle in ReportConfig with Switch, persisted setting, SSE flag, amber badge
- KB-06 — 10K char chunking with 500-char overlap implemented. AI rewriting deferred per D002 decision.

## Requirements Validated

- KB-01 — 34 knowledge engine tests + production build with /api/knowledge/parse route
- KB-02 — officeparser v6 integration tested in file-parser tests
- KB-03 — FileReader text parsing tested with multiple MIME types
- KB-04 — 9 url-crawler tests + /api/knowledge/crawl route in production build
- KB-05 — 3 integration tests in use-research.test.ts + Switch component in ReportConfig

## New Requirements Surfaced

- KB-06 AI rewriting of non-plain-text content deferred — basic chunking implemented, AI rewriting future enhancement

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All tasks delivered as planned with minor ordering adjustments (DialogType added in T03 instead of T04, which was a natural dependency).

## Known Limitations

PDF parsing has no built-in timeout — very large/corrupt PDFs could hang the parse route. Should add request timeout middleware in production. KB-06 AI rewriting of non-plain-text content deferred per D002 decision — basic text extraction produces clean enough content for most documents.

## Follow-ups

- Add request timeout middleware to /api/knowledge/parse for large PDF protection
- Implement AI-based content rewriting for non-plain-text documents when user feedback indicates quality issues
- Consider streaming progress updates during file parsing for large documents

## Files Created/Modified

- `src/engine/knowledge/types.ts` — Zod 4 schemas for KnowledgeItem, KnowledgeContent, CrawlResult, ParsedDocument
- `src/engine/knowledge/file-parser.ts` — File parsing pipeline routing by MIME type to pdfjs-dist, officeparser, or FileReader
- `src/engine/knowledge/chunker.ts` — Content chunker with 10K char boundaries, 500-char overlap, paragraph-aware splitting
- `src/engine/knowledge/url-crawler.ts` — URL crawlers for Jina Reader API and local server-side fetch with timeout
- `src/engine/knowledge/index.ts` — Barrel export for knowledge engine module
- `src/app/api/knowledge/parse/route.ts` — POST API route for server-side file parsing with Zod validation
- `src/app/api/knowledge/crawl/route.ts` — POST API route for URL crawling with Jina/Local selector
- `src/stores/knowledge-store.ts` — Zustand store with localforage persistence, Zod validation, FIFO quota, Fuse.js search
- `src/stores/index.ts` — Added knowledge store barrel export
- `src/app/providers.tsx` — Added knowledge store hydration on mount
- `src/components/knowledge/KnowledgeDialog.tsx` — Tabbed dialog with Files/URLs/Library tabs, glassmorphism overlay
- `src/components/knowledge/FileUpload.tsx` — Drag-and-drop file upload with type validation and sequential processing
- `src/components/knowledge/UrlCrawler.tsx` — URL input with Jina/Local crawler selector
- `src/components/knowledge/KnowledgeList.tsx` — Searchable knowledge item list with delete and preview
- `src/stores/ui-store.ts` — Added 'knowledge' to DialogType union
- `src/components/Header.tsx` — Added Knowledge NavButton with Database icon
- `src/app/page.tsx` — Mounted KnowledgeDialog
- `src/components/research/ReportConfig.tsx` — Added local-only mode toggle with Switch and amber badge
- `src/stores/settings-store.ts` — Added localOnlyMode and selectedKnowledgeIds fields
- `src/hooks/use-research.ts` — Extended SSE request with knowledgeContent and localOnly flag, lazy-loaded knowledge store
