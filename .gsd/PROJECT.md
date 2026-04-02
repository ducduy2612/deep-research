# Deep Research — Rewrite

## What This Is

A ground-up rewrite of the Deep Research application — an AI-powered research tool that orchestrates multi-step web research using various LLM providers. The rewrite applies the Obsidian Dark design system to create a premium, high-cognitive-load research environment while restructuring the codebase to eliminate technical debt and establish maintainable architecture.

The app supports multiple AI providers (Anthropic, OpenAI, Google, Azure, Mistral, DeepSeek, xAI, OpenRouter, Ollama), runs as a PWA, and includes i18n support.

## Core Value

Users can input a research question and receive a comprehensive, sourced AI-generated report — with visibility into the research process, sources, and reasoning.

## Requirements

### Validated

<!-- Shipped and confirmed valuable in current version. -->

- ✓ Multi-provider AI integration (10+ providers) — existing
- ✓ Deep research workflow with multi-step reasoning — existing
- ✓ Search provider integration (Tavily, Firecrawl, Exa, Brave, SearXNG, etc.) — existing
- ✓ Knowledge base with file upload and parsing (PDF, Office, text) — existing
- ✓ Research history with session management — existing
- ✓ PWA support with offline capability — existing
- ✓ i18n (internationalization) support — existing
- ✓ CORS proxy mode for API calls — existing
- ✓ Settings management with provider configuration — existing

### Validated

<!-- Shipped and confirmed valuable in current version. -->

- ✓ Multi-provider AI integration (Gemini native + OpenAI-compatible) — M001 S02/S06
- ✓ Deep research workflow with multi-step reasoning (10-state orchestrator) — M001 S03
- ✓ Search provider integration (Tavily, Firecrawl, Exa, Brave, SearXNG, model-native) — M001 S04
- ✓ Knowledge base with file upload and parsing (PDF, Office, text) + URL crawling — M001 S07
- ✓ Research history with session management (100-session FIFO quota) — M001 S06
- ✓ PWA support with offline capability (Serwist) — M001 S09
- ✓ i18n support (English + Vietnamese, lazy-loaded) — M001 S09
- ✓ CORS proxy mode for API calls (HMAC verification) — M001 S08
- ✓ Settings management with provider configuration (4-tab dialog) — M001 S06
- ✓ Obsidian Deep design system applied across all screens — M001 S01/S09
- ✓ Component architecture: max 300 lines per component file — M001 S01-S09
- ✓ Structured error handling with AppError hierarchy — M001 S01
- ✓ Comprehensive test coverage (498 unit tests) — M001 S01-S09
- ✓ Structured logging infrastructure — M001 S01
- ✓ Input validation and sanitization (Zod throughout) — M001 S01-S09
- ✓ Request cancellation with AbortController — M001 S02/S03/S05
- ✓ Storage layer with quota management (localforage + IndexedDB) — M001 S01/S06/S07
- ✓ Composable middleware architecture — M001 S08
- ✓ Settings decomposed into focused sub-components — M001 S06

### Active

<!-- Current scope. Building toward these. -->

- [ ] AI rewriting of knowledge base content (KB-06 partial — deferred per D002)
- [ ] E2E browser testing for critical user flows
- [ ] Docker deployment configuration for standalone build
- [ ] Additional i18n locales beyond English and Vietnamese

### Completed (M001)

- [x] Obsidian Deep design system applied across all screens
- [x] Component architecture: max 300 lines per component file
- [x] AI provider integration: Google Gemini (native) + OpenAI-compatible layer (covers OpenAI, DeepSeek, OpenRouter, Groq, xAI)
- [x] All search providers: Tavily, Firecrawl, Exa, Brave, SearXNG
- [x] Knowledge base with file upload and parsing (PDF, Office, text)
- [x] PWA support with offline capability
- [x] i18n support (English + Vietnamese)
- [x] CORS proxy mode
- [x] Settings management with provider configuration
- [x] Research history with session management
- [x] Centralized environment configuration with Zod validation
- [x] Centralized AI provider factory (eliminate switch-case duplication)
- [x] Structured error handling with consistent error boundaries
- [x] Comprehensive test coverage (498 unit tests)
- [x] Structured logging infrastructure
- [x] Input validation and sanitization layer
- [x] Proper request cancellation and timeout handling
- [x] Storage layer with quota management and cleanup policies
- [x] Middleware refactored to composable route handlers
- [x] Settings component broken into focused sub-components

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Multi-user collaboration — single-user tool, no backend auth system needed
- Real-time chat — not core to research workflow
- Mobile native app — web-first, PWA is sufficient
- Server-side deployment with user accounts — client-side model continues
- MCP server integration — focus on web app only; programmatic access via API is not needed for v1.0

## Context

### Current State
The existing codebase (mapped in `.planning/codebase/`) has significant technical debt:
- Monolithic components (Setting.tsx at 3000 lines, middleware.ts at 814 lines)
- No test coverage anywhere
- Duplicated provider switch-case logic across multiple files
- Inconsistent error handling (some throw, some return empty, some toast)
- API keys stored in browser localStorage without encryption
- Over 30 environment variables with no centralized validation
- Inline third-party code (modified officeParser)
- No logging infrastructure, no error monitoring

### New Design System
The Obsidian Deep design system (in `/design/`) defines:
- 6 screens: Research Hub, Premium Landing, Research In Progress, Final Report, Settings Modal, Research History
- Dark-only design with tonal layering (no borders)
- Glassmorphism for floating elements
- Surface hierarchy: Well → Deck → Sheet → Raised → Float
- Complete color palette, typography (Inter + JetBrains Mono), and spacing tokens
- Tailwind CSS configuration ready to implement

### Design Reference Files
- `/design/DESIGN.md` — Design tokens, Tailwind mapping, principles
- `/design/SCREENS.md` — Screen index with routes
- `/design/design-system/obsidian-deep-spec.md` — Full design system specification
- `/design/screens/*.html` — HTML mockups for each screen
- `/design/screens/*.png` — Visual references

## Constraints

- **Tech Stack**: Next.js 15, React 19, Vercel AI SDK v6, Zustand — must stay
- **AI Providers**: Google Gemini (native) + OpenAI-compatible layer only (covers OpenAI, DeepSeek, OpenRouter, Groq, xAI) — other providers dropped for v1.0
- **Platforms**: PWA support, static export capability, i18n
- **Design**: Obsidian Deep design system direction — matching the vision, not pixel-perfect
- **No Migration**: Fresh start — no need to carry data from old version

## Current State (Post-M001, M002 In Progress)

Milestone M001 (v1.0 — Full Rewrite) is **complete**. M002 (Interactive Multi-Phase Research) is in progress — S01, S02, S03 complete; S04 remaining.

- **132 source files, ~23K lines of code, 617 passing tests** (182 from hooks/stores alone)
- **M001 delivered:** 9 slices — Foundation → Providers → Research Engine → Search → Core UI → Settings/History → Knowledge Base → CORS Proxy → PWA/i18n/Polish
- **M002 S01 delivered:** Multi-phase orchestrator with 4 independent phase methods + SSE route supporting clarify/plan/research/report/full phases
- **M002 S02 delivered:** Research store multi-phase state machine with 13 states, checkpoint data tracking, elapsed timer
- **M002 S03 delivered:** Interactive research flow UI — useResearch hook with 5 phase-specific SSE actions (clarify, submitFeedbackAndPlan, approvePlanAndResearch, requestMoreResearch, generateReport), ClarifyPanel/PlanPanel/ResearchActions checkpoint components, state-routed ActiveResearchCenter with phase-aware rendering, WorkflowProgress with awaiting indicators and elapsed timer, full i18n coverage
- **All 45 M001 requirements validated** (44 fully, 1 partially — KB-06 AI rewriting deferred)
- **Production build passes cleanly** with 6 static routes, 5 dynamic API routes, and middleware

The application is ready for user testing and deployment. See `.gsd/milestones/M001/M001-SUMMARY.md` for the full milestone record.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ground-up rewrite over incremental refactor | Debt too deep — component sizes, no tests, scattered config. Cheaper to rebuild clean than patch. | ✅ Delivered 125 files, 498 tests, clean architecture |
| Same tech stack (Next.js + React + AI SDK) | Core dependencies work; the problem is architecture, not framework choice | ✅ Next.js 15 + React 19 + AI SDK v6 stable |
| Obsidian Deep as design direction | Premium dark-mode design already specified with full tokens and mockups | ✅ All screens implement Obsidian Deep design system |
| Fresh start (no data migration) | Simplifies rewrite; localStorage data is research history — acceptable to reset | ✅ Clean codebase with no legacy debt |
| Simplified AI providers (Gemini + OpenAI-compatible) | Reduces 10+ integrations to 2. OpenAI-compatible covers DeepSeek, OpenRouter, Groq, xAI via shared interface. | ✅ 2 provider packages, 6 providers supported |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 — M002 Interactive Research in progress: S01–S03 complete, S04 (Polish: Persistence, Edge Cases, Browser Verification) remaining.*
