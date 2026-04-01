# S06 Research: Settings and History

**Slice:** S06 — Settings and History
**Depends on:** S05 (complete)
**Research depth:** Targeted (known patterns: Zustand stores, localforage persistence, shadcn/ui dialogs, Zod validation — all established in prior slices)

## Summary

S06 builds two dialog-based features: (1) a tabbed Settings dialog for configuring AI providers, search, report preferences, domain filters, and prompt overrides, and (2) a Research History dialog for viewing/reopening/deleting past research sessions. Both are triggered from the Header component (already wired to `useUIStore.openDialog`). The settings store already exists with persistence — S06 adds prompt overrides to it and builds the UI. A new history store is needed for CRUD on past sessions via localforage. The useResearch hook needs a minor extension to send prompt overrides and to auto-save completed sessions to history.

## Requirements Owned

| Requirement | Description | Status |
|-------------|-------------|--------|
| SET-01 | Tabbed settings dialog (AI Models, Search, General, Advanced) | Active |
| SET-02 | Zod validation for all settings | Active |
| SET-03 | Prompt customization (override any pipeline prompt) | Active |
| SET-04 | Settings persist via localforage | Active (partially done — store exists, needs prompt overrides) |
| SET-05 | Settings sub-components each under 300 lines | Active |
| HIST-01 | View past research sessions list | Active |
| HIST-02 | Open past session and view full report | Active |
| HIST-03 | Delete individual research sessions | Active |
| HIST-04 | Persist research sessions to localforage with quota management | Active |

## Recommendation

**3-task decomposition:**

1. **T01 — History Store + History Dialog**: New `useHistoryStore` with localforage persistence, plus `HistoryDialog` component. Independent from settings work.
2. **T02 — Settings Store Extension + Settings Dialog**: Extend `useSettingsStore` with `promptOverrides` + `autoReviewRounds` + `maxSearchQueries` fields, build 4-tab `SettingsDialog` with sub-components.
3. **T03 — Integration + Auto-Save**: Wire history auto-save into `useResearch` hook (on completion), send prompt overrides from settings to SSE route, add both dialogs to page.tsx, verify build + tests.

## Implementation Landscape

### What Already Exists

1. **`useSettingsStore`** (`src/stores/settings-store.ts`, 262 lines) — Zustand store with localforage fire-and-forget persistence, Zod-validated schema. Has: providers, searchProvider, reportStyle, reportLength, language, domain filters, citationImages. **Missing**: promptOverrides, autoReviewRounds, maxSearchQueries.

2. **`useUIStore`** (`src/stores/ui-store.ts`, 102 lines) — Has `activeDialog: DialogType` (type is `"settings" | "history" | "about" | null`). Header already has `openDialog("settings")` and `openDialog("history")` buttons wired.

3. **`src/lib/storage.ts`** — Zod-validated localforage wrapper with `get()`, `set()`, `remove()`. Used by settings store. History store should use the same pattern.

4. **shadcn/ui components available**: dialog.tsx, tabs.tsx, input.tsx, textarea.tsx, select.tsx, button.tsx, label.tsx, form.tsx, slider.tsx, scroll-area.tsx, separator.tsx, tooltip.tsx, card.tsx. **All needed primitives exist.**

5. **SSE route** (`src/app/api/research/stream/route.ts`) — Already accepts `promptOverrides` and `autoReviewRounds` and `maxSearchQueries` in the request schema. **Server-side is ready.**

6. **`useResearch` hook** (`src/hooks/use-research.ts`) — Currently sends topic, language, reportStyle, reportLength, and search config. **Does NOT send promptOverrides, autoReviewRounds, or maxSearchQueries.**

7. **`ResearchResult` type** (`src/engine/research/types.ts`) — Has: title, report, learnings, sources, images. This is what gets saved to history.

8. **Prompt override system** (`src/engine/research/prompts.ts`) — Has `PromptOverrideKey` type with 8 keys (system, clarify, plan, serpQueries, analyze, review, report, outputGuidelines). Has `DEFAULT_PROMPTS` map and `resolvePrompt()` function.

### What Needs To Be Built

1. **History store** (`src/stores/history-store.ts`) — New Zustand store:
   - State: `sessions: HistorySession[]`
   - Actions: `hydrate()`, `save(session)`, `load(id)`, `remove(id)`, `clearAll()`
   - Schema: `{ id, topic, title, state, startedAt, completedAt, report, learnings, sources, images, reportStyle, reportLength }`
   - Persist to localforage with Zod validation
   - Quota management: cap at 100 sessions, delete oldest when exceeded

2. **History dialog** (`src/components/settings/HistoryDialog.tsx`) — Full-page-like dialog with:
   - Session cards showing title, date, status badge, source count, duration
   - "View Report" button → navigates to report view with loaded data
   - Delete button per session
   - Filter chips (All / Completed / Failed)
   - Stats row (total sessions, this week, total sources, avg time)
   - Search input filtering sessions by title

3. **Settings dialog** (`src/components/settings/SettingsDialog.tsx`) — Tabbed modal (4 tabs):
   - **AI Models tab**: Provider cards (Google, OpenAI, DeepSeek, OpenRouter, Groq, xAI) with API key input, base URL input, enable toggle. Per-provider enabled model count indicator.
   - **Search tab**: Search provider selector (Tavily, Firecrawl, Exa, Brave, SearXNG, model-native), API key, base URL, scope, max results. Domain filter include/exclude textareas. Citation images toggle.
   - **General tab**: Language selector, report style (balanced/executive/technical/concise), report length (brief/standard/comprehensive), auto-review rounds slider (0-5), max search queries slider.
   - **Advanced tab**: Prompt overrides textarea (YAML/JSON format with field labels), reset all settings button.

4. **Settings sub-components** (each under 300 lines):
   - `src/components/settings/AIModelsTab.tsx`
   - `src/components/settings/SearchTab.tsx`
   - `src/components/settings/GeneralTab.tsx`
   - `src/components/settings/AdvancedTab.tsx`

5. **Store extension** — Add to `useSettingsStore`:
   - `promptOverrides: Record<string, string>` (default: `{}`)
   - `autoReviewRounds: number` (default: 0)
   - `maxSearchQueries: number` (default: 8)
   - Actions: `setPromptOverrides()`, `setAutoReviewRounds()`, `setMaxSearchQueries()`
   - Update Zod schema for persistence

6. **useResearch extension** — Add to request body:
   - `promptOverrides` from settings store
   - `autoReviewRounds` from settings store
   - `maxSearchQueries` from settings store
   - On completion (terminal event), auto-save session to history store

7. **Page integration** — Add `SettingsDialog` and `HistoryDialog` to `src/app/page.tsx`, controlled by `useUIStore.activeDialog`.

### Design Reference

- Settings modal: `design/screens/05-settings-modal.html` — glassmorphism modal with tabbed navigation, model selectors, API config, sliders
- History page: `design/screens/06-research-history.html` — full-page layout with stats row, filter chips, session cards with accent bars, search

### Natural Seams

- **History is independent** — HistoryStore + HistoryDialog can be built without touching settings code
- **Settings is mostly independent** — Only touches useSettingsStore (extending it) and building new UI components
- **Integration is thin** — useResearch hook just reads 3 new fields from settings store and writes to history store on completion

### Constraints

1. **300-line component limit** — Settings dialog must split into tab sub-components. History dialog may need a SessionCard sub-component.
2. **Obsidian Deep design tokens** — Use existing CSS variables (`--obsidian-*` / Tailwind classes like `bg-obsidian-surface-deck`). Glassmorphism for dialogs: `backdrop-blur-xl bg-[rgba(32,31,34,0.6)]`.
3. **Fire-and-forget persistence** — Follow the existing pattern in settings-store.ts: call `storage.set()` without await, catch and ignore errors.
4. **Zod validation everywhere** — All store data validated on load from localforage. Settings form inputs validated on save.
5. **Dark-only design** — No light mode variants needed.
6. **API key masking** — Show `sk-••••••••` in UI, store full key in localforage.

### Testing Patterns

- Store tests mock `@/lib/storage` and test: initial state, hydrate, actions, persistence calls, selectors
- Component tests use `@testing-library/react` (already installed)
- Hook tests use `renderHook` from `@testing-library/react`
- All tests run via `pnpm vitest run`

## Don't Hand-Roll

Nothing novel here — all patterns established in prior slices.

## Pitfalls

1. **localStorage quota with history** — Research sessions can be 50-200KB each (especially with full report markdown). The history store MUST use localforage (IndexedDB), not localStorage. Cap sessions at ~100 and implement FIFO cleanup. The storage abstraction in `src/lib/storage.ts` already uses localforage, so just follow the pattern.

2. **Prompt overrides format** — The v0 used a custom text format parsed by `parseDeepResearchPromptOverrides()`. For v1, use a simpler approach: store as `Record<PromptOverrideKey, string>` in the settings store, with individual labeled textareas in the Advanced tab. No custom parser needed.

3. **History "view report" flow** — When user clicks "View Report" on a history session, the system needs to load the session data into `useResearchStore` (result, topic, etc.) and navigate to the report view. This means history store's `load()` returns a `ResearchResult`-compatible object that gets set on the research store.

4. **Dialog state vs. view state** — Settings is a dialog (overlay), but History could be either a dialog or a full view. The design mockup shows History as a full page. However, `useUIStore` already has `"history"` as a `DialogType`. For now, implement both as dialogs (simpler), with History being a large dialog. Can switch History to a full view later in S09 (PWA/i18n/Polish).
