# S05: Export + Knowledge Base Integration — UAT

**Milestone:** M003
**Written:** 2026-04-03T18:07:53.579Z

# S05 UAT: Export + Knowledge Base Integration

## Preconditions
- App running at `http://localhost:3000` with `GOOGLE_GENERATIVE_AI_API_KEY` set in `.env.local`
- Fresh browser session (no cached state)
- Knowledge base empty or with known items

---

## Test 1: Download Report as Markdown

**Purpose:** Verify the MD export produces a downloadable .md file with report content.

1. Navigate to `http://localhost:3000` and start a new research session with any topic
2. Complete the full research flow (clarify → plan → research → report) or load a completed session from history
3. On the FinalReport screen, locate the Export button (Download icon) in the bottom bar
4. Click the Export button — a dropdown should appear with two options: "Download Markdown" and "Download PDF"
5. Click "Download Markdown"
6. **Expected:** Browser triggers a file download with:
   - Filename: `{sanitized-title}.md` (derived from report title, non-alphanumeric chars replaced with `-`)
   - Content: The full markdown report text
   - MIME type: `text/markdown;charset=utf-8`
7. Open the downloaded file and verify it contains the full report markdown

## Test 2: Download Report as PDF

**Purpose:** Verify the PDF export produces a properly formatted A4 PDF.

1. From the same FinalReport screen with the export dropdown open
2. Click "Download PDF"
3. **Expected:** Browser triggers a file download with:
   - Filename: `{sanitized-title}.pdf`
   - Valid PDF file (openable in any PDF viewer)
   - A4 format, portrait orientation
   - Report content rendered from markdown (headings, paragraphs, links visible)
4. Open the PDF and verify formatting is readable with proper typography

## Test 3: Export Single Search Result as Markdown

**Purpose:** Verify per-card MD export from the research workspace.

1. Navigate to a research session in the research phase (with at least one search result card)
2. On any SearchResultCard, locate the Download icon button (top-right area of the card)
3. Click the Download icon — a dropdown should appear with "Export as Markdown" and "Export as JSON"
4. Click "Export as Markdown"
5. **Expected:** Browser triggers a file download with:
   - Filename: `{sanitized-query}.md`
   - Content includes: `# {query}`, research goal, `## Learning` section with the learning text, and `## Sources` section with numbered links
   - If the result has no sources, the Sources section is omitted

## Test 4: Export Single Search Result as JSON

**Purpose:** Verify per-card JSON export.

1. From the same search result card dropdown
2. Click "Export as JSON"
3. **Expected:** Browser triggers a file download with:
   - Filename: `{sanitized-query}.json`
   - Content is a JSON array containing one SearchResult object
   - JSON includes: query, researchGoal, learning, sources array, images array
   - Pretty-printed (2-space indentation)

## Test 5: Add Search Result to Knowledge Base

**Purpose:** Verify the Add-to-KB button adds the result to the knowledge store.

1. On any SearchResultCard, locate the Database icon button (next to the Download button)
2. Note the current number of items in the knowledge base (check Settings → Knowledge Base)
3. Click the Database icon button
4. **Expected:** A success toast appears (e.g., "Added to knowledge base")
5. Navigate to Settings → Knowledge Base
6. **Expected:** A new entry appears with:
   - Title: the search result's query text
   - Content: the learning text + "Sources:" section with source URLs
   - Type: "file"
7. The entry persists after page refresh

## Test 6: Export Dropdown Close on Outside Click

**Purpose:** Verify click-outside-to-close behavior on both export dropdowns.

1. On the FinalReport screen, click the Export button — dropdown opens
2. Click anywhere outside the dropdown (not on any menu item)
3. **Expected:** Dropdown closes without triggering any download
4. Navigate to a research workspace, click the Download icon on a SearchResultCard — dropdown opens
5. Click outside the dropdown
6. **Expected:** Dropdown closes without triggering any download

## Test 7: Filename Sanitization

**Purpose:** Verify filenames are safe for all filesystems.

1. For a report titled "AI/ML in 2024: What's New?", trigger a Markdown download
2. **Expected:** Filename is `AI-ML-in-2024-What-s-New.md` (special chars replaced with `-`, no leading/trailing `-`)
3. For a search result with query "How does quantum computing work?", trigger an MD export
4. **Expected:** Filename is `How-does-quantum-computing-work.md`

## Test 8: Full Suite Pass

**Purpose:** Verify no regressions.

1. Run `pnpm vitest run` — all 732 tests pass
2. Run `pnpm build` — compiles without errors
3. Run `pnpm lint` — no warnings or errors
