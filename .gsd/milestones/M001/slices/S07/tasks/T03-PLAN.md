---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T03: Knowledge UI — dialog, file upload, URL crawler, and library list

**Slice:** S07 — Knowledge Base
**Milestone:** M001

## Description

Build the Knowledge UI components following the Obsidian Deep design system and the established dialog patterns from SettingsDialog and HistoryDialog. The KnowledgeDialog is a tabbed container with Files (drag-and-drop upload), URLs (URL input with crawler selection), and Library (searchable list of all knowledge items) tabs. All components must stay under 300 lines.

## Steps

1. **Create FileUpload component** (`src/components/knowledge/FileUpload.tsx`):
   - Drag-and-drop zone with click-to-browse fallback.
   - File type validation: accept PDF, Office, and text MIME types.
   - On file selection: read as ArrayBuffer, POST to `/api/knowledge/parse` as FormData, show progress indicator.
   - On parse success: create KnowledgeItem with nanoid ID, call `useKnowledgeStore.add()`, show success toast.
   - On parse failure: show error toast with file name and error message.
   - Multiple file support: process files sequentially to avoid overloading.
   - Style: dashed border drop zone, Obsidian Deep surface-raised background, Upload icon from lucide-react.
   - Keep under 200 lines.

2. **Create UrlCrawler component** (`src/components/knowledge/UrlCrawler.tsx`):
   - URL input field with validation (must be valid http/https URL).
   - Crawler selector: dropdown or radio to choose "Jina Reader" or "Local".
   - Submit button: POST to `/api/knowledge/crawl` with `{ url, crawler }`.
   - On success: create KnowledgeItem with nanoid ID, call `useKnowledgeStore.add()`, show success toast.
   - On failure: show error toast.
   - Style: consistent with other form components (Input, Select from shadcn/ui).
   - Keep under 150 lines.

3. **Create KnowledgeList component** (`src/components/knowledge/KnowledgeList.tsx`):
   - Search input at top for Fuse.js fuzzy search.
   - List of knowledge items as cards/rows showing: title, type badge (file/url), file type or URL, date added, chunk count, content preview (truncated to 200 chars).
   - Delete button per item with confirmation (same pattern as HistoryDialog).
   - Empty state: "No knowledge items yet. Upload files or crawl URLs to get started."
   - Style: consistent with HistoryDialog session cards.
   - Keep under 200 lines.

4. **Create KnowledgeDialog component** (`src/components/knowledge/KnowledgeDialog.tsx`):
   - Uses shadcn Dialog with Radix Tabs (same pattern as SettingsDialog).
   - Three tabs: "Files" (FileUpload), "URLs" (UrlCrawler), "Library" (KnowledgeList).
   - Controlled by `useUIStore.activeDialog === "knowledge"`.
   - Glassmorphism backdrop-blur-xl styling (same as SettingsDialog/HistoryDialog).
   - Dialog title: "Knowledge Base".
   - DialogDescription for accessibility.
   - Keep under 150 lines.

5. **Self-check**: Run `wc -l src/components/knowledge/*.tsx` to verify all components are under 300 lines.

## Must-Haves

- [ ] FileUpload with drag-and-drop, file type validation, POST to /api/knowledge/parse, toast feedback
- [ ] UrlCrawler with URL input, Jina/Local selector, POST to /api/knowledge/crawl, toast feedback
- [ ] KnowledgeList with Fuse.js search, item cards, delete with confirmation, empty state
- [ ] KnowledgeDialog with 3 tabs (Files, URLs, Library), glassmorphism styling
- [ ] All 4 components under 300 lines each
- [ ] All components use Obsidian Deep design tokens (dark-only, tonal surfaces)

## Verification

- `pnpm build` — Clean build with zero type/lint errors
- `wc -l src/components/knowledge/*.tsx` — All components under 300 lines

## Inputs

- `src/stores/knowledge-store.ts` — Knowledge store from T02 (add, remove, search actions)
- `src/engine/knowledge/types.ts` — KnowledgeItem type and MIME type constants from T01
- `src/components/settings/SettingsDialog.tsx` — Reference pattern for tabbed dialog with glassmorphism
- `src/components/settings/HistoryDialog.tsx` — Reference pattern for list with delete confirmation
- `src/stores/ui-store.ts` — DialogType for controlling dialog open/close (will add "knowledge" in T04, but import the type)

## Expected Output

- `src/components/knowledge/KnowledgeDialog.tsx` — Main tabbed dialog container
- `src/components/knowledge/FileUpload.tsx` — Drag-and-drop file upload component
- `src/components/knowledge/UrlCrawler.tsx` — URL crawl input component
- `src/components/knowledge/KnowledgeList.tsx` — Searchable knowledge item list
