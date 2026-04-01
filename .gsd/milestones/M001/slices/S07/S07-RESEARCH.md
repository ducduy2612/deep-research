# S07 Research: Knowledge Base

## Summary

Slice S07 builds the Knowledge Base subsystem: file upload & parsing (PDF, Office, text), URL crawling, a knowledge store with IndexedDB persistence, and integration into the research workflow. The old codebase has ~780 lines of custom parsers (officeParser.ts, pdfParser.ts, textParser.ts) and a 333-line useKnowledge hook. The rewrite replaces the custom office parser with the `officeparser` npm package, uses LLM-based rewriting for non-plain-text content, and follows the established Zustand + localforage store pattern.

**This is targeted research** — the patterns (Zustand store with localforage, Zod validation, fire-and-forget persistence, API routes) are well-established from S01–S06. The main unknowns are: (1) whether `officeparser` works in both browser and server contexts, (2) how to handle PDF parsing without `pdfjs-dist`, and (3) how knowledge content integrates into the research orchestrator's search phase.

## Requirements Owned

| ID | Description | Status |
|----|-------------|--------|
| KB-01 | User can upload PDF files and have them parsed via LLM-based OCR | Pending |
| KB-02 | User can upload Office documents (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) and have them parsed via officeparser | Pending |
| KB-03 | User can upload plain text files (TXT, JSON, XML, YAML, code) and have them parsed | Pending |
| KB-04 | User can crawl URLs for content via Jina Reader or local crawler | Pending |
| KB-05 | User can toggle local-only mode to research using only uploaded knowledge base documents without web search | Pending |
| KB-06 | System chunks uploaded content at 10K character boundaries and rewrites non-plain-text content via AI | Pending |

## Implementation Landscape

### Architecture (4 modules)

1. **Knowledge Engine** (`src/engine/knowledge/`) — File parsing pipeline, URL crawling, chunking logic. Framework-agnostic, no React.
   - `file-parser.ts` — Routes files by MIME type to the correct parser
   - `text-parser.ts` — FileReader-based text extraction for plain text formats
   - `office-parser.ts` — Wraps `officeparser` package for Office document parsing
   - `pdf-parser.ts` — Simple text extraction from PDFs (server-side via API route, or client-side with pdfjs-dist)
   - `url-crawler.ts` — Jina Reader API + local server-side crawler
   - `chunker.ts` — Splits content at 10K character boundaries with overlap
   - `types.ts` — KnowledgeItem, KnowledgeSource types

2. **Knowledge Store** (`src/stores/knowledge-store.ts`) — Zustand store with localforage persistence, Zod validation. Same pattern as history-store.ts and settings-store.ts.
   - CRUD for knowledge items (add, remove, update, getAll, search)
   - Fuse.js search over titles and content
   - FIFO quota (configurable, e.g. 200 items)
   - Knowledge items stored as: `{ id, title, content, type, fileMeta?, url?, createdAt, updatedAt }`

3. **Knowledge API Routes** (`src/app/api/knowledge/`) — Server-side processing for operations that can't run client-side:
   - `src/app/api/knowledge/crawl/route.ts` — Server-side URL crawling (fetches URL, extracts title + content)
   - `src/app/api/knowledge/parse-pdf/route.ts` — Server-side PDF text extraction (if we go that route)
   - `src/app/api/knowledge/rewrite/route.ts` — LLM-based content rewriting for non-plain-text chunks

4. **Knowledge UI** (`src/components/knowledge/`) — Dialog, file upload, URL input, knowledge list
   - `KnowledgeDialog.tsx` — Main dialog with tabs (Files, URLs, Library)
   - `KnowledgeList.tsx` — Table of knowledge items with search, delete, add-to-research actions
   - `FileUpload.tsx` — Drag-and-drop file upload area
   - `UrlCrawler.tsx` — URL input with crawler selection (Jina/Local)

### Natural Seams

The work divides into 4 independent tasks:

- **T01: Knowledge Engine** — All parsing, chunking, and URL crawling logic. No UI, no store. Pure functions testable in isolation.
- **T02: Knowledge Store** — Zustand store with localforage, Zod, Fuse.js search. Follows history-store.ts pattern exactly.
- **T03: Knowledge UI** — KnowledgeDialog, FileUpload, UrlCrawler, KnowledgeList components. Follows SettingsDialog/HistoryDialog patterns.
- **T04: Integration** — Wire knowledge into research orchestrator (knowledge content injected into search/analyze phases), add Knowledge button to Header, add "local-only mode" toggle, API routes for server-side operations.

### Dependencies

- T01 is independent (pure engine code)
- T02 is independent (follows existing store patterns)
- T03 depends on T01 + T02 (UI calls engine parsers and store actions)
- T04 depends on T01 + T02 + T03 (integration wiring)

### Risk Assessment

**Medium risk** — not because of unknown technology, but because of:

1. **PDF parsing choice** — The research doc recommends "LLM-based OCR via OpenAI-compatible vision model" but this is overkill for text-based PDFs and requires sending PDF bytes to an API. The old codebase used `pdfjs-dist` (client-side). A pragmatic approach: use `pdfjs-dist` for basic text extraction (covers 95% of PDFs) and skip the LLM-OCR for v1.0. The rewriting step (KB-06) handles the quality improvement.
2. **officeparser browser compatibility** — The package has a browser bundle (`officeParserBundle.js`) but we haven't tested it in the Next.js client context. Server-side via API route is the safer fallback.
3. **Content volume** — Knowledge items could be large (100K+ chars). The chunking + rewriting pipeline needs to handle this without blocking the UI. Fire-and-forget processing with status tracking is essential.

### Key Decision: File Processing Location

**Recommendation: Process files server-side via API routes.**

The old codebase did everything client-side (FileReader + DOM-based XML parsing). The `officeparser` package supports browser usage but has a separate bundle. Processing server-side:
- Avoids browser compatibility issues with officeparser
- Enables PDF parsing with pdfjs-dist on Node.js (no worker setup needed)
- Keeps heavy XML parsing off the main thread
- Matches the existing architecture where AI operations go through API routes

The flow would be:
1. User selects file in browser → client reads file as ArrayBuffer
2. Client POSTs to `/api/knowledge/parse` with file data
3. Server parses, chunks, optionally rewrites via LLM
4. Server returns structured `KnowledgeItem[]` 
5. Client saves to knowledge store (localforage)

This is simpler than the old approach and avoids bundling parser libraries client-side.

### Key Decision: PDF Handling

**Recommendation: Install `pdfjs-dist` for basic text extraction, skip LLM-OCR for v1.0.**

Rationale:
- The research doc's LLM-based OCR (sending PDF bytes to vision models) is powerful but complex and expensive
- `pdfjs-dist` is already the standard for PDF text extraction in the Node.js/browser ecosystem
- The old codebase used it successfully
- The AI rewriting step (KB-06) handles content quality improvement regardless of source
- LLM-OCR can be added as an enhancement in a future slice

### Packages to Install

| Package | Purpose | Version |
|---------|---------|---------|
| `officeparser` | Parse Office documents (DOCX, PPTX, XLSX, ODT, ODP, ODS) | ^6.0.7 |
| `fuse.js` | Fuzzy search over knowledge items | ^7.0.0 |
| `pdfjs-dist` | PDF text extraction | ^4.0.0 |

Note: `nanoid` (already installed) is used for ID generation instead of the old `ts-md5` approach.

### Integration with Research Orchestrator

The old codebase treated knowledge as "resources" added to the current research task. The new architecture should:

1. **Knowledge items are persistent** — they survive across research sessions (stored in localforage/IndexedDB)
2. **Knowledge is injected into the research context** — when starting research, the user can select which knowledge items to include. Their content is added to the system prompt or search context.
3. **Local-only mode (KB-05)** — when toggled, the search phase skips web search providers and uses only knowledge content as "sources". This means the search provider returns knowledge items instead of web results.

The orchestrator doesn't need modification for this — the SSE route handles it by:
- Accepting `knowledgeIds: string[]` in the request body
- Loading knowledge content from the store (or having the client send it)
- Prepending knowledge content to the search/analyze prompts
- When local-only mode is on, creating a "knowledge search provider" that returns knowledge items as sources

### Existing Patterns to Follow

| Pattern | Established In | S07 Usage |
|---------|---------------|-----------|
| Zustand + localforage store with Zod | settings-store.ts, history-store.ts | knowledge-store.ts |
| Fire-and-forget persistence | settings-store.ts | knowledge-store.ts |
| API route with Zod validation | stream/route.ts | parse/crawl routes |
| Dialog component with glassmorphism | SettingsDialog.tsx, HistoryDialog.tsx | KnowledgeDialog.tsx |
| SSE streaming for AI rewriting | stream/route.ts | rewrite route |
| 300-line max per component | All S05-S06 components | All S07 components |

### Forward Intelligence from S06

- `useUIStore` has `DialogType = "settings" | "history" | "about" | null` — needs `"knowledge"` added
- `src/stores/index.ts` barrel exports all stores — knowledge store needs adding
- `src/app/page.tsx` mounts global dialogs — KnowledgeDialog needs mounting
- `src/app/providers.tsx` hydrates stores — knowledge store needs hydrating
- Header.tsx already imports `BookOpen` icon but doesn't have a Knowledge button yet

## Verification

- `pnpm vitest run` — All existing tests pass + new knowledge tests
- `pnpm build` — Clean production build with zero type/lint errors
- `wc -l src/components/knowledge/*.tsx` — All components under 300 lines
- `wc -l src/stores/knowledge-store.ts` — Under 300 lines
- Manual: Upload DOCX/PDF/TXT files, verify content extracted
- Manual: Crawl URL via Jina Reader, verify content saved
- Manual: Search knowledge items via Fuse.js, verify results
