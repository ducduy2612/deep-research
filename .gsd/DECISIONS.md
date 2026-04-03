# Decisions

## D001 — AI SDK v6 over v4

- **Scope:** architecture
- **Decision:** Use Vercel AI SDK v6 (not project-specified v4)
- **Choice:** AI SDK v6 (`ai@^6.0.0`, `@ai-sdk/google`, `@ai-sdk/openai`)
- **Rationale:** v4 is EOL since July 2025. Starting a ground-up rewrite on EOL SDK creates immediate technical debt. v6 stable since December 2025 with 141+ patch releases.
- **Revisable:** Yes

## D002 — Simplified AI provider set

- **Scope:** architecture
- **Decision:** Collapse from 10+ AI providers to 2 integrations
- **Choice:** Google Gemini (native via `@ai-sdk/google`) + OpenAI-compatible (via `@ai-sdk/openai` with custom base URLs)
- **Rationale:** OpenAI-compatible covers DeepSeek, OpenRouter, Groq, xAI through shared interface. Reduces package count from 9 to 2, eliminates duplicated switch-case logic.
- **Revisable:** Yes

## D003 — CSS variable strategy (raw hex, not HSL)

- **Scope:** design-system
- **Decision:** Store design tokens as raw hex values in CSS custom properties
- **Choice:** `--color-primary: #4f46e5` with `var()` in Tailwind (not `hsl(var())`)
- **Rationale:** Obsidian Deep design system specifies all colors as hex values. Converting to HSL channels would add unnecessary complexity.
- **Revisable:** No (implemented and validated in S01-T01)

## D004 — Dark-only design (no light theme)

- **Scope:** design-system
- **Decision:** No light theme toggle
- **Choice:** `className="dark"` on `<html>` element, dark-only CSS
- **Rationale:** Obsidian Deep is exclusively a dark-mode design system. Adding light theme would double the design token surface area with no user requirement.
- **Revisable:** No (implemented and validated in S01-T01)

## D005 — Font loading via next/font

- **Scope:** design-system
- **Decision:** Load Inter and JetBrains Mono via next/font with CSS variable strategy
- **Choice:** Inter (400, 600) + JetBrains Mono (400, 500) via `next/font/google` with `--font-inter` / `--font-jetbrains-mono` CSS variables
- **Rationale:** next/font provides automatic optimization, zero CLS, and self-hosting. CSS variable strategy enables Tailwind fontFamily integration.
- **Revisable:** No (implemented and validated in S01-T01)

## D006 — Package cleanup strategy

- **Scope:** architecture
- **Decision:** Remove all unused AI provider packages during foundation phase
- **Choice:** Keep only `@ai-sdk/google` and `@ai-sdk/openai`; remove Anthropic, Azure, Mistral, Ollama, Vertex, OpenRouter, xAI SDK packages
- **Rationale:** Simplified provider set (D002) means 7+ packages are dead weight. Clean dependency tree from day one.
- **Revisable:** No (implemented and validated in S01-T01)

## D007 — react-resizable-panels v4 API adaptation

- **Scope:** component
- **Decision:** Adapt shadcn resizable.tsx to react-resizable-panels v4 API
- **Choice:** Import `Group`, `Panel`, `Separator` instead of deprecated `PanelGroup`, `Panel`, `PanelResizeHandle`
- **Rationale:** shadcn CLI generates resizable.tsx using v3 API, but installed package is v4. Build fails without adaptation.
- **Revisable:** No (implemented and validated in S01-T02)

## D008 — Ground-up rewrite approach

- **Scope:** architecture
- **Decision:** Full rewrite rather than incremental refactor
- **Choice:** Start from empty project scaffold; reference old codebase in `_archive/src-v0/` read-only
- **Rationale:** Existing codebase has 3000-line Setting.tsx, 814-line middleware.ts, 857-line useDeepResearch hook, no tests, 30+ env vars with no validation. Architecture is the problem, not individual files.
- **Revisable:** No (project commitment)

## D009 — Research orchestrator as state machine

- **Scope:** architecture
- **Decision:** Extract research workflow into framework-agnostic orchestrator class
- **Choice:** ResearchOrchestrator state machine (engine/research/) with React hooks as thin adapters
- **Rationale:** Current 857-line useDeepResearch hook mixes React lifecycle, state management, API calls, streaming, and business logic. State machine is testable without React and enforces valid transitions.
- **Revisable:** No (implemented in S03)

## D010 — Composable middleware architecture

- **Scope:** architecture
- **Decision:** Replace monolithic 814-line middleware with composable route handlers
- **Choice:** `compose(fn1, fn2, ...)` pattern where each handler handles one concern (auth, key injection, provider/model checks)
- **Rationale:** Monolithic if-else chain is untestable and fragile. Composable handlers are independently testable and auditable. Each handler uses factory pattern with DI for testability.
- **Revisable:** No (implemented in S08)

---

## Decisions Table

| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |
|---|------|-------|----------|--------|-----------|------------|---------|
| D001 | M001/S02/T04 | architecture | API route builds provider configs from env at request time, not import time | Provider configs constructed inside POST handler function body from process.env | Building configs at import time would crash server startup if API keys are missing. Building at request time returns a 500 error for the specific request instead. | Yes | agent |
| D002 | M001/S07 | architecture | KB-06 AI rewriting of non-plain-text content deferred from v1.0 | Implement 10K char chunking with overlap in S07, defer LLM-based content rewriting to future slice | Basic text extraction from pdfjs-dist and officeparser produces clean enough content for 95% of PDFs and Office documents. LLM-based rewriting adds API cost, latency, and complexity. The chunker handles boundary splitting. Rewriting can be added when user feedback indicates content quality issues. | Yes | agent |
| D003 | M001/S07 | architecture | File processing location for Knowledge Base | Process all files server-side via API routes; client sends ArrayBuffer to POST /api/knowledge/parse, server returns parsed JSON | officeparser has a separate browser bundle that may not work reliably in Next.js client context. pdfjs-dist needs worker setup in browser. Server-side processing avoids browser compatibility issues, keeps heavy XML parsing off the main thread, and matches existing architecture where AI operations go through API routes. | Yes | agent |
| D004 | M001/S08 | architecture | Key injection handler in middleware deferred to future enhancement | Make inject-keys handler a pass-through (no-op) for v1; route handlers continue reading provider configs from process.env directly | Route handlers already build provider configs from process.env via buildProviderConfigs(). Since middleware runs on Edge and route handlers run on Node.js, both reading from the same env vars, key injection via headers is unnecessary complexity for v1. The handler infrastructure exists (composable, tested) and can be activated later if env access patterns change. | Yes | agent |
| D005 |  | requirement | SEC-04 | validated | Composable middleware architecture implemented with compose() function in compose.ts, four independent handlers (verify-signature, inject-keys, check-disabled, check-model-filter), and runMiddleware() entry point. Replaces monolithic if-else chain from v0. | Yes | agent |
| D006 | M001/S09/T02 | architecture | UI locale vs research output language separation | `uiLocale` field in settings store for UI display language (en/vi via next-intl), separate from `language` field for research output language (wired to system prompt) | The existing `language` field controls AI response language via system prompt. Adding `uiLocale` for display language avoids conflating two distinct concerns. A user might want UI in Vietnamese but research reports in English. | No | agent |
| D007 | M001/S09/T03 | design | Border tokens for Obsidian Deep design system | `border-obsidian-outline-ghost/XX` as the only border style, with backward-compatible `obsidian.border` alias in Tailwind config | Ghost borders at low opacity are the only permitted border style in Obsidian Deep. Old `border-obsidian-border` references silently failed. Adding an alias ensures any legacy references still resolve correctly. | No | agent |
| D008 | M001/S09 | requirement | I18N-03 | validated | Locale JSON files loaded via dynamic import() in getRequestConfig() — only the active locale's messages are loaded per request. No eager loading of all locales. | No | agent |
| D009 |  | testing | Browser verification testing uses proxy mode with server-side API keys | Use proxy mode for T13 browser verification — API keys read from `.env.local` server-side via `buildProviderConfigs()`, no client-side key entry needed | Browser automation testing should use the same proxy mode deployment pattern (keys from env vars, not client settings). This matches the production server deployment model and avoids the complexity of automating settings UI key entry in the browser. The server's `buildProviderConfigs()` in `src/lib/api-config.ts` reads keys from `process.env` at request time, which is exactly what `.env.local` provides during dev. | Yes | human |
| D010 | M003 | architecture | Store model: checkpoints + workspace separation | Immutable checkpoints{} + mutable workspace{} in single Zustand store | Single store with clear separation preserves existing SSE event handler contract. Checkpoints are null until frozen, then immutable. Workspace holds phase-specific mutable state. Both persist to localforage. | Yes | collaborative |
| D011 | M003 | pattern | Report workspace model | Feedback + regeneration model (no inline editing). User writes comments, AI regenerates entire report from frozen inputs + feedback. | User explicitly chose feedback+regeneration over inline text editing. Simpler UX, more predictable AI output, avoids complex contentEditable/rich-editor integration. | Yes | human |
| D012 | M003 | library | PDF export library | html2pdf.js for client-side PDF generation, marked (already installed) for MD→HTML conversion | html2pdf.js is the standard client-side solution — renders DOM to canvas to PDF via jsPDF. Already have marked for MD→HTML. No server dependency needed. Client-side only fits the app's architecture. | Yes | agent |
| D013 | M003 | pattern | Search result delete semantics | Delete removes everything (query + learning + sources from downstream data). Not visual-only soft delete. | User chose full removal — the learning and sources are stripped from accumulated data so the report won't reference deleted findings. Consistent with checkpoint immutability after freeze. | Yes | human |
| D014 | M003 | pattern | Manual query execution timing and review rounds | Manual queries queue for next 'More Research' batch, not immediate execution. Better for rate limiting and batch processing. One review round per More Research click. | User chose batched execution over immediate. Prevents rate-limit issues and aligns with the review-loop pattern. One round per click keeps the UX predictable and controllable. | Yes | human |
| D015 | M003 | ux | Phase layout model | Accordion — collapsed frozen phases with summary badges, expanded active workspace. Click frozen phase to expand read-only. | User chose accordion over full-stack or timeline-nav. Compact, familiar pattern, maximizes workspace for active phase while keeping prior context accessible. | Yes | human |
| D016 | M003/S01 | requirement | R051 — Workspace state persistence across refresh | validated | M003-S01 — manualQueries and checkpoints fields included in persist schema, survive persist→reset→hydrate round-trip. Backward compatibility tests confirm old state without these fields defaults correctly. | Yes | agent |
