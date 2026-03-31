# Deep Research — Rewrite

## What This Is

A ground-up rewrite of the Deep Research application — an AI-powered research tool that orchestrates multi-step web research using various LLM providers. The rewrite applies the Obsidian Dark design system to create a premium, high-cognitive-load research environment while restructuring the codebase to eliminate technical debt and establish maintainable architecture.

The app supports multiple AI providers (Anthropic, OpenAI, Google, Azure, Mistral, DeepSeek, xAI, OpenRouter, Ollama), runs as a PWA with Docker deployment, and includes i18n support.

## Core Value

Users can input a research question and receive a comprehensive, sourced AI-generated report — with visibility into the research process, sources, and reasoning.

## Requirements

### Validated

<!-- Shipped and confirmed valuable in current version. -->

- ✓ Multi-provider AI integration (10+ providers) — existing
- ✓ Deep research workflow with multi-step reasoning — existing
- ✓ Search provider integration (Tavily, Bing, Serper, SearXNG, etc.) — existing
- ✓ Knowledge base with file upload and parsing (PDF, Office, text) — existing
- ✓ Research history with session management — existing
- ✓ PWA support with offline capability — existing
- ✓ MCP server integration — existing
- ✓ i18n (internationalization) support — existing
- ✓ CORS proxy mode for API calls — existing
- ✓ Settings management with provider configuration — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Obsidian Deep design system applied across all screens
- [ ] Component architecture: max 300 lines per component file
- [ ] Centralized environment configuration with Zod validation
- [ ] Centralized AI provider factory (eliminate switch-case duplication)
- [ ] Structured error handling with consistent error boundaries
- [ ] Comprehensive test coverage (unit, integration, E2E)
- [ ] Structured logging infrastructure
- [ ] Input validation and sanitization layer
- [ ] Proper request cancellation and timeout handling
- [ ] Storage layer with quota management and cleanup policies
- [ ] Middleware refactored to composable route handlers
- [ ] Settings component broken into focused sub-components

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Multi-user collaboration — single-user tool, no backend auth system needed
- Real-time chat — not core to research workflow
- Mobile native app — web-first, PWA is sufficient
- Server-side deployment with user accounts — client-side model continues

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

- **Tech Stack**: Next.js 15, React 19, Vercel AI SDK 4.x, Zustand — must stay
- **AI Providers**: All 10+ providers must continue working — Anthropic, OpenAI, Google, Azure, Mistral, DeepSeek, xAI, OpenRouter, Ollama
- **Platforms**: PWA support, Docker deployment, static export capability, i18n
- **Design**: Obsidian Deep design system direction — matching the vision, not pixel-perfect
- **No Migration**: Fresh start — no need to carry data from old version

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ground-up rewrite over incremental refactor | Debt too deep — component sizes, no tests, scattered config. Cheaper to rebuild clean than patch. | — Pending |
| Same tech stack (Next.js + React + AI SDK) | Core dependencies work; the problem is architecture, not framework choice | — Pending |
| Obsidian Deep as design direction | Premium dark-mode design already specified with full tokens and mockups | — Pending |
| Fresh start (no data migration) | Simplifies rewrite; localStorage data is research history — acceptable to reset | — Pending |

---
*Last updated: 2026-03-31 after initialization*
