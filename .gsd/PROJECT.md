# Deep Research — Rewrite

## What This Is

A AI-powered deep research tool that orchestrates multi-step web research using LLM providers. Users input a research topic and the system guides them through clarify → plan → research → report phases with interactive checkpoints at each stage. The Obsidian Deep design system provides a premium dark-mode research environment.

## Core Value

Users can input a research question, interactively guide the research process through each phase, and receive a comprehensive, sourced AI-generated report — with full visibility into the research process, sources, and reasoning, and the ability to steer, refine, and regenerate at every stage.

## Current State

M001–M003 are complete. M004 (Eliminate Vercel Timeout Dependency) is in progress — S01 and S02 complete. The application has:
- **135+ source files, ~24K lines, 823 passing tests**
- Multi-phase orchestrator with clarify/plan/research/report/review SSE phases (full pipeline and start() removed)
- Research batching with 2-cycle cap per SSE connection (~160s), auto-reconnect for remaining queries
- Standalone reviewOnly() orchestrator phase for follow-up research rounds
- Review-result SSE event type, autoReviewRoundsRemaining store field for auto-review trigger loop
- Auto-review round tracking (autoReviewCurrentRound/TotalRounds) with visible progress banner, spinner, and abort button
- Auto-review and manual "More Research" unified through same phase:review endpoint with learnings context
- timeBudgetMs=180s default, maxDuration=300 for Vercel Hobby compliance
- Research store with checkpoints{} + workspace{} separation, freeze() action
- PhaseAccordion: Radix accordion with collapsed frozen phases and expanded active workspace
- Report workspace with feedback textarea, Regenerate, Done button
- PWA support, i18n (EN + VI), CORS proxy mode, knowledge base, history

M004 S02 complete: Hook + store review integration. Auto-review shows visible round progress (N/M) in ResearchActions banner with spinner and abort. Round fields persisted to localforage. Abort callback threaded from page through component hierarchy. 27 new tests (796→823). Requirements R065, R066, R067 validated.

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
- **Timeout strategy**: Cycle cap (2 cycles) + time budget (180s) + maxDuration (300s) triple constraint

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: v1.0 — Full Rewrite — Ground-up rebuild with clean architecture, design system, all features
- [x] M002: Interactive Multi-Phase Research — Checkpointed clarify/plan/research/report flow with SSE streaming
- [x] M003: Frozen Checkpoints + Active Workspace — Immutable phase checkpoints, editable research/report workspaces, export
- [ ] M004: Eliminate Vercel Timeout Dependency — 2-cycle research cap, standalone review phase, full pipeline removal, auto-review

---
*Last updated: 2026-04-14 — M004 S02 complete.*
