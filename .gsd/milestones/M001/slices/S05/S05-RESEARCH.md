# S05 Research: Core Research UI

**Slice:** S05 — Core Research UI
**Calibration:** Targeted — known technology (React, Zustand, shadcn/ui, markdown rendering), new to this codebase. The engine layer is complete; this is wiring the UI to it.

## Summary

S05 builds all user-facing research screens: the Research Hub (topic input), Active Research (streaming 3-panel progress), Final Report (markdown display), and report configuration. It creates Zustand stores for research state and settings, a `useResearch` hook as the thin adapter over the `ResearchOrchestrator`, and a markdown renderer for the final report. This is the first slice with significant React code — everything through S04 was engine-side TypeScript.

## Requirements Owned

| ID | Requirement | S05 Scope |
|----|-------------|-----------|
| RES-01 | Research topic input via Hub screen | ✅ Primary — glassmorphism search bar, presets, submit |
| RES-02 | Real-time streaming progress display | ✅ Primary — 3-panel layout, workflow progress bar, streaming cards, activity log |
| RES-03 | Structured markdown final report with citations | ✅ Primary — markdown renderer, source references, images |
| RES-04 | Report style/length configuration | ✅ Primary — report config panel (style + length selectors) |
| RES-05 | Abort in-progress research with partial results | ✅ Primary — abort button, AbortController wiring, partial state preservation |
| RES-06 | Clear error feedback with recovery options | ✅ Primary — error display with retry in activity log |
| AI-06 | Stream cleanup on abort/unmount | ✅ Primary — useResearch hook destroy lifecycle |
| SRC-* | Search providers wired to UI | Partial — settings store holds search config; actual provider wiring in settings dialog (S06) |

## Recommendation

Build in 4 tasks following the dependency chain:

1. **Zustand stores + types** — `useResearchStore`, `useSettingsStore`, `useUIStore` (no React rendering, pure state)
2. **useResearch hook** — thin adapter over `ResearchOrchestrator` with streaming event → store dispatch
3. **UI components** — Research Hub, Active Research (3-panel), Final Report, WorkflowProgress, MarkdownRenderer
4. **Page assembly + wiring** — replace placeholder `page.tsx`, wire everything together, verify end-to-end

## Implementation Landscape

### What Exists (from S01–S04)

**Engine layer (complete):**
- `ResearchOrchestrator` — state machine with event emitter (`on('step-delta', ...)`, `on('step-start', ...)`, etc.)
- `ResearchConfig` — full config type with `topic`, `providerConfigs`, `stepModelMap`, `reportStyle`, `reportLength`, `autoReviewRounds`, `maxSearchQueries`, `promptOverrides`
- `ResearchResult` — `{ title, report, learnings, sources, images }`
- `ResearchEventMap` — typed events: `step-start`, `step-delta`, `step-reasoning`, `step-complete`, `step-error`, `progress`
- `SearchProvider` + `createSearchProvider` factory — all 6 providers
- Domain filtering + citation images utilities
- `ProviderRegistry` + `createRegistry` + `resolveModel` from S02
- `streamWithAbort`, `generateStructured` from S02 streaming module

**UI primitives (from S01):**
- 16 shadcn/ui components installed: button, card, input, textarea, select, tabs, accordion, dialog, form, dropdown-menu, popover, scroll-area, separator, slider, tooltip, resizable
- Obsidian Deep CSS variables in `globals.css`
- `cn()` utility
- `marked` package in deps (markdown parser)
- `sonner` package in deps (toast notifications — not yet set up)
- `localforage` + typed storage abstraction
- `react-hook-form` + `@hookform/resolvers` + `zod` validation
- `react-resizable-panels` v4 (Group/Panel/Separator API)
- `dayjs` for time formatting
- `lucide-react` icons
- `p-limit` for parallel execution
- `zustand` v5
- `@tailwindcss/typography` plugin available

**Current `page.tsx`:** Placeholder with "v1.0 rewrite in progress" text.

### What Needs Building

1. **Zustand Stores** (`src/stores/`)
   - `research-store.ts` — active research session state: topic, orchestrator state, streaming text per step, search tasks, final result, error, timer
   - `settings-store.ts` — provider configs, search provider config, report preferences, domain filters. Persisted via localforage middleware
   - `ui-store.ts` — global UI state: active view (hub/active-report/final-report), settings dialog open, etc.

2. **useResearch Hook** (`src/hooks/use-research.ts`)
   - Creates `ResearchOrchestrator` with config from settings store
   - Subscribes to orchestrator events and dispatches to research store
   - Manages AbortController lifecycle (start/abort/destroy on unmount)
   - Returns: `startResearch(topic)`, `abortResearch()`, `isRunning`, `currentState`
   - Timer: tracks elapsed time via `setInterval` → store

3. **Components** (`src/components/`)
   - `Header.tsx` — top nav bar with logo, status indicator (during research), settings/history buttons
   - `research/TopicInput.tsx` — glassmorphism textarea with presets, file/URL attach buttons, Start Research button
   - `research/WorkflowProgress.tsx` — horizontal step indicator (Topic → Questions → Plan → Research → Report) with active/completed/pending states
   - `research/ActiveResearch.tsx` — 3-panel resizable layout
     - Left sidebar: research questions (completed/active/pending), search sources list
     - Center: streaming result cards in bento grid, "AI is synthesizing" floating indicator
     - Right sidebar: activity log with timestamped entries
   - `research/FinalReport.tsx` — editorial markdown display with right sidebar (TOC, sources, metadata)
   - `research/ReportConfig.tsx` — inline config panel: report style (balanced/executive/technical/concise), length (brief/standard/comprehensive), auto-review rounds
   - `MarkdownRenderer.tsx` — wraps `marked` with custom components for Obsidian Deep styling
   - `ErrorBoundary.tsx` — research-level error recovery

4. **Page** (`src/app/page.tsx`)
   - Replaces placeholder
   - `"use client"` — renders Header, then switches view based on `uiStore.activeView`:
     - `hub` → TopicInput + ReportConfig
     - `active` → WorkflowProgress + ActiveResearch
     - `report` → FinalReport

### Key Design Decisions Needed

1. **Client-side orchestrator vs API route:** The orchestrator uses AI SDK which requires Node.js APIs. Two approaches:
   - **Option A (recommended):** Create an API route that instantiates the orchestrator server-side, streams events back via SSE, and the `useResearch` hook consumes the SSE stream. The UI never imports AI SDK directly.
   - **Option B:** Use Next.js Server Actions to create the orchestrator server-side, but streaming events is harder with Server Actions.
   - **Option C (not viable):** Import orchestrator client-side — AI SDK's `streamText`/`generateObject` won't work in the browser.
   
   **Recommendation: Option A** — SSE API route. The v0 used this pattern (see `api/sse/route.ts`). Create `/api/research/stream` that instantiates `ResearchOrchestrator` server-side, subscribes to events, and writes them as SSE to the response. The client-side `useResearch` hook connects via `EventSource` and dispatches to the Zustand store.

2. **Markdown rendering:** `marked` is already in deps. For the report display, use `marked.parse()` with a custom renderer for Obsidian Deep styling. The v0 used `react-markdown` with remark/rehype plugins, but `marked` is simpler and already installed. If we need GFM tables, `marked` supports them natively with `{ gfm: true }`.

3. **Research state persistence:** Active research state should NOT be persisted (it's ephemeral). Only completed research (title + report + sources + config) gets saved to history — that's S06. The settings store should persist via localforage.

4. **Settings for providers:** S06 builds the full settings dialog. S05 only needs the settings store to exist with default shape so the research can read provider configs from it. The store should have sensible defaults but no UI to configure them yet (user can edit via browser devtools or we show a minimal config).

### SSE API Route Design

The API route at `/api/research/stream` needs to:

1. Accept POST with `ResearchConfig` (topic, providerConfigs, stepModelMap, etc.)
2. Create `ResearchOrchestrator` with the config + a real `SearchProvider` from the factory
3. Subscribe to all orchestrator events
4. Stream events as SSE: `event: step-start\ndata: {"step":"clarify","state":"clarifying"}\n\n`
5. Handle abort: client closes connection → request.signal aborts → orchestrator aborts
6. Final event includes the `ResearchResult`

This is the most complex new piece. The v0 has a reference at `_archive/src-v0/app/api/sse/route.ts`.

## Natural Seams

The work divides cleanly along these boundaries:

| Seam | Files | Independence |
|------|-------|-------------|
| Stores | `src/stores/*.ts` | Independent — pure TypeScript, testable without React |
| SSE API Route | `src/app/api/research/stream/route.ts` | Independent — pure server code, testable with vitest |
| useResearch hook | `src/hooks/use-research.ts` | Depends on stores + API route |
| Header | `src/components/Header.tsx` | Depends on ui-store only |
| TopicInput | `src/components/research/TopicInput.tsx` | Depends on stores + useResearch |
| WorkflowProgress | `src/components/research/WorkflowProgress.tsx` | Depends on research-store only |
| ActiveResearch | `src/components/research/ActiveResearch.tsx` | Depends on research-store, uses resizable panels |
| FinalReport | `src/components/research/FinalReport.tsx` | Depends on research-store + MarkdownRenderer |
| ReportConfig | `src/components/research/ReportConfig.tsx` | Depends on settings-store only |
| MarkdownRenderer | `src/components/MarkdownRenderer.tsx` | Standalone — pure display component |
| Page assembly | `src/app/page.tsx` | Depends on everything above |

## What to Build First (Risk Ordering)

1. **SSE API route** — This is the riskiest integration point. The orchestrator works in tests, but wiring it through an SSE endpoint with real search providers hasn't been done. Build and test this first.
2. **Zustand stores** — Foundation for all UI. Must be right before anything renders.
3. **useResearch hook** — The adapter between SSE events and Zustand store.
4. **MarkdownRenderer** — Standalone, build it early since FinalReport depends on it.
5. **Page assembly with Hub view** — Get TopicInput rendering and connecting to the hook.
6. **Active Research view** — Complex 3-panel layout but pure rendering of store data.
7. **Final Report view** — Pure rendering of completed research.

## Constraints and Pitfalls

### Must Follow
- **300 lines max per component** — split complex components (ActiveResearch is ~200 in v0 but will be bigger with 3 panels; split into left/center/right sub-components)
- **`"use client"` on all interactive components** — they use Zustand stores
- **Obsidian Deep design tokens** — use `bg-obsidian-surface-*`, `text-obsidian-on-surface`, etc. from tailwind config, never hardcoded colors
- **No 1px solid borders** — use tonal layering via background color shifts
- **No horizontal dividers** — use spacing (1.5rem) or tonal shifts
- **No pure white text** — use `#e5e1e4` (`text-obsidian-on-surface`) 
- **lucide-react for icons** — no Material Symbols (those are in the HTML mockups only)
- **AI Pulse pattern** — 4px wide vertical pill with `bg-obsidian-primary` for AI-generated content indicators
- **Glassmorphism** — for modals/overlays: `bg-obsidian-surface-float/70 backdrop-blur-xl`

### Known Gotchas
- **react-resizable-panels v4 API** — uses `PanelGroup`, `Panel`, `PanelResizeHandle` (not the v3 names from shadcn)
- **SSE via POST** — `EventSource` only supports GET. For POST with body, use `fetch()` with `ReadableStream` reader instead, or switch to GET with query params (but config is too large for query params). The v0 used POST + fetch with streaming body parsing.
- **`marked` async API** — `marked.parse()` can return a Promise in v15+. Use `marked.parse(markdown, { async: false })` or await it.
- **AbortController across SSE** — When the user clicks abort, the client needs to close the fetch connection AND signal the server. Use `AbortController` on the client fetch, and the server reads `request.signal`.
- **Zustand v5 changes** — `create` no longer requires a type argument; use the simpler API

### Forward Intelligence (from S04)
- Domain filters and citation images are **NOT applied inside providers** — they are post-processing utilities for the caller (UI layer in S05). The orchestrator doesn't apply them. The SSE API route or the client-side should apply `applyDomainFilters` and `filterCitationImages` after search results return.
- `createSearchProvider` requires `providerConfig` and `registry` for model-native search. The SSE route will need to build these from the request's provider configs.
- Brave provider uses `Promise.all` — if image API fails, web results are lost too (known limitation, acceptable for MVP).

## New Dependencies

None needed. All required packages are already installed:
- `zustand` — state management
- `localforage` — persistence  
- `marked` — markdown rendering
- `sonner` — toast notifications
- `react-hook-form` + `zod` — form validation
- `react-resizable-panels` — 3-panel layout
- `lucide-react` — icons
- `@tailwindcss/typography` — prose styling for markdown

## Verification

1. `pnpm build` — production build clean (no TypeScript errors)
2. `pnpm vitest run` — all existing 260 tests still pass
3. New store tests pass
4. Visual: navigate to `http://localhost:3000`, see Research Hub with glassmorphism search bar
5. Visual: type topic, click Start Research, see workflow progress and streaming activity
6. Visual: after research completes, see final report with markdown rendering
7. Visual: click abort during research, see partial state preserved
8. Visual: error state displays with recovery option

## Don't Hand-Roll

- **Markdown rendering** — use `marked` (already installed), don't build a custom parser
- **SSE parsing** — use `fetch` with `ReadableStream` and `TextDecoder`, don't try `EventSource` for POST
- **Form validation** — use `react-hook-form` + `zod` (already installed), don't build manual validation
- **Resizable panels** — use `react-resizable-panels` v4 (already installed), don't build drag handling

## Sources

- Design mockups: `design/screens/01-deep-research-hub.html`, `03-research-in-progress.html`, `04-final-report.html`
- V0 reference: `hooks/useDeepResearch.ts` (857-line hook pattern to NOT replicate — use thin adapter instead)
- V0 store: `store/task.ts`, `store/setting.ts`, `store/global.ts` (reference for state shape)
- V0 SSE: `app/api/sse/route.ts` (reference for SSE streaming pattern)
- V0 markdown: `components/MagicDown/View.tsx` (reference for markdown component structure)
