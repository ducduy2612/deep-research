# S06: Settings and History

**Goal:** Build tabbed Settings dialog (AI Models, Search, General, Advanced tabs) with Zod-validated persistence, prompt overrides, and a Research History dialog with localforage persistence, session CRUD, and auto-save on research completion.
**Demo:** After this: Tabbed settings dialog with Zod validation, prompt customization, research history with localforage persistence.

## Tasks
- [x] **T01: Created useHistoryStore with Zod-validated localforage persistence, FIFO quota, and HistoryDialog with filters, search, delete, and view-report** — Create useHistoryStore with localforage persistence and Zod validation, plus HistoryDialog component with session cards, filter chips, search, stats row, delete, and view-report action.

## Steps

1. Create `src/stores/history-store.ts`:
   - Define `HistorySession` interface: `{ id, topic, title, state, startedAt, completedAt, report, learnings, sources, images, reportStyle, reportLength }`
   - Create `historySessionSchema` using Zod (reuse `sourceSchema`, `imageSourceSchema` from research types)
   - State: `sessions: HistorySession[]`, `loaded: boolean`
   - Actions: `hydrate()`, `save(session)`, `remove(id)`, `load(id)`, `clearAll()`
   - Persist to localforage key `"history"` with Zod validation
   - Quota management: on `save()`, if `sessions.length >= 100`, remove oldest session (FIFO)
   - Follow same fire-and-forget persistence pattern as settings-store.ts
   - Export selectors: `selectSessionCount`, `selectSessionsByFilter`

2. Add barrel export for history store in `src/stores/index.ts`

3. Create `src/stores/__tests__/history-store.test.ts`:
   - Mock `@/lib/storage` same pattern as settings-store.test.ts
   - Test: initial state, hydrate, save session, remove session, clearAll, FIFO quota at 100 sessions, selectors
   - Test: hydrate with corrupted data falls back to empty
   - Test: save persists via storage.set()

4. Create `src/components/settings/HistoryDialog.tsx`:
   - Dialog wrapper using shadcn Dialog component with glassmorphism styling
   - Controlled by `useUIStore.activeDialog === "history"`
   - Stats row at top: total sessions, sessions this week, total sources
   - Filter chips: All / Completed / Failed (controlled by local state)
   - Search input that filters sessions by title/topic
   - Session cards showing: title, date (relative), status badge (completed=green, failed=red, aborted=yellow), source count
   - Each card has: "View Report" button, "Delete" button (with confirmation)
   - View Report action: loads session data into useResearchStore and navigates to report view
   - Empty state when no sessions
   - Use Obsidian Deep tokens: `bg-obsidian-surface-deck`, `text-obsidian-on-surface`, etc.
   - Must stay under 300 lines

## Must-Haves
- [ ] useHistoryStore with Zod-validated localforage persistence and 100-session FIFO quota
- [ ] HistoryDialog with session list, filters, search, delete, and view-report
- [ ] History store tests passing

## Verification
- `pnpm vitest run src/stores/__tests__/history-store.test.ts` — all history store tests pass
- `pnpm build` — no type errors
- HistoryDialog.tsx is under 300 lines: `wc -l src/components/settings/HistoryDialog.tsx`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| localforage (IndexedDB) | Catch and log, keep in-memory state | N/A | Zod validation rejects, falls back to defaults |

## Negative Tests

- **Malformed inputs**: Corrupted storage data → falls back to empty sessions
- **Error paths**: Storage write failure → silently ignored (fire-and-forget)
- **Boundary conditions**: 100 sessions → oldest deleted on next save; empty session list → empty state shown
  - Estimate: 2h
  - Files: src/stores/history-store.ts, src/stores/__tests__/history-store.test.ts, src/components/settings/HistoryDialog.tsx, src/stores/index.ts
  - Verify: pnpm vitest run src/stores/__tests__/history-store.test.ts && pnpm build
- [x] **T02: Extended settings store with prompt overrides/advanced fields, built 4-tab SettingsDialog (AI Models, Search, General, Advanced) with sub-components** — Extend useSettingsStore with promptOverrides, autoReviewRounds, maxSearchQueries fields. Build 4-tab SettingsDialog with sub-components for each tab.

## Steps

1. Extend `src/stores/settings-store.ts`:
   - Add to state: `promptOverrides: Record<string, string>` (default: `{}`), `autoReviewRounds: number` (default: 0), `maxSearchQueries: number` (default: 8)
   - Add actions: `setPromptOverrides(overrides)`, `setAutoReviewRounds(rounds)`, `setMaxSearchQueries(max)`
   - Update `settingsSchema` Zod schema to include: `promptOverrides: z.record(z.string(), z.string())`, `autoReviewRounds: z.number().int().min(0).max(5)`, `maxSearchQueries: z.number().int().min(1).max(30)`
   - Update `DEFAULT_STATE` with new fields
   - Update `persistSettings()` to include new fields in `toSave` object
   - Update `reset()` to include new fields in default reset

2. Update `src/stores/__tests__/settings-store.test.ts`:
   - Add tests for: default values of new fields, setPromptOverrides, setAutoReviewRounds, setMaxSearchQueries
   - Add test: new fields persist via storage.set
   - Add test: hydrate loads new fields from storage

3. Create `src/components/settings/SettingsDialog.tsx`:
   - Tabbed dialog using shadcn Tabs component
   - 4 tabs: AI Models, Search, General, Advanced
   - Controlled by `useUIStore.activeDialog === "settings"`
   - Glassmorphism dialog: `backdrop-blur-xl bg-[rgba(32,31,34,0.6)]`
   - Each tab rendered as a separate sub-component (imported)
   - Container under 300 lines

4. Create `src/components/settings/AIModelsTab.tsx`:
   - Provider cards for: google, openai, deepseek, openrouter, groq, xai
   - Each card: provider name, API key input (masked `sk-••••••••`), optional base URL input, enable toggle
   - Reads/writes via `useSettingsStore.setProvider()` / `removeProvider()`
   - Show enabled model count per provider (informational badge)
   - Under 300 lines

5. Create `src/components/settings/SearchTab.tsx`:
   - Search provider selector (radio buttons or select): tavily, firecrawl, exa, brave, searxng, model-native
   - API key input for selected provider
   - Base URL input (shown for searxng and other configurable providers)
   - Scope input, max results number input
   - Domain filters section: include textarea (one domain per line), exclude textarea
   - Citation images toggle
   - Reads/writes via settings store actions
   - Under 300 lines

6. Create `src/components/settings/GeneralTab.tsx`:
   - Language text input
   - Report style selector: balanced / executive / technical / concise (button list, same pattern as ReportConfig)
   - Report length selector: brief / standard / comprehensive (button list)
   - Auto-review rounds slider (0-5) with label showing current value
   - Max search queries slider (1-30) with label showing current value
   - Reads/writes via settings store actions
   - Under 300 lines

7. Create `src/components/settings/AdvancedTab.tsx`:
   - Prompt overrides section with 8 labeled textareas:
     - System, Clarify, Plan, SERP Queries, Analyze, Review, Report, Output Guidelines
   - Each textarea shows the prompt key as label, value from `promptOverrides[key]`
   - Empty textarea = use default (no override)
   - Save prompt overrides to settings store on blur (not on every keystroke)
   - Reset all settings button at bottom (calls `settingsStore.reset()`)
   - Under 300 lines

## Must-Haves
- [ ] useSettingsStore extended with promptOverrides, autoReviewRounds, maxSearchQueries
- [ ] SettingsDialog with 4 tabs rendering sub-components
- [ ] AIModelsTab with 6 provider cards
- [ ] SearchTab with provider selector, domain filters, citation toggle
- [ ] GeneralTab with report config and sliders
- [ ] AdvancedTab with 8 prompt override textareas
- [ ] All settings store tests updated and passing
- [ ] All components under 300 lines

## Verification
- `pnpm vitest run src/stores/__tests__/settings-store.test.ts` — all settings tests pass including new fields
- `pnpm build` — no type errors
- All settings components under 300 lines: `wc -l src/components/settings/*.tsx`

## Negative Tests

- **Malformed inputs**: Empty API key string → still saves but won't be used (selectEnabledProviders filters)
- **Error paths**: Storage write failure → silently ignored
- **Boundary conditions**: autoReviewRounds 0-5 enforced by Zod, maxSearchQueries 1-30 enforced by Zod
  - Estimate: 2.5h
  - Files: src/stores/settings-store.ts, src/stores/__tests__/settings-store.test.ts, src/components/settings/SettingsDialog.tsx, src/components/settings/AIModelsTab.tsx, src/components/settings/SearchTab.tsx, src/components/settings/GeneralTab.tsx, src/components/settings/AdvancedTab.tsx
  - Verify: pnpm vitest run src/stores/__tests__/settings-store.test.ts && pnpm build && wc -l src/components/settings/*.tsx
- [x] **T03: Wire history auto-save into useResearch hook, send prompt overrides and advanced settings to SSE route, mount both dialogs in page.tsx, hydrate history store on startup** — Wire history auto-save into useResearch hook, send new settings fields to SSE route, mount both dialogs in page.tsx, and verify everything works together.

## Steps

1. Update `src/hooks/use-research.ts`:
   - Import `useHistoryStore` from history store
   - Import settings selectors for `promptOverrides`, `autoReviewRounds`, `maxSearchQueries`
   - Read these 3 new fields from `useSettingsStore` in the hook body
   - Add them to the request body in `connectSSE()`: `{ ...existingBody, promptOverrides, autoReviewRounds, maxSearchQueries }`
   - In the SSE event handler (inside `createSSEBuffer` callback), when `eventType === "done"` and the research completed (not failed), auto-save the session to history:
     - Get current result from `useResearchStore.getState().result`
     - Get topic, startedAt, state, reportStyle, reportLength from research store
     - Call `useHistoryStore.getState().save({ id, topic, title: result?.title ?? topic, ... })`
   - Only auto-save if `result` exists (not all failed runs produce a result)

2. Update `src/app/page.tsx`:
   - Import `SettingsDialog` and `HistoryDialog`
   - Import `useUIStore` selector for `activeDialog`
   - Render both dialogs after the main content area, controlled by `activeDialog`
   - Each dialog handles its own open/close via `useUIStore`

3. Update `src/stores/index.ts`:
   - Add barrel exports for history store (if not done in T01)

4. Update `src/app/providers.tsx`:
   - Also hydrate the history store on startup (call `useHistoryStore.getState().hydrate()`)

5. Update existing tests:
   - `src/hooks/__tests__/use-research.test.ts` — verify prompt overrides, autoReviewRounds, maxSearchQueries are included in request body
   - `src/stores/__tests__/research-store.test.ts` — verify handleEvent("done") works correctly

6. Run full test suite and production build:
   - `pnpm vitest run` — all tests pass
   - `pnpm build` — no type errors

## Must-Haves
- [ ] useResearch sends promptOverrides, autoReviewRounds, maxSearchQueries in SSE request body
- [ ] Completed research sessions auto-saved to history store on "done" event
- [ ] SettingsDialog and HistoryDialog mounted in page.tsx
- [ ] History store hydrated on app startup
- [ ] All tests pass, clean production build

## Verification
- `pnpm vitest run` — all tests pass (345+ existing + new)
- `pnpm build` — clean production build
- Verify dialog opens: Settings button in Header → dialog appears; History button → dialog appears

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| History store (auto-save) | Catch and log, does not block research flow | N/A | N/A |
| Settings store (read) | Returns defaults if not hydrated | N/A | N/A |

## Negative Tests

- **Malformed inputs**: No result on done event → skip auto-save gracefully
- **Error paths**: History save fails → logged to console, research flow continues
- **Boundary conditions**: Abort before completion → no auto-save triggered
  - Estimate: 1.5h
  - Files: src/hooks/use-research.ts, src/app/page.tsx, src/stores/index.ts, src/app/providers.tsx, src/hooks/__tests__/use-research.test.ts
  - Verify: pnpm vitest run && pnpm build
