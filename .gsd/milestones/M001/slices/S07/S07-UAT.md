# S07: Knowledge Base — UAT

**Milestone:** M001
**Written:** 2026-03-31T21:38:04.362Z

# S07 UAT — Knowledge Base

## Preconditions
- Dev server running at http://localhost:3000
- No API keys required for file upload/URL crawl testing (server-side routes work without AI keys)
- Browser with IndexedDB support

---

## Test 1: File Upload — Plain Text
**Steps:**
1. Navigate to http://localhost:3000
2. Click the "Knowledge" button in the Header (Database icon)
3. Verify KnowledgeDialog opens with three tabs: Files, URLs, Library
4. On the Files tab, click the upload zone or drag a `.txt` file onto it
5. Verify a toast notification appears on success
6. Switch to the Library tab
7. Verify the uploaded file appears in the list with title, type badge "text", and content preview

**Expected:** File is parsed, stored in IndexedDB, and visible in the Library tab with correct metadata.

## Test 2: File Upload — PDF
**Steps:**
1. Open KnowledgeDialog → Files tab
2. Upload a small PDF file (under 1MB)
3. Verify success toast
4. Switch to Library tab
5. Verify the PDF appears with type badge "pdf" and chunk count > 0

**Expected:** PDF text is extracted server-side via pdfjs-dist, chunked, and stored.

## Test 3: File Upload — Office Document
**Steps:**
1. Open KnowledgeDialog → Files tab
2. Upload a `.docx` file
3. Verify success toast
4. Switch to Library tab
5. Verify item appears with type badge matching the Office format

**Expected:** Office document parsed via officeparser v6, content extracted and stored.

## Test 4: File Type Validation
**Steps:**
1. Open KnowledgeDialog → Files tab
2. Attempt to upload a `.exe` or `.zip` file
3. Verify the file is rejected with an error message about unsupported file type

**Expected:** Only accepted MIME types (PDF, Office, text) are processed; others are rejected client-side.

## Test 5: URL Crawl — Jina Reader
**Steps:**
1. Open KnowledgeDialog → URLs tab
2. Enter a valid URL (e.g., https://example.com)
3. Select "Jina" from the crawler dropdown
4. Click "Crawl"
5. Verify success toast
6. Switch to Library tab
7. Verify crawled content appears as a knowledge item with type badge "url"

**Expected:** URL content is fetched via Jina Reader API, parsed, and stored.

## Test 6: URL Crawl — Invalid URL
**Steps:**
1. Open KnowledgeDialog → URLs tab
2. Enter "not-a-url" as the URL
3. Verify the crawl button is disabled or shows validation error

**Expected:** Only valid HTTP/HTTPS URLs are accepted.

## Test 7: Library Search
**Steps:**
1. Upload or crawl at least 2 items
2. Open KnowledgeDialog → Library tab
3. Type a search term matching one item's title or content
4. Verify Fuse.js filters the list to matching items only
5. Clear the search
6. Verify all items are visible again

**Expected:** Fuzzy search filters correctly; clearing search restores full list.

## Test 8: Delete Knowledge Item
**Steps:**
1. Open KnowledgeDialog → Library tab
2. Click the delete button on an item
3. Verify confirmation appears
4. Confirm deletion
5. Verify the item is removed from the list

**Expected:** Item is deleted from the store and IndexedDB.

## Test 9: FIFO Quota Enforcement
**Steps:**
1. Add knowledge items until the store reaches the 200-item quota
2. Add one more item
3. Verify the oldest item is evicted (FIFO)
4. Check console for quota warning message

**Expected:** Store enforces 200-item limit with FIFO eviction.

## Test 10: Local-Only Mode Toggle
**Steps:**
1. Navigate to the Research Hub (main page)
2. Open ReportConfig panel
3. Find the "Local Only" toggle switch
4. Toggle it ON
5. Verify an amber "No Web Search" badge appears
6. Toggle it OFF
7. Verify the badge disappears

**Expected:** Toggle persists in settings store and shows visual indicator when enabled.

## Test 11: Knowledge Content in Research Request
**Steps:**
1. Upload at least one knowledge item
2. Enable local-only mode
3. Enter a research topic and start research
4. Check the SSE request body includes `localOnly: true` and `knowledgeContent` array with the uploaded item's content

**Expected:** Research request includes knowledge content and local-only flag when configured.

## Test 12: Knowledge Persistence Across Reload
**Steps:**
1. Upload a file and verify it appears in Library
2. Reload the page (F5)
3. Open KnowledgeDialog → Library tab
4. Verify the previously uploaded item is still present

**Expected:** Knowledge items persist in IndexedDB across page reloads.

## Test 13: Dialog Open/Close
**Steps:**
1. Click "Knowledge" button in Header → dialog opens
2. Click overlay or press Escape → dialog closes
3. Click "Knowledge" button again → dialog reopens correctly
4. Open Settings dialog → Knowledge dialog should not be open simultaneously

**Expected:** Dialog state is managed correctly through useUIStore.activeDialog.

## Test 14: Multi-File Upload
**Steps:**
1. Open KnowledgeDialog → Files tab
2. Drag multiple files (e.g., 3 text files) at once
3. Verify all files are processed sequentially (one at a time)
4. Verify each produces its own success toast
5. Switch to Library tab and verify all items are present

**Expected:** Sequential processing handles multiple files without server overload.

## Test 15: Component Line Count Compliance
**Steps:**
1. Run `wc -l src/components/knowledge/*.tsx`
2. Verify all files are under 300 lines
3. Run `wc -l src/stores/knowledge-store.ts`
4. Verify store is under 300 lines

**Expected:** FileUpload ≤ 183, UrlCrawler ≤ 167, KnowledgeList ≤ 199, KnowledgeDialog ≤ 104, knowledge-store ≤ 161.

---

## Edge Cases

- **Empty file upload:** Uploading a 0-byte file should produce a parse error, not crash
- **Very large PDF:** Should eventually complete or timeout gracefully (known limitation: no timeout yet)
- **Crawl a URL that returns 404:** Should show error toast with failure message
- **Delete already-deleted item:** Should be a no-op, not crash
- **Search with empty store:** Should show empty state message, not error

