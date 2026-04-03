---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T02: SearchResultCard + ManualQueryInput components

**Slice:** S03 — Research Workspace — Per-Task CRUD + Review Loop
**Milestone:** M003

## Description

Build two new presentational components for the research workspace. SearchResultCard renders a single search result with delete (X) and retry (↻) buttons, a collapsible learning section, and a source count badge. ManualQueryInput provides a text input + "Add" button with pending manual queries shown as removable chip/tag elements. Both components use store actions from T01.

## Steps

1. Create `src/components/research/SearchResultCard.tsx`:
   - Props: `result: SearchResult`, `index: number`
   - Header row: query text (truncated if long) + source count badge + retry button (↻ icon) + delete button (X icon)
   - Retry button: calls `useResearchStore.getState().retrySearchResult(index)` — use getState() in click handler, not hook subscription
   - Delete button: calls `useResearchStore.getState().removeSearchResult(index)`
   - Collapsible body: MarkdownRenderer for the learning text, with a chevron toggle
   - Source list: collapsed by default, expand to show source titles with external link icons
   - Styling: `bg-obsidian-surface-sheet` card, `border border-obsidian-outline-ghost/20`, rounded-lg
   - Buttons: small icon buttons with `hover:text-obsidian-error` for delete, `hover:text-obsidian-primary-deep` for retry
   - Use `useTranslations("SearchResultCard")` for all strings
   - Target: ~80-100 lines

2. Create `src/components/research/ManualQueryInput.tsx`:
   - Text input + "Add" button row at the top
   - Below: chip/tag list of pending manual queries, each with an X to remove
   - Add: reads input value, calls `useResearchStore.getState().setManualQueries([...current, newQuery])` then clears input
   - Remove chip: `useResearchStore.getState().setManualQueries(current.filter((_, i) => i !== idx))`
   - Subscribe to `manualQueries` from store for chip rendering
   - Styling: match existing input styling from ResearchActions suggestion textarea
   - Chips: `bg-obsidian-surface-raised rounded-full px-3 py-1 text-xs` with X button
   - Use `useTranslations("ManualQueryInput")` for all strings
   - Target: ~60-80 lines

3. Add i18n keys to `messages/en.json`:
   - `SearchResultCard.delete`: "Delete result"
   - `SearchResultCard.retry`: "Retry search"
   - `SearchResultCard.sources`: "{count} sources"
   - `SearchResultCard.learning`: "Learning"
   - `ManualQueryInput.placeholder`: "Add a search query..."
   - `ManualQueryInput.add`: "Add"

4. Add Vietnamese translations to `messages/vi.json` for all new keys.

5. Verify both components compile: `pnpm build` or type-check.

## Must-Haves

- [ ] SearchResultCard renders query, learning, source count, delete/retry buttons
- [ ] ManualQueryInput renders input + Add button + removable chip list
- [ ] Both use i18n for all user-facing strings
- [ ] Both components under 120 lines each
- [ ] TypeScript compiles clean

## Verification

- `pnpm build 2>&1 | tail -5` — build succeeds
- Both files under 120 lines: `wc -l src/components/research/SearchResultCard.tsx src/components/research/ManualQueryInput.tsx`

## Inputs

- `src/stores/research-store.ts` — removeSearchResult, retrySearchResult, setManualQueries actions (from T01)
- `src/engine/research/types.ts` — SearchResult, Source types
- `src/components/research/ResearchActions.tsx` — existing styling patterns to match
- `src/components/MarkdownRenderer.tsx` — for rendering learning markdown

## Expected Output

- `src/components/research/SearchResultCard.tsx` — card component with delete/retry buttons
- `src/components/research/ManualQueryInput.tsx` — input + chip list component
- `messages/en.json` — new i18n keys for SearchResultCard and ManualQueryInput
- `messages/vi.json` — Vietnamese translations
