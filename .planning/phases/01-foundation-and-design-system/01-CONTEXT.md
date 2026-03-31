# Phase 1: Foundation and Design System - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

The project runs locally with the Obsidian Deep design system applied, all infrastructure utilities in place, and a verified component architecture. This phase delivers the foundation that all subsequent phases build upon: design tokens, shadcn/ui primitives, env config, error hierarchy, structured logging, and storage abstraction.

</domain>

<decisions>
## Implementation Decisions

### Design Token Architecture
- Tailwind v3 (already installed) — v4 migration deferred to separate work
- CSS custom properties mapped to Tailwind `extend` — exactly matches DESIGN.md Tailwind mapping section
- Semantic Tailwind classes (`bg-obsidian-surface-well`, etc.) — self-documenting, matches DESIGN.md
- Override shadcn HSL CSS variables to Obsidian Deep colors — shadcn components adopt the palette natively

### Component & Showcase Scope
- Install all shadcn/ui primitives needed across all phases upfront (button, dialog, input, select, tabs, card, accordion, dropdown-menu, form, label, popover, scroll-area, separator, slider, textarea, tooltip, resizable) — restyle once, use everywhere
- Build a `/design` showcase route that renders all surface levels, typography scale, and each shadcn component in Obsidian Deep theme — serves as verification and living reference
- ESLint max-lines rule set to 300 with `{ skipBlankLines: true, skipComments: true }` — automated enforcement
- Standard shadcn directory pattern — `components/ui/` for primitives, `components/[Feature]/` for feature components

### Infrastructure Utilities
- Custom `AppError` class with error codes and categories — wraps AI SDK errors, provides structured `{ code, message, context }` format
- Thin wrapper over localforage with Zod-validated `get<T>(key, schema)` / `set<T>(key, value)` — type-safe storage
- Centralized `env.ts` with Zod schema validating all env vars at startup — fails fast on missing/invalid config
- Minimal logger — `logger.info()`, `logger.error()` with JSON in production, pretty-print in dev

### Build & Dependencies
- pnpm as package manager (per CLAUDE.md specification)
- Remove unused provider packages (Anthropic, Azure, Mistral, Ollama, Vertex, OpenRouter, xAI) — keep only Google + OpenAI SDK
- `next/font` with Inter + JetBrains Mono — built-in optimization, zero CLS
- Create all directory scaffolding (components/, hooks/, store/, utils/, lib/) with index files — ready for Phase 2+

### Claude's Discretion
All other implementation choices are at Claude's discretion.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` — minimal scaffold, can be modified
- `src/types.d.ts` — type definitions, can be extended
- `next.config.ts` — Next.js config, needs updating
- `tsconfig.json` — TypeScript config with `@/` alias already configured
- Old codebase in `_archive/src-v0/` — read-only reference for patterns

### Established Patterns
- Zustand stores with `persist` middleware for state management
- Path alias `@/` maps to `src/`
- React Compiler (experimental) in Babel config
- Tailwind CSS with custom theme extension (existing in old code)

### Integration Points
- `globals.css` — CSS custom properties root for design tokens
- `tailwind.config.ts` — Tailwind extend for Obsidian Deep colors
- `components.json` — shadcn/ui configuration for component generation
- `next.config.ts` — Next.js config for fonts, rewrites, etc.

</code_context>

<specifics>
## Specific Ideas

- Obsidian Deep design system spec is fully documented in `design/DESIGN.md` with Tailwind mapping, surface hierarchy, glassmorphism patterns, and component styles
- Surface hierarchy: Well (#0e0e10) -> Deck (#1c1b1d) -> Sheet (#201f22) -> Raised (#2a2a2c) -> Float (#353437)
- No-Line Rule: NEVER use 1px solid borders — all boundaries via tonal layering
- Ghost borders at 15% opacity when accessibility requires (inputs, buttons)
- AI Pulse signature component: 4px vertical pill in primary color

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
