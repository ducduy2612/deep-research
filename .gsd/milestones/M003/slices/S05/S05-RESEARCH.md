# S05 Research: Export + Knowledge Base Integration

**Depth:** Light — straightforward wiring of known patterns (Blob download, html2pdf.js, store.add).

## Summary

S05 adds 4 export/integration features to the research workspace:
1. **MD export** — trivial Blob download from `result.report` string
2. **PDF export** — client-side via html2pdf.js (not yet installed), render markdown→HTML→hidden DOM→capture→download
3. **Search result export** — serialize `SearchResult[]` as MD or JSON Blob download
4. **Add-to-KB** — convert a `SearchResult` into a `KnowledgeItem` and call `knowledgeStore.add()`

All patterns exist in the codebase. No unfamiliar technology. Low risk.

## Requirements Owned

- **R058** — Markdown export: Blob download from report string, filename derived from title
- **R059** — PDF export: html2pdf.js (client-side), markdown→HTML via `marked` (already in deps)
- **R060** — Search result export (MD/JSON): serialize SearchResult[] and download
- **R061** — Add-to-KB from search results: convert learning+sources to KnowledgeItem

## Implementation Landscape

### Existing Code

| File | Role |
|------|------|
| `src/components/research/FinalReport.tsx` (188 lines) | Has un-wired Export button at bottom bar. Add MD + PDF download handlers here. |
| `src/components/research/SearchResultCard.tsx` (138 lines) | Each search result card. Add export (MD/JSON) + add-to-KB buttons here. |
| `src/components/MarkdownRenderer.tsx` | Uses `marked` for MD→HTML rendering. Reuse for PDF HTML generation. |
| `src/stores/knowledge-store.ts` | `add(item: KnowledgeItem)` — accepts KnowledgeItem with `nanoid()` ID, persists via localforage. |
| `src/engine/knowledge/types.ts` | `KnowledgeItem` type: `{ id, title, content, type, chunkCount, createdAt, updatedAt, ... }`. |
| `src/engine/research/types.ts` | `SearchResult` = `{ query, researchGoal, learning, sources, images }`. `ResearchResult` = `{ title, report, learnings, sources, images }`. |
| `src/stores/research-store.ts` | `result` field has the final `ResearchResult`. `searchResults` has `SearchResult[]`. `checkpoints.research` has frozen research data. |

### Missing Dependency

- **html2pdf.js** — NOT in package.json. Must `pnpm add html2pdf.js`. Decision D012 already chose this library.

### Patterns to Follow

- **Blob download pattern:** Create Blob → `URL.createObjectURL` → create `<a>` → click → revoke. No existing download helper in codebase; write a small `downloadBlob()` utility.
- **KB item creation:** Use `nanoid()` for ID (pattern from `FileUpload.tsx` and `UrlCrawler.tsx`). Set `type: "file"` (or new type), `chunkCount: 1`, timestamps from `Date.now()`.
- **i18n:** All new button labels go through `useTranslations` in en.json + vi.json.
- **ESLint max-lines:** Keep all files under 500 lines. FinalReport is at 188, SearchResultCard at 138 — plenty of room.

### Natural Seams

1. **Utility function** — `downloadBlob(filename, content, mimeType)` in `src/utils/download.ts` (new). Used by all 3 export features.
2. **PDF export helper** — `exportReportAsPdf(reportMarkdown, title)` in `src/utils/export-pdf.ts` (new). Renders hidden DOM → html2pdf capture → download.
3. **Search result serialization** — `serializeSearchResultAsMd(result)` and `serializeSearchResultsAsJson(results[])` — small helpers, can live in the export utility or inline.
4. **KB conversion** — `searchResultToKnowledgeItem(result)` — maps SearchResult to KnowledgeItem shape.

### What to Build First

1. Install html2pdf.js (`pnpm add html2pdf.js`)
2. Create `src/utils/download.ts` — shared download helper
3. Wire FinalReport export button (MD + PDF) — this validates the core export flow
4. Add export buttons to SearchResultCard (MD/JSON per-card, bulk export in ResearchActions)
5. Add "Add to KB" button on SearchResultCard
6. i18n keys for all new buttons

### Verification

- `pnpm vitest run` — existing tests should all still pass (no store changes except possibly adding a convenience action)
- `pnpm build` — TypeScript check
- `pnpm lint` — ESLint check
- Manual browser check: download MD, download PDF, export search results, add to KB
