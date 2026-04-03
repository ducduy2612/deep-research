---
estimated_steps: 5
estimated_files: 6
skills_used: []
---

# T02: Add search result export (MD/JSON) and add-to-KB buttons to SearchResultCard

**Slice:** S05 — Export + Knowledge Base Integration
**Milestone:** M003

## Description

Create serialization helpers for search results (MD and JSON formats) and a `searchResultToKnowledgeItem` converter. Add per-card export dropdown (MD/JSON) and "Add to KB" icon button to each SearchResultCard. Wire Add-to-KB to call `knowledgeStore.add()` with a success toast. Add i18n keys. Write unit tests for serialization and KB conversion helpers.

## Steps

1. **Create `src/utils/export-search.ts`** — Three exported functions:

   **`serializeSearchResultAsMd(result: SearchResult): string`**
   - Format: 
     ```
     # {result.query}
     
     **Research Goal:** {result.researchGoal}
     
     ## Learning
     
     {result.learning}
     
     ## Sources
     
     {result.sources.map((s, i) => `${i+1}. [${s.title ?? s.url}](${s.url})`).join('\n')}
     ```
   - If sources array is empty, omit the Sources section
   
   **`serializeSearchResultsAsJson(results: SearchResult[]): string`**
   - `JSON.stringify(results, null, 2)` — clean pretty-printed JSON
   - This serializes the full SearchResult shape including query, researchGoal, learning, sources, images
   
   **`searchResultToKnowledgeItem(result: SearchResult): KnowledgeItem`**
   - Import `nanoid` from "nanoid" (already in deps — used in FileUpload.tsx and UrlCrawler.tsx)
   - Import `KnowledgeItem` from `@/engine/knowledge/types`
   - Map SearchResult → KnowledgeItem:
     ```
     {
       id: nanoid(),
       title: result.query,
       content: result.learning + "\n\nSources:\n" + result.sources.map(s => `- ${s.title ?? s.url}: ${s.url}`).join('\n'),
       type: "file",  // no "research" type exists — "file" is generic enough
       chunkCount: 1,
       createdAt: Date.now(),
       updatedAt: Date.now(),
     }
     ```

2. **Modify `src/components/research/SearchResultCard.tsx`** — Add export and KB buttons to the header row:

   - Add new imports: `Download`, `Database` (or `Brain`) from lucide-react, `toast` from "sonner", `downloadBlob` from `@/utils/download`, the three new helpers from `@/utils/export-search`, `useKnowledgeStore` from `@/stores/knowledge-store`
   - Add state: `const [exportOpen, setExportOpen] = useState(false)`
   - In the header row (after the retry and delete buttons), add:
     - Export button (Download icon) that toggles a small dropdown:
       - "Export as Markdown" → calls `downloadBlob(query + ".md", serializeSearchResultAsMd(result), "text/markdown;charset=utf-8")`
       - "Export as JSON" → calls `downloadBlob(query + ".json", serializeSearchResultsAsJson([result]), "application/json;charset=utf-8")`
     - "Add to KB" button (Database icon) → calls `useKnowledgeStore.getState().add(searchResultToKnowledgeItem(result))` + shows success toast
   - The dropdown should use the same pattern as T01's FinalReport dropdown (click-outside to close)
   - Sanitize the query for filename (strip special chars, limit length) — import `sanitizeFilename` from `@/utils/export-pdf`
   - Keep the file under 500 lines (currently 138, plenty of room)

3. **Add i18n keys** — Add to `messages/en.json` under "SearchResultCard":
   - `"exportMarkdown": "Export as Markdown"`
   - `"exportJson": "Export as JSON"`
   - `"addToKb": "Add to Knowledge Base"`
   - `"addedToKb": "Added to knowledge base"`
   
   Add to `messages/vi.json` under "SearchResultCard":
   - `"exportMarkdown": "Xuất Markdown"`
   - `"exportJson": "Xuất JSON"`
   - `"addToKb": "Thêm vào Cơ sở tri thức"`
   - `"addedToKb": "Đã thêm vào cơ sở tri thức"`

4. **Write tests** — `src/utils/__tests__/export-search.test.ts`:
   - Test `serializeSearchResultAsMd`:
     - With typical SearchResult (has learning, sources, researchGoal) — verify markdown structure
     - With empty sources — verify Sources section is omitted
     - With sources that have no title (fallback to URL)
   - Test `serializeSearchResultsAsJson`:
     - Round-trip test: serialize then JSON.parse, verify structure matches input
     - With empty array — produces "[]"
     - With multiple results — array has correct length
   - Test `searchResultToKnowledgeItem`:
     - Verify output matches KnowledgeItem interface (id is string, type is "file", chunkCount is 1, timestamps are numbers)
     - Verify content includes learning + formatted sources
     - Verify title is the query string
   - Mock `nanoid` to return a predictable value for deterministic tests

5. **Verify the full suite still passes** — Run `pnpm vitest run` to confirm all 711+ existing tests still pass alongside the new ones.

## Must-Haves

- [ ] `src/utils/export-search.ts` exports `serializeSearchResultAsMd`, `serializeSearchResultsAsJson`, `searchResultToKnowledgeItem`
- [ ] Each SearchResultCard has export dropdown (MD/JSON) in the header row
- [ ] Each SearchResultCard has "Add to KB" button that calls knowledgeStore.add() + shows toast
- [ ] MD export formats learning + sources as readable markdown
- [ ] JSON export produces valid pretty-printed JSON
- [ ] KB conversion creates a valid KnowledgeItem with nanoid ID
- [ ] All new strings use i18n keys (en.json + vi.json)
- [ ] Unit tests pass for serialization and KB conversion
- [ ] SearchResultCard.tsx stays under 500 lines
- [ ] All existing tests still pass

## Verification

- `pnpm vitest run src/utils/__tests__/export-search.test.ts`
- `pnpm build` — TypeScript compiles, no type errors
- `pnpm lint` — ESLint clean on all modified files

## Inputs

- `src/components/research/SearchResultCard.tsx` — current card with retry/delete buttons (138 lines)
- `src/stores/knowledge-store.ts` — has `add(item: KnowledgeItem)` action
- `src/engine/knowledge/types.ts` — `KnowledgeItem` interface: `{ id, title, content, type, chunkCount, createdAt, updatedAt }`
- `src/engine/research/types.ts` — `SearchResult` interface: `{ query, researchGoal, learning, sources, images }`
- `src/utils/download.ts` — `downloadBlob()` utility from T01
- `src/utils/export-pdf.ts` — `sanitizeFilename()` helper from T01
- `messages/en.json` — existing "SearchResultCard" namespace
- `messages/vi.json` — Vietnamese translations

## Expected Output

- `src/utils/export-search.ts` — three export helpers for search results
- `src/utils/__tests__/export-search.test.ts` — unit tests for all three helpers
- `src/components/research/SearchResultCard.tsx` — export dropdown + Add to KB button added
- `messages/en.json` — added exportMarkdown, exportJson, addToKb, addedToKb to SearchResultCard namespace
- `messages/vi.json` — added Vietnamese translations for new keys
