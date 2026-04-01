---
estimated_steps: 6
estimated_files: 10
skills_used: []
---

# T01: Knowledge engine types, parsers, chunking, and API routes

**Slice:** S07 — Knowledge Base
**Milestone:** M001

## Description

Create the knowledge engine module — the pure-logic layer for the Knowledge Base subsystem. This includes all type definitions, file parsing pipeline (PDF, Office, plain text), URL crawling (Jina Reader + local), content chunking, and server-side API routes. No React components or Zustand stores in this task.

All file parsing happens server-side via API routes to avoid browser compatibility issues with `officeparser` and `pdfjs-dist`. The client sends file data to the API, the server parses it, chunks it, and returns structured `KnowledgeItem[]`.

## Steps

1. **Install packages**: Run `pnpm add officeparser fuse.js pdfjs-dist`. These are the three new dependencies for the knowledge engine.

2. **Create knowledge types** (`src/engine/knowledge/types.ts`):
   - `KnowledgeItem` — { id: string, title: string, content: string, type: "file" | "url", fileType?: string, url?: string, fileName?: string, fileSize?: number, chunkCount: number, createdAt: number, updatedAt: number }
   - `KnowledgeContent` — raw parsed content before chunking: { title: string, content: string, sourceType: "file" | "url", fileName?: string, url?: string }
   - `CrawlResult` — { url: string, title: string, content: string }
   - `ParseError` — extends AppError with fileName/url context
   - Zod schemas: `knowledgeItemSchema`, `knowledgeContentSchema`
   - Exported MIME type constants for supported file formats

3. **Create text parser** (inline in `file-parser.ts`):
   - `parseTextContent(fileData: ArrayBuffer, mimeType: string): string` — Decodes ArrayBuffer as UTF-8 text. Used for TXT, JSON, XML, YAML, CSV, code files, RTF, SVG, etc.
   - Supported MIME types: text/*, application/json, application/xml, application/xhtml+xml, application/x-yaml, image/svg+xml, application/javascript, application/typescript, and other code MIME types.

4. **Create chunker** (`src/engine/knowledge/chunker.ts`):
   - `chunkContent(content: string, options?: { chunkSize?: number, overlap?: number }): string[]` — Splits content at boundaries (default 10K chars with 500-char overlap). Tries to split at paragraph or sentence boundaries within a tolerance window (±20% of chunkSize) to avoid mid-word/mid-sentence splits.
   - Pure function, no side effects, easily testable.

5. **Create URL crawler** (`src/engine/knowledge/url-crawler.ts`):
   - `crawlJina(url: string): Promise<CrawlResult>` — POSTs to `https://r.jina.ai` with the URL, returns structured title + content. Uses Jina Reader API (no API key needed for basic usage).
   - `crawlLocal(url: string): Promise<CrawlResult>` — Server-side fetch of the URL, extracts `<title>` tag, returns raw HTML content.
   - Both functions are pure async, no React dependencies.

6. **Create API routes**:
   - `src/app/api/knowledge/parse/route.ts` — POST handler accepting FormData with file field. Server-side: reads file, routes to correct parser based on MIME type (text → decode UTF-8, PDF → pdfjs-dist text extraction, Office → officeparser). Returns `{ title, content, fileType, fileName, fileSize }` as JSON. Zod validates request. Error handling returns `{ error: string }` with appropriate HTTP status.
   - `src/app/api/knowledge/crawl/route.ts` — POST handler accepting `{ url: string, crawler: "jina" | "local" }`. Zod validates input. Routes to crawlJina or crawlLocal. Returns `{ url, title, content }` as JSON.

7. **Create barrel export** (`src/engine/knowledge/index.ts`): Export all types, chunkContent, crawlJina, crawlLocal, parseTextContent.

8. **Write tests**:
   - `src/engine/knowledge/__tests__/chunker.test.ts` — Test: empty string returns [], string under chunkSize returns [string], exact chunkSize boundary, overlap behavior, paragraph boundary splitting, very long string (100K chars).
   - `src/engine/knowledge/__tests__/file-parser.test.ts` — Test: text parsing for various MIME types, unsupported MIME type throws, empty file handling.
   - `src/engine/knowledge/__tests__/url-crawler.test.ts` — Test: crawlLocal extracts title, crawlJina with mocked fetch, invalid URL handling, network error handling. Mock global fetch for all network tests.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| pdfjs-dist | Return parse error to client with file name | N/A (no timeout built in) | Return parse error with "corrupt PDF" message |
| officeparser | Return parse error to client with file name | N/A | Return parse error with "corrupt document" message |
| Jina Reader API | Return 502 with upstream error | Return 504 with timeout message | Return 502 with "unexpected response" message |
| Target URL (local crawl) | Return 502 with fetch error | Return 504 with timeout message (10s limit) | Return title="" with raw content |

## Must-Haves

- [ ] `src/engine/knowledge/types.ts` exports KnowledgeItem, KnowledgeContent, CrawlResult types and Zod schemas
- [ ] Chunker splits at ~10K char boundaries with 500-char overlap and paragraph-aware splitting
- [ ] Text parser handles all supported MIME types (text/*, JSON, XML, YAML, code, RTF, SVG)
- [ ] URL crawler supports both Jina Reader and local server-side crawling
- [ ] API route /api/knowledge/parse accepts FormData, parses file server-side, returns JSON
- [ ] API route /api/knowledge/crawl accepts {url, crawler}, returns JSON
- [ ] All parsers return structured errors (never throw unhandled)
- [ ] Tests for chunker, text parser, and URL crawler pass

## Verification

- `pnpm vitest run src/engine/knowledge` — All knowledge engine tests pass
- `pnpm build` — Clean build with zero type/lint errors (confirms pdfjs-dist and officeparser are properly importable)

## Inputs

- `src/engine/research/types.ts` — Existing type patterns and Zod schema conventions
- `src/lib/storage.ts` — Storage abstraction reference
- `_archive/src-v0/utils/parser/index.ts` — Old file parser routing logic (reference only, do NOT import)
- `_archive/src-v0/utils/parser/pdfParser.ts` — Old PDF parser pattern (reference only)
- `_archive/src-v0/utils/parser/officeParser.ts` — Old Office parser pattern (reference only, we use npm package now)
- `_archive/src-v0/utils/crawler.ts` — Old Jina Reader and local crawler patterns
- `_archive/src-v0/app/api/crawler/route.ts` — Old API route pattern

## Expected Output

- `src/engine/knowledge/types.ts` — Knowledge types, Zod schemas, MIME constants
- `src/engine/knowledge/file-parser.ts` — Text parser function and MIME type routing
- `src/engine/knowledge/chunker.ts` — Content chunking with overlap and boundary awareness
- `src/engine/knowledge/url-crawler.ts` — Jina Reader and local URL crawling functions
- `src/engine/knowledge/index.ts` — Barrel export for the knowledge engine module
- `src/app/api/knowledge/parse/route.ts` — Server-side file parsing API route
- `src/app/api/knowledge/crawl/route.ts` — Server-side URL crawling API route
- `src/engine/knowledge/__tests__/chunker.test.ts` — Chunker tests
- `src/engine/knowledge/__tests__/file-parser.test.ts` — Text parser tests
- `src/engine/knowledge/__tests__/url-crawler.test.ts` — URL crawler tests
