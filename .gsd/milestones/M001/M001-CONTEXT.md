# M001 Context

**Milestone:** v1.0 — Full Rewrite  
**Status:** Active, S01 in progress (2/3 tasks complete)  
**No upstream milestone dependencies.**

## Key Decisions (Carried Forward)

| Decision | Rationale |
|----------|-----------|
| Ground-up rewrite over incremental refactor | Technical debt too deep — 3000-line components, no tests, scattered config |
| Same tech stack (Next.js 15 + React 19 + AI SDK) | Core deps work; the problem is architecture, not framework choice |
| Obsidian Deep as design direction | Premium dark-mode design system fully specified with tokens and mockups |
| Fresh start (no data migration) | localStorage research history is acceptable to reset |
| Simplified AI providers (Gemini + OpenAI-compatible) | Reduces 10+ integrations to 2; OpenAI-compatible covers DeepSeek, OpenRouter, Groq, xAI |
| AI SDK v6 over project-specified v4 | v4 is EOL since July 2025; v6 stable since December 2025 |
| CSS variables store raw hex values (not HSL channels) | Obsidian Deep specifies colors as hex values |
| Dark-only design | No light theme toggle needed per design system specification |

## Implementation Decisions from S01

- **CSS variable strategy:** Raw hex values in CSS custom properties with `var()` in Tailwind (not `hsl(var())`)
- **Font loading:** next/font with CSS variable strategy (`--font-inter`, `--font-jetbrains-mono`) for Tailwind fontFamily
- **Package cleanup:** Kept only `@ai-sdk/google` and `@ai-sdk/openai` as AI SDK providers
- **resizable.tsx adaptation:** react-resizable-panels v4 uses Group/Panel/Separator instead of PanelGroup/Panel/PanelResizeHandle

## Risks to Watch

- AI SDK v6 streaming API specifics need verification during S02-S03 (research flagged LOW confidence for provider-specific behavior)
- Obsidian Deep + shadcn/ui v2 + Tailwind v4 CSS variable remapping validated in S01 — confirmed working
