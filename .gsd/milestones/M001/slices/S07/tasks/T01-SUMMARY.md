---
id: T01
parent: S07
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/knowledge/types.ts", "src/engine/knowledge/file-parser.ts", "src/engine/knowledge/chunker.ts", "src/engine/knowledge/url-crawler.ts", "src/engine/knowledge/index.ts", "src/app/api/knowledge/parse/route.ts", "src/app/api/knowledge/crawl/route.ts", "src/engine/knowledge/__tests__/chunker.test.ts", "src/engine/knowledge/__tests__/file-parser.test.ts", "src/engine/knowledge/__tests__/url-crawler.test.ts", "next.config.ts"]
key_decisions: ["Added officeparser and pdfjs-dist to serverExternalPackages in next.config.ts to avoid ESM bundling issues", "Used KnowledgeParseError (extends Error) for cleaner module boundaries instead of AppError integration", "officeparser v6 uses OfficeParser.parseOffice(buffer) returning AST with .toText()"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 34 new knowledge engine tests pass (chunker: 9, file-parser: 16, url-crawler: 9). Full test suite of 412 tests across 20 files passes with zero regressions. Production build completes cleanly with both API routes registered (/api/knowledge/parse and /api/knowledge/crawl)."
completed_at: 2026-03-31T21:11:59.045Z
blocker_discovered: false
---

# T01: Built knowledge engine module with file parsing (text/PDF/Office), content chunking, URL crawling (Jina/local), and server-side API routes

> Built knowledge engine module with file parsing (text/PDF/Office), content chunking, URL crawling (Jina/local), and server-side API routes

## What Happened
---
id: T01
parent: S07
milestone: M001
key_files:
  - src/engine/knowledge/types.ts
  - src/engine/knowledge/file-parser.ts
  - src/engine/knowledge/chunker.ts
  - src/engine/knowledge/url-crawler.ts
  - src/engine/knowledge/index.ts
  - src/app/api/knowledge/parse/route.ts
  - src/app/api/knowledge/crawl/route.ts
  - src/engine/knowledge/__tests__/chunker.test.ts
  - src/engine/knowledge/__tests__/file-parser.test.ts
  - src/engine/knowledge/__tests__/url-crawler.test.ts
  - next.config.ts
key_decisions:
  - Added officeparser and pdfjs-dist to serverExternalPackages in next.config.ts to avoid ESM bundling issues
  - Used KnowledgeParseError (extends Error) for cleaner module boundaries instead of AppError integration
  - officeparser v6 uses OfficeParser.parseOffice(buffer) returning AST with .toText()
duration: ""
verification_result: passed
completed_at: 2026-03-31T21:11:59.045Z
blocker_discovered: false
---

# T01: Built knowledge engine module with file parsing (text/PDF/Office), content chunking, URL crawling (Jina/local), and server-side API routes

**Built knowledge engine module with file parsing (text/PDF/Office), content chunking, URL crawling (Jina/local), and server-side API routes**

## What Happened

Created the complete knowledge engine pure-logic layer comprising 7 source files and 3 test files (34 tests). The module provides: (1) type definitions with Zod 4 schemas for KnowledgeItem, KnowledgeContent, CrawlResult; (2) a file parsing pipeline that routes by MIME type to text decoder, pdfjs-dist (PDF), or officeparser v6 (Office documents); (3) a content chunker with 10K char boundaries, 500-char overlap, and paragraph-aware splitting; (4) URL crawlers for Jina Reader API and local server-side fetching with timeout handling; (5) two API routes (/api/knowledge/parse for file upload, /api/knowledge/crawl for URL crawling) with Zod validation, structured error responses, and proper HTTP status codes. Key adaptation: added officeparser and pdfjs-dist to serverExternalPackages in next.config.ts to resolve ESM bundling incompatibility. Updated officeparser integration to use the v6 API (OfficeParser.parseOffice returning AST with .toText()). All 412 tests pass (34 new + 378 existing), production build is clean.

## Verification

All 34 new knowledge engine tests pass (chunker: 9, file-parser: 16, url-crawler: 9). Full test suite of 412 tests across 20 files passes with zero regressions. Production build completes cleanly with both API routes registered (/api/knowledge/parse and /api/knowledge/crawl).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/knowledge` | 0 | ✅ pass | 222ms |
| 2 | `pnpm build` | 0 | ✅ pass | 15000ms |
| 3 | `pnpm vitest run` | 0 | ✅ pass | 1460ms |


## Deviations

Added officeparser and pdfjs-dist to serverExternalPackages in next.config.ts (required for ESM bundling). Used KnowledgeParseError extending Error instead of AppError for cleaner module boundaries. Adapted to officeparser v6 API (OfficeParser.parseOffice with AST .toText() instead of parseOfficeAsync).

## Known Issues

PDF parsing lacks built-in timeout — very large/corrupt PDFs could hang. Should add request timeout middleware in production.

## Files Created/Modified

- `src/engine/knowledge/types.ts`
- `src/engine/knowledge/file-parser.ts`
- `src/engine/knowledge/chunker.ts`
- `src/engine/knowledge/url-crawler.ts`
- `src/engine/knowledge/index.ts`
- `src/app/api/knowledge/parse/route.ts`
- `src/app/api/knowledge/crawl/route.ts`
- `src/engine/knowledge/__tests__/chunker.test.ts`
- `src/engine/knowledge/__tests__/file-parser.test.ts`
- `src/engine/knowledge/__tests__/url-crawler.test.ts`
- `next.config.ts`


## Deviations
Added officeparser and pdfjs-dist to serverExternalPackages in next.config.ts (required for ESM bundling). Used KnowledgeParseError extending Error instead of AppError for cleaner module boundaries. Adapted to officeparser v6 API (OfficeParser.parseOffice with AST .toText() instead of parseOfficeAsync).

## Known Issues
PDF parsing lacks built-in timeout — very large/corrupt PDFs could hang. Should add request timeout middleware in production.
