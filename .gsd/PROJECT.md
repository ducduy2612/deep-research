# Deep Research — Rewrite

## What This Is

An AI-powered deep research tool that orchestrates multi-step web research using LLM providers. Users input a research topic and the system guides them through clarify → plan → research → report phases with interactive checkpoints at each stage. The Obsidian Deep design system provides a premium dark-mode research environment.

## Core Value

Users can input a research question, interactively guide the research process through each phase, and receive a comprehensive, sourced AI-generated report — with full visibility into the research process, sources, and reasoning, and the ability to steer, refine, and regenerate at every stage.

## Current State

M001 (v1.0 Full Rewrite) and M002 (Interactive Multi-Phase Research) are complete. M003 (Frozen Checkpoints + Active Workspace) is in progress — S01–S04 complete. The application has:
- **135+ source files, ~24K lines, 711 passing tests**
- Multi-phase orchestrator with clarify/plan/research/report/full SSE phases
- Research store with checkpoints{} + workspace{} separation, freeze() action, 31 freeze-specific tests
- PhaseAccordion: Radix accordion with collapsed frozen phases (summary badges, read-only content) and expanded active workspace (primary glow)
- Interactive research flow UI with phase-specific panels, CRUD actions, and review loops
- Report workspace with feedback textarea, Regenerate (sends frozen checkpoints + feedback to AI), Done (freezes report → FinalReport view)
- PWA support, i18n (EN + VI), CORS proxy mode, knowledge base, history

M003 S01 complete: Store has immutable checkpoints (clarify/plan/research/report) and mutable workspace (questions, feedback, plan, suggestion, manualQueries). freeze() creates immutable snapshots. All state persists across refresh with backward compatibility.

M003 S02 complete: PhaseAccordion replaces ActiveResearchCenter's switch-based routing with a 4-phase Radix accordion. Frozen phases show summary badges (question count, query count, learnings/sources, report status) and read-only MarkdownRenderer. Active phase shows primary-color glow. ClarifyPanel Submit → freeze('clarify'), PlanPanel Approve → freeze('plan'). 9 unit tests cover all rendering states.

M003 S03 complete: Research workspace with per-task CRUD. Delete removes query+learning+sources from accumulated data. Retry re-searches a single query. Manual queries queue for next batch. Suggestion textarea steers review prompt. One review round per "More Research". "Finalize Findings" freezes research and triggers report generation.

M003 S04 complete: Report workspace with streamed report display, feedback textarea (persisted), Regenerate button (reads frozen checkpoints + feedback → sends to AI for new report), Done button (freezes report → navigates to FinalReport). Navigation guard prevents auto-redirect until report is frozen. 17 new tests (4 orchestrator + 6 store + 7 component).

## Architecture / Key Patterns

- **Tech Stack**: Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **AI Integration**: Vercel AI SDK 4.x, Google Gemini (native) + OpenAI-compatible layer
- **State**: Zustand stores with localforage persistence (fire-and-forget writes, explicit hydration)
- **Streaming**: SSE over fetch+ReadableStream (not EventSource) with buffered parser
- **Design**: Obsidian Deep — dark-only, tonal layering, surface hierarchy (Well→Deck→Sheet→Raised→Float)
- **Component limit**: 300 lines max per file, 500 lines for non-component files (ESLint enforced)
- **Validation**: Zod throughout for all external input
- **Engine modules**: Provider, Research, Search, Knowledge — each with barrel exports
- **Research orchestrator**: Framework-agnostic state machine, phase methods create own AbortControllers

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: v1.0 — Full Rewrite — Ground-up rebuild with clean architecture, design system, all features
- [x] M002: Interactive Multi-Phase Research — Checkpointed clarify/plan/research/report flow with SSE streaming
- [ ] M003: Frozen Checkpoints + Active Workspace — Immutable phase checkpoints, editable research/report workspaces, export

---
*Last updated: 2026-04-03 — M003 S04 complete.*
