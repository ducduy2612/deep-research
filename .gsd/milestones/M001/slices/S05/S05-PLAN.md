# S05: Core Research UI

**Goal:** Build the complete research UI: Research Hub screen for topic input, Active Research screen with real-time streaming progress in a 3-panel resizable layout, Final Report display with markdown rendering, and report configuration. Creates an SSE API route to stream orchestrator events from server to client, Zustand stores for state management, and a useResearch hook as the thin adapter between SSE events and UI state.
**Demo:** After this: Research Hub screen, Active Research screen with streaming progress, Final Report display, and report configuration.

## Tasks
- [x] **T01: Create SSE API route for research streaming at /api/research/stream** — Build the /api/research/stream POST route that instantiates ResearchOrchestrator server-side with real SearchProvider from env, subscribes to all orchestrator events, and streams them as SSE to the client. Handle abort via request.signal, build provider configs + registry from env vars at request time, and apply domain filters + citation images post-search.
  - Estimate: 1.5h
  - Files: src/app/api/research/stream/route.ts, src/engine/research/__tests__/sse-route.test.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/sse-route.test.ts && pnpm build
- [x] **T02: Created three Zustand stores (research, settings, UI) with 46 passing tests and clean production build** — Build three Zustand stores: useResearchStore (active session state: topic, orchestrator state, streaming text per step, search tasks, final result, error, elapsed time, activity log), useSettingsStore (provider configs, search provider config, report preferences, domain filters — persisted via localforage), and useUIStore (active view: hub/active/report, settings dialog state). Export store types and actions.
  - Estimate: 1h
  - Files: src/stores/research-store.ts, src/stores/settings-store.ts, src/stores/ui-store.ts, src/stores/index.ts, src/stores/__tests__/research-store.test.ts, src/stores/__tests__/settings-store.test.ts
  - Verify: pnpm vitest run src/stores/ && pnpm build
- [x] **T03: Created useResearch hook with buffered SSE client, AbortController lifecycle, elapsed timer, and 17 passing tests** — Create the useResearch hook that connects the SSE API route to the research Zustand store. Uses fetch() with ReadableStream to consume SSE events (POST with ResearchConfig body), dispatches events to the store (step-start, step-delta, step-complete, step-error, progress), manages AbortController lifecycle (start/abort/destroy on unmount), tracks elapsed time via setInterval, and handles connection errors with retry capability.
  - Estimate: 1h
  - Files: src/hooks/use-research.ts, src/hooks/__tests__/use-research.test.ts
  - Verify: pnpm vitest run src/hooks/ && pnpm build
- [x] **T04: Built and fixed all 10 research UI components: Header, TopicInput, WorkflowProgress, 3-panel ActiveResearch, FinalReport, ReportConfig, MarkdownRenderer** — Create all visual components for the research screens. Header with logo, status indicator, and nav buttons. TopicInput with glassmorphism textarea and Start Research button. WorkflowProgress as horizontal step indicator. ActiveResearch as 3-panel resizable layout (left: questions/sources, center: streaming cards, right: activity log). FinalReport with markdown display and right sidebar (TOC, sources). ReportConfig with style/length selectors. MarkdownRenderer wrapping marked with Obsidian Deep styling. Each component under 300 lines.
  - Estimate: 2h
  - Files: src/components/Header.tsx, src/components/research/TopicInput.tsx, src/components/research/WorkflowProgress.tsx, src/components/research/ActiveResearch.tsx, src/components/research/ActiveResearchLeft.tsx, src/components/research/ActiveResearchCenter.tsx, src/components/research/ActiveResearchRight.tsx, src/components/research/FinalReport.tsx, src/components/research/ReportConfig.tsx, src/components/MarkdownRenderer.tsx
  - Verify: pnpm build
- [x] **T05: Wire page.tsx and integrate all research UI components with view switching, settings hydration, and sonner error notifications** — Replace the placeholder page.tsx with a 'use client' component that renders Header and switches views based on uiStore.activeView: hub shows TopicInput + ReportConfig, active shows WorkflowProgress + ActiveResearch, report shows FinalReport. Wire the useResearch hook into TopicInput (startResearch) and ActiveResearch (abortResearch). Add Toaster from sonner for error notifications. Verify the full path: type topic → click Start → SSE stream → streaming progress → final report. Run pnpm build and all existing tests.
  - Estimate: 1h
  - Files: src/app/page.tsx, src/app/providers.tsx
  - Verify: pnpm build && pnpm vitest run
