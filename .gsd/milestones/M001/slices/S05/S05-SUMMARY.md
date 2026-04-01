---
id: S05
parent: M001
milestone: M001
provides:
  - SSE streaming API at /api/research/stream for research orchestration
  - useResearchStore with full session lifecycle and handleEvent() dispatcher
  - useSettingsStore with provider configs, search settings, report preferences, domain filters
  - useUIStore with view switching state
  - useResearch hook as SSE client adapter with AbortController lifecycle
  - 10 Obsidian Deep research UI components (Header, TopicInput, WorkflowProgress, ActiveResearch 3-panel, FinalReport, ReportConfig, MarkdownRenderer)
  - View-switching page integration (hub/active/report)
requires:
  - slice: S04
    provides: Search provider implementations (Tavily, Firecrawl, Exa, Brave, SearXNG) used via SSE route
  - slice: S03
    provides: ResearchOrchestrator state machine and event types used by SSE route
  - slice: S02
    provides: Provider factory and model registry used by SSE route to build providers from env
  - slice: S01
    provides: Obsidian Deep design tokens, shadcn/ui components, storage abstraction, error hierarchy
affects:
  - S06
key_files:
  - src/app/api/research/stream/route.ts
  - src/lib/api-config.ts
  - src/stores/research-store.ts
  - src/stores/settings-store.ts
  - src/stores/ui-store.ts
  - src/stores/index.ts
  - src/hooks/use-research.ts
  - src/components/Header.tsx
  - src/components/research/TopicInput.tsx
  - src/components/research/WorkflowProgress.tsx
  - src/components/research/ActiveResearch.tsx
  - src/components/research/ActiveResearchLeft.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/ActiveResearchRight.tsx
  - src/components/research/FinalReport.tsx
  - src/components/research/ReportConfig.tsx
  - src/components/MarkdownRenderer.tsx
  - src/app/page.tsx
  - src/app/providers.tsx
key_decisions:
  - Used fetch+ReadableStream with custom buffered SSE parser instead of EventSource to support POST body
  - Settings store uses fire-and-forget localforage persistence (not Zustand persist middleware) to avoid SSR hydration issues
  - Research store handleEvent() dispatcher pattern maps all 9 SSE event types to state updates
  - FilteringSearchProvider decorator applies domain filters + citation images post-search, keeping orchestrator decoupled
  - Extracted api-config.ts to keep SSE route under 300-line limit
  - ActiveResearch split into 4 files (container + 3 panels) to stay under 300-line limit
  - ReportConfig uses button-list selectors instead of dropdown menus for cleaner sidebar UX
patterns_established:
  - SSE API route pattern: POST endpoint → orchestrator → event stream → client
  - Zustand store + hook adapter pattern: stores are framework-agnostic, hooks connect to SSE/network
  - handleEvent() dispatcher for flat event streams (1 method, not N action methods)
  - FilteringSearchProvider decorator for composable post-search processing
  - 3-panel resizable layout with split files per panel
  - Providers component for client-side initialization (hydration, toasts) keeping layout.tsx as server component
observability_surfaces:
  - useResearch hook logs SSE events (connection opening, events received, errors, unmount cleanup) to console
  - SSE route sends error events for all failure modes including validation failures
drill_down_paths:
  - tasks/T01-SUMMARY.md
  - tasks/T02-SUMMARY.md
  - tasks/T03-SUMMARY.md
  - tasks/T04-SUMMARY.md
  - tasks/T05-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T20:22:28.505Z
blocker_discovered: false
---

# S05: Core Research UI

**Built the complete research UI: SSE streaming API route, 3 Zustand stores, useResearch hook, 10 Obsidian Deep components, and page integration — all 345 tests passing with clean production build.**

## What Happened

S05 delivers the complete user-facing research experience across 5 tasks:

**T01 — SSE API Route** (`/api/research/stream`): Built a POST endpoint that instantiates the ResearchOrchestrator server-side, subscribes to all orchestrator events, and streams them as SSE to the client. Handles abort via `request.signal`, builds provider configs + registry from env vars at request time (avoiding module-level crashes), and applies domain filters + citation images via a FilteringSearchProvider decorator. Extracted shared config helpers into `src/lib/api-config.ts` to keep the route under 300 lines. 22 tests pass.

**T02 — Zustand Stores**: Created 3 stores with 46 tests. `useResearchStore` tracks full research session lifecycle with a central `handleEvent()` dispatcher for all 9 SSE event types. `useSettingsStore` manages provider configs, search settings, report preferences, domain filters with localforage persistence via fire-and-forget writes (not Zustand persist middleware, avoiding SSR hydration issues). `useUIStore` tracks active view and dialog state.

**T03 — useResearch Hook**: Built the SSE client using `fetch()` + `ReadableStream` (not EventSource, which only supports GET). Custom buffered SSE parser handles cross-chunk events. Pure parsing functions (`parseSSEChunk`, `createSSEBuffer`) exported for direct testing. Manages AbortController lifecycle, elapsed timer, settings merge into request body, and error handling with sonner toasts. 17 tests pass.

**T04 — 10 UI Components**: All components implement Obsidian Deep design system. Header (149 lines) with logo and nav. TopicInput (165) with glassmorphism textarea. WorkflowProgress (120) as horizontal step indicator. ActiveResearch split into 4 files: container (48) + Left panel for questions/sources (185) + Center panel for streaming cards (208) + Right panel for activity log (108). FinalReport (222) with markdown display and right sidebar for TOC/sources. ReportConfig (115) with button-list selectors. MarkdownRenderer (78) wrapping marked with Obsidian Deep styling.

**T05 — Page Integration**: Wired page.tsx with view switching (hub/active/report) driven by `useUIStore.activeView`. Created Providers component for client-side settings hydration from localforage and sonner Toaster. Auto-navigates from active to report view on research completion. Hub view composes TopicInput + ReportConfig in centered glassmorphism layout.

All 345 tests pass across 16 test files. Production build compiles cleanly. Page route is 27.6 kB with all research components included.

## Verification

1. `pnpm build` — clean production build with zero type errors, zero lint errors. Route `/api/research/stream` appears as dynamic route.
2. `pnpm vitest run` — all 345 tests pass across 16 test files (22 SSE route + 46 stores + 17 hook + 260 engine/search).
3. All 10 components verified under 300-line limit (largest: FinalReport at 222 lines).
4. View switching works: hub → active → report based on uiStore.activeView.
5. SSE streaming pipeline complete: client POST → server orchestrator → SSE events → hook → store → UI re-render.

## Requirements Advanced

- RES-01 — TopicInput component with glassmorphism textarea and Start Research button on Hub view
- RES-02 — ActiveResearch 3-panel layout with streaming cards, WorkflowProgress step indicator, and activity log
- RES-03 — FinalReport component with MarkdownRenderer, right sidebar TOC, and source references
- RES-04 — ReportConfig component with style (balanced/executive/technical/concise) and length (brief/standard/comprehensive) selectors
- RES-05 — useResearch hook manages AbortController lifecycle with abort action, store preserves partial results
- RES-06 — SSE route sends error events for all failure modes, sonner toasts display error messages in UI
- AI-06 — useResearch hook manages AbortController with cleanup on abort and unmount, SSE route respects request.signal
- SET-04 — useSettingsStore persists to localforage with fire-and-forget writes and hydrate() on startup

## Requirements Validated

None.

## New Requirements Surfaced

- RES-06 error recovery options need sonner toast integration with retry button — currently shows error message only

## Requirements Invalidated or Re-scoped

None.

## Deviations

ReportConfig uses button-list selectors instead of Radix Select dropdowns (original file was corrupted, rewrite chose cleaner UX). ActiveResearch expanded from 2-panel to the planned 3-panel layout. Added @testing-library/react and jsdom devDependencies for hook testing.

## Known Limitations

None.

## Follow-ups

S06 (Settings and History) will add the tabbed settings dialog that uses useSettingsStore values and the history persistence that uses localforage directly.

## Files Created/Modified

- `src/app/api/research/stream/route.ts` — SSE streaming API route — POST endpoint instantiating orchestrator, streaming events, handling abort
- `src/lib/api-config.ts` — Shared env config helpers extracted from route to stay under 300 lines
- `src/stores/research-store.ts` — Zustand store for research session state with handleEvent() dispatcher (263 lines)
- `src/stores/settings-store.ts` — Zustand store for provider/search/report settings with localforage persistence (262 lines)
- `src/stores/ui-store.ts` — Zustand store for UI state (active view, dialogs) — 102 lines
- `src/stores/index.ts` — Barrel export for all stores
- `src/hooks/use-research.ts` — SSE client hook with buffered parser, AbortController lifecycle, elapsed timer (395 lines including exported pure functions)
- `src/components/Header.tsx` — Header with logo, status indicator, nav buttons (149 lines)
- `src/components/research/TopicInput.tsx` — Glassmorphism textarea with Start Research button (165 lines)
- `src/components/research/WorkflowProgress.tsx` — Horizontal step progress indicator (120 lines)
- `src/components/research/ActiveResearch.tsx` — 3-panel resizable container (48 lines)
- `src/components/research/ActiveResearchLeft.tsx` — Left panel: questions and sources (185 lines)
- `src/components/research/ActiveResearchCenter.tsx` — Center panel: streaming research cards (208 lines)
- `src/components/research/ActiveResearchRight.tsx` — Right panel: activity log (108 lines)
- `src/components/research/FinalReport.tsx` — Final report with markdown and sidebar TOC/sources (222 lines)
- `src/components/research/ReportConfig.tsx` — Report style and length button selectors (115 lines)
- `src/components/MarkdownRenderer.tsx` — Markdown rendering with Obsidian Deep styling (78 lines)
- `src/app/page.tsx` — Main page with view switching (hub/active/report) driven by uiStore (81 lines)
- `src/app/providers.tsx` — Client-side Providers for settings hydration and sonner Toaster (59 lines)
