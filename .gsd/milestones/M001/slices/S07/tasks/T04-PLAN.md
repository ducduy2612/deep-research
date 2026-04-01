---
estimated_steps: 5
estimated_files: 6
skills_used: []
---

# T04: Integration — Header button, dialog mounting, local-only mode, and SSE wiring

**Slice:** S07 — Knowledge Base
**Milestone:** M001

## Description

Wire the knowledge subsystem into the main application. This task connects all the pieces built in T01–T03: adds the Knowledge dialog type to the UI store, adds a Knowledge button to the Header, mounts the KnowledgeDialog in page.tsx, adds a local-only mode toggle to ReportConfig, and extends the SSE request to include knowledge content and local-only mode flag.

## Steps

1. **Extend useUIStore DialogType** (`src/stores/ui-store.ts`):
   - Change `DialogType` from `"settings" | "history" | "about" | null` to `"settings" | "history" | "knowledge" | "about" | null`.
   - This is a single-line type change. The existing `openDialog("knowledge")` calls in KnowledgeDialog will now be type-safe.

2. **Add Knowledge button to Header** (`src/components/Header.tsx`):
   - Add a new NavButton with `Database` icon (from lucide-react) between the "Report" and "History" buttons.
   - Label: "Knowledge".
   - onClick: `openDialog("knowledge")`.
   - No `active` prop (dialogs don't have active states like views).

3. **Mount KnowledgeDialog in page.tsx** (`src/app/page.tsx`):
   - Import `KnowledgeDialog` from `@/components/knowledge/KnowledgeDialog`.
   - Add `<KnowledgeDialog />` after `<HistoryDialog />` in the Global dialogs section.

4. **Add local-only mode toggle to ReportConfig** (`src/components/research/ReportConfig.tsx`):
   - Add a new toggle/switch below the existing config options: "Local Only Mode" with description "Research using only your knowledge base documents, no web search".
   - Controlled by `useSettingsStore` — add a new `localOnlyMode: boolean` field to settings store (default: false) with setter `setLocalOnlyMode`.
   - Also add a `selectedKnowledgeIds: string[]` field to settings store for which knowledge items to include in research.
   - Toggle uses shadcn/ui Switch component with Obsidian Deep styling.
   - When local-only is enabled, show a badge/indicator that web search is disabled.

5. **Extend use-research SSE request** (`src/hooks/use-research.ts`):
   - Import `useKnowledgeStore` and read selected knowledge items by IDs from settings.
   - In `connectSSE`, add to the request body:
     - `localOnly: boolean` — from settings store
     - `knowledgeContent: Array<{title: string, content: string}>` — loaded from knowledge store by selected IDs (only send content, not metadata)
   - Filter: only include knowledge items that exist in the store (defensive against deleted items).
   - If no knowledge items selected, send empty array (don't omit the field — server may need to distinguish "no knowledge" from "not sent").

6. **Update tests** (`src/hooks/__tests__/use-research.test.ts`):
   - Add 2-3 tests verifying: local-only flag is sent in request body, knowledge content is included when IDs are set, empty knowledge content array when no IDs.
   - Ensure test file stays under 300 lines.

## Must-Haves

- [ ] DialogType includes "knowledge"
- [ ] Knowledge button in Header with Database icon
- [ ] KnowledgeDialog mounted in page.tsx
- [ ] Local-only mode toggle in ReportConfig with settings store persistence
- [ ] selectedKnowledgeIds in settings store for knowledge item selection
- [ ] SSE request body includes localOnly flag and knowledge content array
- [ ] All existing tests still pass + new integration tests

## Verification

- `pnpm vitest run` — All tests pass (existing 378+ plus new knowledge tests)
- `pnpm build` — Clean production build with zero type/lint errors

## Inputs

- `src/stores/ui-store.ts` — DialogType to extend
- `src/components/Header.tsx` — Header to add Knowledge button
- `src/app/page.tsx` — Page to mount KnowledgeDialog
- `src/components/research/ReportConfig.tsx` — Config UI to add local-only toggle
- `src/hooks/use-research.ts` — SSE hook to extend with knowledge data
- `src/components/knowledge/KnowledgeDialog.tsx` — Dialog from T03 to mount
- `src/stores/knowledge-store.ts` — Knowledge store from T02 for loading item content
- `src/stores/settings-store.ts` — Settings store to add localOnlyMode and selectedKnowledgeIds

## Expected Output

- `src/stores/ui-store.ts` — Updated DialogType with "knowledge"
- `src/components/Header.tsx` — Updated with Knowledge NavButton
- `src/app/page.tsx` — Updated with KnowledgeDialog mounting
- `src/components/research/ReportConfig.tsx` — Updated with local-only mode toggle
- `src/hooks/use-research.ts` — Updated with knowledge content in SSE body
- `src/hooks/__tests__/use-research.test.ts` — Updated with new integration tests
