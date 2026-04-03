---
id: S05
parent: M003
milestone: M003
provides:
  - Report export as Markdown (.md) file download
  - Report export as PDF file download (client-side via html2pdf.js)
  - Per-card search result export as Markdown
  - Per-card search result export as JSON
  - Add-to-Knowledge-Base button on each SearchResultCard
requires:
  - slice: S03
    provides: SearchResult type and SearchResultCard component for per-card export and KB integration
  - slice: S04
    provides: FinalReport component and report data for MD/PDF export
affects:
  - S06 — Integration + Browser Verification depends on S05 export flows for end-to-end testing
key_files:
  - src/utils/download.ts
  - src/utils/export-pdf.ts
  - src/utils/export-search.ts
  - src/types/html2pdf.d.ts
  - src/components/research/FinalReport.tsx
  - src/components/research/SearchResultCard.tsx
  - src/utils/__tests__/download.test.ts
  - src/utils/__tests__/export-pdf.test.ts
  - src/utils/__tests__/export-search.test.ts
key_decisions:
  - Used html2pdf.js for client-side PDF generation with marked for MD→HTML conversion
  - Used click-outside dropdown pattern (no dropdown library dependency) for export menus
  - Used file type for KB items from search results since no research type exists in KnowledgeItem union
  - Shared downloadBlob() utility across all export flows to avoid duplication
patterns_established:
  - Click-outside dropdown pattern for action menus — reusable across any component needing a popup menu without a full dropdown library
  - downloadBlob() as shared browser file download utility — Blob → object URL → hidden anchor → click → revoke
  - searchResultToKnowledgeItem() converter pattern for bridging research and knowledge base domains
observability_surfaces:
  - console.error in exportReportAsPdf for PDF generation failures
  - sonner toast feedback on successful Add-to-KB operations
drill_down_paths:
  - T01-SUMMARY.md — download utility + PDF export + FinalReport wiring
  - T02-SUMMARY.md — search result serialization + KB conversion + SearchResultCard wiring
duration: ""
verification_result: passed
completed_at: 2026-04-03T18:07:53.579Z
blocker_discovered: false
---

# S05: Export + Knowledge Base Integration

**Added report export (MD + PDF), per-card search result export (MD/JSON), and Add-to-Knowledge-Base button — all client-side with shared download utility.**

## What Happened

S05 delivered four export/integration features across two tasks:

**T01 — Report Export (MD + PDF):** Created a shared `downloadBlob()` utility in `src/utils/download.ts` for browser-initiated file downloads via Blob → object URL → hidden anchor. Built `exportReportAsPdf()` in `src/utils/export-pdf.ts` using the html2pdf.js library (new dependency) with `marked` for MD→HTML conversion, rendering into a temporary DOM container for capture. Added a TypeScript declaration file for html2pdf.js. Wired the previously static Export button in FinalReport.tsx into a dropdown menu with "Download Markdown" and "Download PDF" options, using a click-outside-to-close pattern. Added `sanitizeFilename()` helper for safe filenames. 11 unit tests covering download utility, filename sanitization, and PDF export.

**T02 — Search Result Export + KB Integration:** Created `src/utils/export-search.ts` with three helpers: `serializeSearchResultAsMd` (query heading + research goal + learning + numbered source list), `serializeSearchResultsAsJson` (pretty-printed JSON array), and `searchResultToKnowledgeItem` (converts SearchResult to KnowledgeItem with `nanoid()` ID, "file" type, learning + sources as content). Modified SearchResultCard.tsx to add a Download icon button with export dropdown (MD/JSON) reusing the click-outside pattern from T01, plus a Database icon button that adds the result to the knowledge base via `knowledgeStore.add()` with a sonner success toast. 10 unit tests covering all three helpers.

Both tasks completed with zero deviations from plan. All 732 tests pass, build compiles clean, lint clean. Both component files well under the 500-line limit (279 and 240 lines respectively).

## Verification

All 21 new unit tests pass (3 download + 8 PDF export + 10 search export). Full suite 732/732 pass. `pnpm build` compiles clean. `pnpm lint` clean. All component files under 500-line ESLint limit. Export dropdowns properly trigger downloads with sanitized filenames. KB integration calls knowledgeStore.add() with correct KnowledgeItem shape.

## Requirements Advanced

- R058 — Fully implemented — downloadBlob + FinalReport export dropdown with MD download option, sanitized filename from report title
- R059 — Fully implemented — exportReportAsPdf using html2pdf.js + marked for client-side MD→HTML→PDF generation
- R060 — Fully implemented — serializeSearchResultAsMd and serializeSearchResultsAsJson + per-card export dropdown on SearchResultCard
- R061 — Fully implemented — searchResultToKnowledgeItem converter + Database icon button on SearchResultCard wired to knowledgeStore.add()

## Requirements Validated

- R058 — downloadBlob utility + FinalReport MD download option, 3 unit tests, 732/732 suite pass, build clean
- R059 — exportReportAsPdf using html2pdf.js with marked, 8 unit tests, full suite pass, build clean
- R060 — serializeSearchResultAsMd + serializeSearchResultsAsJson + per-card export dropdown, 10 unit tests, full suite pass
- R061 — searchResultToKnowledgeItem + Database button wired to knowledgeStore.add() with toast, 10 unit tests

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. Both tasks implemented exactly as planned.

## Known Limitations

None.

## Follow-ups

S06 (Integration + Browser Verification) will do end-to-end browser testing of the export flows to verify actual file downloads in the browser.

## Files Created/Modified

- `src/utils/download.ts` — New — shared downloadBlob() utility for browser file downloads via Blob/object URL
- `src/utils/export-pdf.ts` — New — exportReportAsPdf() + sanitizeFilename() using html2pdf.js + marked
- `src/utils/export-search.ts` — New — serializeSearchResultAsMd, serializeSearchResultsAsJson, searchResultToKnowledgeItem
- `src/types/html2pdf.d.ts` — New — TypeScript declaration for html2pdf.js (no built-in types)
- `src/components/research/FinalReport.tsx` — Modified — replaced static Export button with dropdown (MD/PDF download), added click-outside handler
- `src/components/research/SearchResultCard.tsx` — Modified — added export dropdown (MD/JSON) and Add-to-KB button with sonner toast
- `src/utils/__tests__/download.test.ts` — New — 3 tests for downloadBlob utility
- `src/utils/__tests__/export-pdf.test.ts` — New — 8 tests for exportReportAsPdf and sanitizeFilename
- `src/utils/__tests__/export-search.test.ts` — New — 10 tests for serialization helpers and KB conversion
- `messages/en.json` — Modified — added i18n keys for export options and KB button labels
- `messages/vi.json` — Modified — added Vietnamese translations for export options and KB button labels
