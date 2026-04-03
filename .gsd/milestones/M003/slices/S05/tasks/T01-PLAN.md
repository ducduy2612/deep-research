---
estimated_steps: 6
estimated_files: 7
skills_used: []
---

# T01: Create download utility + wire report export (MD + PDF) in FinalReport

**Slice:** S05 — Export + Knowledge Base Integration
**Milestone:** M003

## Description

Install html2pdf.js. Create shared `downloadBlob()` utility and `exportReportAsPdf()` helper. Wire the un-wired Export button in FinalReport bottom bar to show a dropdown with MD and PDF download options. Add i18n keys for export options. Write unit tests for the download utility and PDF export helper.

## Steps

1. **Install html2pdf.js** — Run `pnpm add html2pdf.js`. Note: this package doesn't have great TypeScript types, so you'll need to create a declaration file `src/types/html2pdf.d.ts` with `declare module 'html2pdf.js'` exporting the html2pdf function type.

2. **Create `src/utils/download.ts`** — Shared `downloadBlob(filename: string, content: string | Blob, mimeType?: string)` utility:
   - If content is a string, create a Blob with the given mimeType (default: `text/plain;charset=utf-8`)
   - Create `URL.createObjectURL(blob)`
   - Create a hidden `<a>` element with `href` = object URL, `download` = filename
   - Append to body, click(), remove from body
   - `URL.revokeObjectURL()` in a setTimeout(0) to avoid premature cleanup
   - Keep it small (~15 lines)

3. **Create `src/utils/export-pdf.ts`** — `exportReportAsPdf(markdown: string, title: string)` async function:
   - Import `marked` from "marked" (already in deps) to convert markdown → HTML
   - Import `html2pdf` from "html2pdf.js"
   - Create a hidden container div with proper styling for PDF output:
     - Apply basic typography: font-family sans-serif, proper margins, color #1a1a2e (dark text for print)
     - Use `marked.parse(markdown)` to get HTML string
     - Set `container.innerHTML = html`
   - Append container to `document.body` temporarily
   - Call `html2pdf().set(options).from(container).save()` with options:
     - filename: `${title}.pdf` (sanitize title for filesystem)
     - margin: [10, 10, 10, 10] mm
     - image: { type: 'jpeg', quality: 0.98 }
     - html2canvas: { scale: 2 }
     - jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
   - Remove container from DOM after generation
   - Wrap in try/catch, log errors to console
   - Export a `sanitizeFilename(name: string): string` helper that replaces non-alphanumeric chars with `-`, collapses multiple `-`, trims to 80 chars

4. **Wire FinalReport export button** — Modify `src/components/research/FinalReport.tsx`:
   - Add state: `const [exportOpen, setExportOpen] = useState(false)`
   - Add a ref for click-outside detection: `const dropdownRef = useRef<HTMLDivElement>(null)` + useEffect for click-outside
   - Replace the existing Export `<Button>` (line ~158) with a dropdown wrapper:
     ```
     <div ref={dropdownRef} className="relative">
       <Button size="sm" onClick={() => setExportOpen(!exportOpen)} className="bg-obsidian-primary font-bold text-[#1000a9]">
         <Download className="mr-1 h-4 w-4" />
         {t("export")}
         <ChevronDown className="ml-1 h-3 w-3" />
       </Button>
       {exportOpen && (
         <div className="absolute bottom-full right-0 mb-2 ...dropdown styling...">
           <button onClick={handleExportMd}>Download Markdown</button>
           <button onClick={handleExportPdf}>Download PDF</button>
         </div>
       )}
     </div>
     ```
   - `handleExportMd`: read `result.report` and `result.title` from store, call `downloadBlob(sanitizeFilename(result.title) + ".md", result.report, "text/markdown;charset=utf-8")`
   - `handleExportPdf`: call `exportReportAsPdf(result.report, result.title)`, then close dropdown
   - Both handlers close the dropdown after triggering download
   - Add imports for `downloadBlob` from `@/utils/download` and `exportReportAsPdf` from `@/utils/export-pdf`
   - Keep the file under 500 lines (currently 188, should stay well under)

5. **Add i18n keys** — Add to `messages/en.json` under the existing "Report" namespace:
   - `"exportMarkdown": "Download Markdown"`
   - `"exportPdf": "Download PDF"`
   
   Add to `messages/vi.json` under "Report":
   - `"exportMarkdown": "Tải Markdown"`
   - `"exportPdf": "Tải PDF"`

6. **Write tests:**
   - `src/utils/__tests__/download.test.ts` — Test `downloadBlob`:
     - Mock `URL.createObjectURL`, `URL.revokeObjectURL`
     - Verify it creates a Blob with correct MIME type
     - Verify it creates and clicks an `<a>` element with correct download attribute
     - Test with string content and with Blob content
   
   - `src/utils/__tests__/export-pdf.test.ts` — Test `exportReportAsPdf` and `sanitizeFilename`:
     - Mock `html2pdf.js` module entirely
     - Test `sanitizeFilename`: empty string, special chars, long strings, unicode
     - Test `exportReportAsPdf`: verify it creates DOM element, calls html2pdf with correct options, cleans up DOM
     - Test error handling: html2pdf throws, verify it doesn't crash

## Must-Haves

- [ ] `src/utils/download.ts` exports `downloadBlob(filename, content, mimeType?)` 
- [ ] `src/utils/export-pdf.ts` exports `exportReportAsPdf(markdown, title)` and `sanitizeFilename(name)`
- [ ] FinalReport Export button opens dropdown with "Download Markdown" and "Download PDF" options
- [ ] MD export produces a .md file with report content, filename derived from report title
- [ ] PDF export renders markdown to HTML then captures as PDF via html2pdf.js
- [ ] All new strings use i18n keys (en.json + vi.json)
- [ ] Unit tests pass for download utility and PDF export helper
- [ ] FinalReport.tsx stays under 500 lines

## Verification

- `pnpm vitest run src/utils/__tests__/download.test.ts src/utils/__tests__/export-pdf.test.ts`
- `pnpm build` — TypeScript compiles, no type errors
- `pnpm lint` — ESLint clean on all modified files

## Inputs

- `src/components/research/FinalReport.tsx` — current FinalReport with un-wired Export button (188 lines)
- `src/components/MarkdownRenderer.tsx` — uses `marked` for MD→HTML rendering (pattern to reuse)
- `src/stores/research-store.ts` — has `result` field with `ResearchResult { title, report, learnings, sources, images }`
- `src/engine/research/types.ts` — `ResearchResult` type definition
- `messages/en.json` — existing "Report" namespace with export key
- `messages/vi.json` — Vietnamese translations

## Expected Output

- `src/utils/download.ts` — shared `downloadBlob()` utility function
- `src/utils/export-pdf.ts` — `exportReportAsPdf()` and `sanitizeFilename()` helpers
- `src/types/html2pdf.d.ts` — TypeScript declaration for html2pdf.js
- `src/utils/__tests__/download.test.ts` — unit tests for downloadBlob
- `src/utils/__tests__/export-pdf.test.ts` — unit tests for exportReportAsPdf and sanitizeFilename
- `src/components/research/FinalReport.tsx` — export dropdown wired with MD + PDF handlers
- `messages/en.json` — added exportMarkdown, exportPdf keys to Report namespace
- `messages/vi.json` — added Vietnamese translations for new keys
