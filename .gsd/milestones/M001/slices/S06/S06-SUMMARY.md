---
id: S06
parent: M001
milestone: M001
provides:
  - useHistoryStore — session persistence with FIFO quota, hydrate/save/remove/load/clearAll
  - useSettingsStore extended — promptOverrides, autoReviewRounds, maxSearchQueries
  - SettingsDialog — 4-tab container with AIModelsTab, SearchTab, GeneralTab, AdvancedTab
  - HistoryDialog — session list with filters, search, delete, view-report
  - Auto-save on research completion wired into useResearch hook
requires:
  - slice: S01
    provides: Zustand store patterns, localforage storage abstraction, shadcn/ui components, Obsidian Deep design tokens
  - slice: S02
    provides: Provider configuration types and model registry used in AIModelsTab
  - slice: S05
    provides: useResearchStore for view-report action, useUIStore for dialog control, SSE hook for auto-save wiring
affects:
  - S07
key_files:
  - src/stores/history-store.ts
  - src/stores/__tests__/history-store.test.ts
  - src/components/settings/HistoryDialog.tsx
  - src/stores/settings-store.ts
  - src/stores/__tests__/settings-store.test.ts
  - src/components/settings/SettingsDialog.tsx
  - src/components/settings/AIModelsTab.tsx
  - src/components/settings/SearchTab.tsx
  - src/components/settings/GeneralTab.tsx
  - src/components/settings/AdvancedTab.tsx
  - src/hooks/use-research.ts
  - src/hooks/__tests__/use-research.test.ts
  - src/app/page.tsx
  - src/app/providers.tsx
  - src/stores/index.ts
key_decisions:
  - Prompt overrides use Partial<Record<PromptOverrideKey, string>> for type-safe storage
  - AdvancedTab saves overrides on blur (not keystroke) to avoid excessive persistence writes
  - AIModelsTab uses local state for input editing with explicit Save button pattern
  - SearchTab conditionally renders API key / base URL fields based on provider capabilities
  - Auto-save uses try/catch to ensure history failures never block research flow
  - Empty promptOverrides sent as undefined (not {}) in SSE request body
  - Session IDs use topic + startedAt timestamp for uniqueness
patterns_established:
  - Zod-validated localforage store pattern (history store follows settings store)
  - Blur-save pattern for textarea persistence (AdvancedTab)
  - Inline sub-components for line-count control (HistoryDialog)
  - Glassmorphism dialog pattern with backdrop-blur-xl and semi-transparent bg
  - Conditional field rendering based on provider capabilities (SearchTab)
  - Auto-save on research completion via SSE done event handler
observability_surfaces:
  - Console warning when oldest session evicted by FIFO quota
  - Console error logged when auto-save fails (non-blocking)
drill_down_paths:
  - milestones/M001/slices/S06/tasks/T01-SUMMARY.md
  - milestones/M001/slices/S06/tasks/T02-SUMMARY.md
  - milestones/M001/slices/S06/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T20:53:36.547Z
blocker_discovered: false
---

# S06: Settings and History

**Built tabbed Settings dialog (AI Models, Search, General, Advanced) with Zod-validated persistence, prompt overrides, and Research History dialog with localforage persistence, session CRUD, and auto-save on research completion.**

## What Happened

S06 delivered the full settings and history surface for the Deep Research app across three tasks:

**T01 — History Store + HistoryDialog:** Created `useHistoryStore` following the established settings-store pattern — Zustand store with localforage persistence, Zod schema validation (reusing sourceSchema/imageSourceSchema from research types), and fire-and-forget writes. Implemented 100-session FIFO quota management with console warning on eviction. Built HistoryDialog (300 lines) with shadcn Dialog, stats row showing total sessions/sessions this week/total sources, filter chips (All/Completed/Failed), search input, session cards with status badges and relative timestamps, delete with confirmation, and view-report action that loads session data into the research store. 18 history store tests cover initial state, hydrate (including corrupted data fallback), save, FIFO quota enforcement, remove, load, clearAll, and selectors.

**T02 — Settings Store Extension + SettingsDialog:** Extended `useSettingsStore` with three new Zod-validated fields: `promptOverrides` (Partial<Record<PromptOverrideKey, string>>), `autoReviewRounds` (0-5), and `maxSearchQueries` (1-30). Added 6 new store actions and updated persistence/reset to include new fields. Built the 4-tab SettingsDialog container with Radix Tabs and glassmorphism backdrop. Created AIModelsTab (188 lines) with 6 provider cards featuring API key input, optional base URL, and enable toggle. Created SearchTab (215 lines) with 6 search providers, conditional API key/base URL fields, domain filter textareas, and citation images toggle. Created GeneralTab (182 lines) with language input, style/length selectors, and auto-review rounds/max search queries sliders. Created AdvancedTab (69 lines) with 8 prompt override textareas using blur-save pattern and reset-all button. All 33 settings tests pass. Also fixed two pre-existing build errors (duplicated useMemo in HistoryDialog, unused eslint-disable in prompts.ts).

**T03 — Wiring:** Extended useResearch hook with three new settings selectors and included them in the SSE request body in connectSSE(). Added auto-save logic: when a done event fires and result exists in research store, the session is saved to history store with full metadata. Auto-save is wrapped in try/catch so history failures never block research flow. Mounted SettingsDialog and HistoryDialog in page.tsx after the main content area, controlled by useUIStore.activeDialog. Added history store hydration to providers.tsx alongside existing settings hydration. Added 4 new integration tests. Compacted use-research.test.ts from 566 to 268 lines to comply with 300-line ESLint max-lines rule.

All 378 tests pass across 17 test files. Production build succeeds with zero type/lint errors. All 6 settings components are under 300 lines.

## Verification

**Slice-level verification (all passing):**
- `pnpm vitest run` — 378/378 tests pass across 17 test files
- `pnpm build` — clean production build with zero type/lint errors
- `wc -l src/components/settings/*.tsx` — all 6 components under 300 lines (AIModelsTab=188, AdvancedTab=69, GeneralTab=182, HistoryDialog=300, SearchTab=215, SettingsDialog=106)

**Per-task verification:**
- T01: 18 history store tests pass, build clean, HistoryDialog exactly 300 lines
- T02: 33 settings store tests pass, build clean, all components verified under 300 lines
- T03: 4 new integration tests pass, full test suite green (378 tests), build clean

## Requirements Advanced

- SET-01 — Built 4-tab SettingsDialog (AI Models, Search, General, Advanced) with all configuration surfaces
- SET-02 — All settings fields Zod-validated with clear constraints (autoReviewRounds 0-5, maxSearchQueries 1-30, promptOverrides record)
- SET-03 — AdvancedTab provides 8 prompt override textareas (System, Clarify, Plan, SERP Queries, Analyze, Review, Report, Output Guidelines)
- SET-04 — Both settings and history stores persist to localforage with Zod validation and fire-and-forget writes
- SET-05 — All 6 settings components verified under 300 lines (max is HistoryDialog at 300, min is AdvancedTab at 69)
- HIST-01 — HistoryDialog shows session cards with title, date (relative), status badge, and source count
- HIST-02 — View Report action loads past session into research store for full report/source viewing
- HIST-03 — Delete button on each session card with confirmation dialog
- HIST-04 — useHistoryStore persists to localforage with 100-session FIFO quota, Zod validation, and corrupted-data fallback

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All planned store extensions, UI components, and wiring implemented as specified.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/stores/history-store.ts` — New — History store with Zod-validated localforage persistence, FIFO quota, hydrate/save/remove/load/clearAll
- `src/stores/__tests__/history-store.test.ts` — New — 18 tests covering store lifecycle, FIFO quota, selectors, corruption fallback
- `src/components/settings/HistoryDialog.tsx` — New — History dialog with stats, filters, search, session cards, delete, view-report
- `src/stores/settings-store.ts` — Extended — Added promptOverrides, autoReviewRounds, maxSearchQueries with Zod validation
- `src/stores/__tests__/settings-store.test.ts` — Extended — 33 tests including new field defaults, setters, persistence, hydration, reset
- `src/components/settings/SettingsDialog.tsx` — New — 4-tab container with Radix Tabs and glassmorphism
- `src/components/settings/AIModelsTab.tsx` — New — 6 provider cards with API key, base URL, enable toggle
- `src/components/settings/SearchTab.tsx` — New — Search provider selector, domain filters, citation toggle
- `src/components/settings/GeneralTab.tsx` — New — Language, style/length selectors, sliders for review rounds and search queries
- `src/components/settings/AdvancedTab.tsx` — New — 8 prompt override textareas with blur-save, reset-all button
- `src/hooks/use-research.ts` — Extended — Sends promptOverrides/autoReviewRounds/maxSearchQueries in SSE body, auto-saves to history on done
- `src/hooks/__tests__/use-research.test.ts` — Extended — 4 new tests for settings in request body, auto-save, empty overrides
- `src/app/page.tsx` — Extended — Mounted SettingsDialog and HistoryDialog
- `src/app/providers.tsx` — Extended — Added history store hydration on startup
- `src/stores/index.ts` — Extended — Added history store barrel export
- `src/engine/research/prompts.ts` — Fixed — Removed unused eslint-disable comment
