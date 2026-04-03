# CLAUDE.md — Deep Research

AI-powered deep research tool. Ground-up rewrite in progress (v1.0 milestone).

## Quick Start

```bash
pnpm install
cp env.tpl .env.local   # then fill in at least GOOGLE_GENERATIVE_AI_API_KEY
pnpm dev                # http://localhost:3000 (Turbopack)
```

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- Vercel AI SDK 4.x for AI/streaming
- Zustand for state, localforage for persistence
- Tailwind CSS + shadcn/ui + lucide-react icons
- pnpm as package manager

## Project Layout

```
src/              — Clean slate for v1.0 rewrite (GSD phases build here)
_archive/src-v0/  — Old v0 codebase (read-only reference, do not modify)
.planning/        — GSD planning (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md)
design/           — Obsidian Deep design system specs and HTML mockups
```

**Working with old code:**
- `_archive/src-v0/` is the old codebase — read it to understand existing behavior, never edit it
- New code goes in `src/` only, written from scratch following clean architecture
- When referencing old patterns (e.g., how a provider was integrated), read the archived file but build new in `src/`

## Code Conventions

- **Path alias:** `@/` maps to `src/`
- **Import order:** React/Next → third-party → components → hooks/stores → utils/types
- **Components:** Max 500 lines per file (ESLint enforced). Use `"use client"` for browser-dependent components
- **Styling:** Tailwind CSS, mobile-first responsive. Dark mode with `dark:` classes
- **State:** Zustand stores with `persist` middleware. Use radash utilities for common ops
- **Validation:** Zod for all external input (API responses, user input)
- **Error handling:** Standardized API error format: `{ isError: true, content: [{ type: "text", text: "..." }] }`
- **i18n:** All UI strings via `useTranslation` with `t("key.path")`
- **Icons:** lucide-react only

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with Turbopack (port 3000) |
| `pnpm build` | Production build |
| `pnpm build:standalone` | Standalone build for Docker |
| `pnpm build:export` | Static export |
| `pnpm lint` | ESLint |
| `pnpm start` | Start production server |

## GSD Workflow

This project uses GSD (Get Stuff Done) for phased development. Key files:

- `.planning/PROJECT.md` — Project definition, requirements, decisions
- `.planning/ROADMAP.md` — 9-phase roadmap for v1.0 rewrite
- `.planning/REQUIREMENTS.md` — 49 requirements mapped to phases
- `.planning/STATE.md` — Current phase and progress tracking

Current state: Phase 1 (Foundation and Design System), 0% complete.

Use GSD commands to advance work:
- `/gsd:next` — Advance to next logical step
- `/gsd:plan-phase` — Plan current phase
- `/gsd:execute-phase` — Execute phase plans
- `/gsd:progress` — Check current progress

## E2E Testing with gsd-browser

Use `gsd-browser` for end-to-end browser testing during development. This is a native Rust browser automation CLI for AI agents.

### When to Use gsd-browser

- Verify UI screens match design system after implementation
- Test research workflow end-to-end (input query → receive report)
- Validate settings configuration and persistence
- Test search provider integration
- Verify responsive layouts and dark mode rendering
- Check PWA installability and offline behavior

### Common Testing Patterns

```
# Navigate to the app
/gsd-browser open http://localhost:3000

# Take a screenshot to verify UI
/gsd-browser screenshot

# Test research workflow - fill in a query
/gsd-browser fill "textarea" "What are the latest advances in quantum computing?"
/gsd-browser click "button[type=submit]"

# Wait for research to progress and verify
/gsd-browser wait-for ".research-progress"
/gsd-browser screenshot

# Test settings
/gsd-browser click "[data-testid=settings]"
/gsd-browser fill "#api-key-input" "test-key"
/gsd-browser screenshot

# Check responsive layout
/gsd-browser set-viewport 375 812
/gsd-browser screenshot

# Assert page state
/gsd-browser assert-text "Research Report"
/gsd-browser assert-visible ".final-report"
```

### Testing Checklist Per Phase

After implementing each phase, run these verification steps:

1. **Visual:** Screenshot each affected screen, verify against design mockups
2. **Functional:** Walk through primary user flows (research query, settings change, history access)
3. **Responsive:** Test at mobile (375x812) and desktop (1440x900) viewports
4. **Dark mode:** Verify all components render correctly in dark theme
5. **Error states:** Test with invalid inputs, missing API keys, network failures
6. **Persistence:** Refresh page and verify Zustand/localforage state is restored

## Design System

Obsidian Deep — dark-only design with tonal layering. Key references:
- `design/DESIGN.md` — Design tokens and Tailwind mapping
- `design/SCREENS.md` — Screen index with routes
- `design/screens/*.html` — HTML mockups

Surface hierarchy: Well → Deck → Sheet → Raised → Float

## Important Notes

- Never commit `.env` or `.env.local` files
- Run `pnpm lint` and `pnpm build` to validate changes
- AI providers simplified to 2 integrations: Google Gemini (native) + OpenAI-compatible layer
- No data migration from old version — fresh start
- MCP server integration is out of scope for v1.0
