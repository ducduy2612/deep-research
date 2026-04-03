# S05: Export + Knowledge Base Integration

**Goal:** Add export and knowledge base integration: download report as Markdown (.md) and PDF, export search results as MD or JSON, and add search result content to the knowledge base from the card UI.
**Demo:** After this: Download report as .md file. Download report as PDF with proper formatting. Export search results as MD or JSON. Add search result content to knowledge base from card.

## Tasks
- [x] **T01: Created download utility and wired FinalReport export button with Markdown and PDF download options** — Install html2pdf.js. Create shared `downloadBlob()` utility and `exportReportAsPdf()` helper. Wire the un-wired Export button in FinalReport bottom bar to show a dropdown with MD and PDF download options. Add i18n keys for export options. Write unit tests for the download utility and PDF export helper.
  - Estimate: 1h
  - Files: src/utils/download.ts, src/utils/export-pdf.ts, src/components/research/FinalReport.tsx, messages/en.json, messages/vi.json, package.json
  - Verify: pnpm vitest run src/utils/__tests__/download.test.ts src/utils/__tests__/export-pdf.test.ts && pnpm build && pnpm lint
- [x] **T02: Added per-card export dropdown (MD/JSON) and Add-to-Knowledge-Base button to each SearchResultCard with serialization helpers and unit tests** — Create serialization helpers (`serializeSearchResultAsMd`, `serializeSearchResultsAsJson`) and `searchResultToKnowledgeItem` converter. Add export dropdown (MD/JSON) and 'Add to KB' icon button to each SearchResultCard. Wire Add-to-KB to call `knowledgeStore.add()` with a success toast. Add i18n keys. Write unit tests for serialization and KB conversion.
  - Estimate: 1h
  - Files: src/utils/export-search.ts, src/components/research/SearchResultCard.tsx, src/stores/knowledge-store.ts, src/engine/knowledge/types.ts, src/engine/research/types.ts, messages/en.json, messages/vi.json
  - Verify: pnpm vitest run src/utils/__tests__/export-search.test.ts && pnpm build && pnpm lint
