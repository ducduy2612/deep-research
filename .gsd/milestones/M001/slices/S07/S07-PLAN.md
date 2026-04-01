# S07: Knowledge Base

**Goal:** Build the Knowledge Base subsystem: file upload and server-side parsing (PDF via pdfjs-dist, Office via officeparser, plain text via FileReader), URL crawling (Jina Reader + local server-side crawler), a Zustand knowledge store with localforage persistence and Fuse.js search, a KnowledgeDialog UI with file upload / URL crawl / library tabs, and integration into the research workflow including local-only mode toggle.
**Demo:** After this: File upload and parsing (PDF, Office, text), URL crawling, knowledge store with IndexedDB.

## Tasks
- [x] **T01: Built knowledge engine module with file parsing (text/PDF/Office), content chunking, URL crawling (Jina/local), and server-side API routes** — Create the knowledge engine module with all type definitions, file parsing pipeline, URL crawling, content chunking, and server-side API routes. Install officeparser, fuse.js, and pdfjs-dist packages. Build pure parser functions that handle PDF, Office documents, and plain text. Create API routes for server-side file parsing and URL crawling. Implement chunker that splits content at 10K char boundaries with 500-char overlap.
  - Estimate: 2h
  - Files: src/engine/knowledge/types.ts, src/engine/knowledge/file-parser.ts, src/engine/knowledge/chunker.ts, src/engine/knowledge/url-crawler.ts, src/engine/knowledge/index.ts, src/app/api/knowledge/parse/route.ts, src/app/api/knowledge/crawl/route.ts
  - Verify: pnpm vitest run src/engine/knowledge && pnpm build
- [x] **T02: Created knowledge Zustand store with localforage persistence, Zod validation, FIFO quota (200 items), Fuse.js fuzzy search, and wired into providers and barrel export** — Create the knowledge Zustand store following the established history-store pattern. Includes Zod-validated localforage persistence, FIFO quota (200 items), Fuse.js fuzzy search over titles and content, and CRUD operations (add, remove, update, getAll, search). Add barrel export to stores/index.ts. Add hydration to providers.tsx.
  - Estimate: 1h
  - Files: src/stores/knowledge-store.ts, src/stores/index.ts, src/app/providers.tsx
  - Verify: pnpm vitest run src/stores/__tests__/knowledge-store.test.ts && pnpm build
- [x] **T03: Built KnowledgeDialog with Files/URLs/Library tabs, drag-and-drop FileUpload, UrlCrawler with Jina/Local selector, and searchable KnowledgeList** — Build the Knowledge UI components following the Obsidian Deep design system and the established dialog patterns from SettingsDialog/HistoryDialog. Create KnowledgeDialog (tabbed container with Files, URLs, Library tabs), FileUpload (drag-and-drop with file type validation and progress), UrlCrawler (URL input with Jina/Local crawler selection), and KnowledgeList (searchable list with delete and add-to-research actions). All components must stay under 300 lines.
  - Estimate: 1.5h
  - Files: src/components/knowledge/KnowledgeDialog.tsx, src/components/knowledge/FileUpload.tsx, src/components/knowledge/UrlCrawler.tsx, src/components/knowledge/KnowledgeList.tsx
  - Verify: pnpm build && wc -l src/components/knowledge/*.tsx
- [x] **T04: Wired knowledge subsystem into main app: Header Knowledge button, KnowledgeDialog mounting, local-only mode toggle with Switch, and SSE request body with knowledge content** — Wire the knowledge subsystem into the main application. Add 'knowledge' to useUIStore DialogType. Add Knowledge button to Header.tsx. Mount KnowledgeDialog in page.tsx. Add local-only mode toggle to ReportConfig. Extend use-research.ts to include knowledge content and local-only flag in SSE request body. End-to-end verification that knowledge items can be created, persisted, and referenced in research.
  - Estimate: 1h
  - Files: src/stores/ui-store.ts, src/components/Header.tsx, src/app/page.tsx, src/components/research/ReportConfig.tsx, src/hooks/use-research.ts, src/stores/knowledge-store.ts
  - Verify: pnpm vitest run && pnpm build
