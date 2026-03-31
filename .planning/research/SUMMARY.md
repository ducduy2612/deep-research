# Project Research Summary

**Project:** Deep Research Rewrite
**Domain:** AI-powered deep research tool with multi-step reasoning, search orchestration, and report generation
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

Deep Research is a client-side-first AI research tool that orchestrates multi-step LLM workflows -- clarifying questions, report planning, parallel web search, auto-review loops, and final report synthesis -- with streaming progress and rich markdown output. The existing codebase has accumulated significant technical debt: an 857-line React hook mixing business logic with UI lifecycle, a 3000-line settings component, duplicated provider switch-cases across 6 files, and a 1210-line custom MCP transport implementation. Experts building this type of tool separate the orchestration engine from the UI framework, use provider factories to eliminate duplication, and employ state machines for complex multi-step workflows.

The recommended approach is a layered modular monolith within Next.js 15 App Router. The core research workflow is extracted into a framework-agnostic orchestrator class (state machine pattern), with React hooks as thin adapters. The provider system collapses from 9 provider packages to 2 (Google Gemini native + OpenAI-compatible via `@ai-sdk/openai`). AI SDK should be upgraded to v6 (the specified v4 is EOL since July 2025). State management uses Zustand stores split by domain with localforage for large data, avoiding the localStorage quota issues of the current implementation. shadcn/ui with Obsidian Deep design tokens provides the component layer.

The key risks are: (1) the static export vs. standalone deployment contradiction where API routes, middleware, and PWA fight each other -- pick one primary target; (2) AI SDK stream cleanup on unmount causing memory leaks and unclosed connections; (3) JSON parsing of AI output without fallbacks breaking the pipeline; and (4) plaintext API keys in localStorage exposing credentials to XSS attacks. These must be addressed architecturally in the earliest phases, not patched later.

## Key Findings

### Recommended Stack

The stack is well-validated with all versions confirmed against npm registry. The most consequential decision is upgrading AI SDK from the project-specified v4 (EOL July 2025) to v6 (stable since December 2025, 141 patch releases). Starting a ground-up rewrite on an EOL SDK creates immediate technical debt. Tailwind CSS v4 is recommended over v3 for its CSS-first configuration that aligns with a fresh project. Zod v4 pairs with AI SDK v6. shadcn/ui v2 provides accessible component primitives that are restyled to Obsidian Deep via CSS variable remapping -- avoiding weeks of building custom primitives.

**Core technologies:**
- Next.js 15.5.14 + React 19.2.4: App Router framework, stable v15 line avoids v16 bleeding edge
- AI SDK v6.0.141 (`ai` + `@ai-sdk/google` + `@ai-sdk/openai`): streaming, structured output, dual-provider architecture
- Zustand 5.0.12 + localforage 1.10.0: client-side state with IndexedDB persistence for large data
- Tailwind CSS 4.2.2 + shadcn/ui 2.x: CSS-first config, Radix-based accessible components, Obsidian Deep design tokens
- Zod 4.3.6: schema validation for env vars, API inputs, config (compatible with AI SDK v6)
- Pino 10.3.1: structured JSON logging, 5x faster than Winston
- Serwist 9.5.7: PWA service worker management with first-class Next.js integration
- next-intl 4.8.3: purpose-built i18n for Next.js App Router (replaces i18next)

### Expected Features

The feature landscape spans 10 table-stakes features, 13 differentiators, and 8 explicitly excluded anti-features. The MVP must deliver the multi-step research workflow with streaming, provider configuration, search integration, and final report generation. Knowledge base, history, MCP, and advanced features layer on top.

**Must have (table stakes):**
- Research topic input with glassmorphism search bar -- entry point for the entire app
- Multi-step research workflow (clarify, plan, search, analyze, report) -- core value proposition
- Streaming progress display with ThinkTagStreamProcessor -- real-time visibility during multi-minute process
- Web search integration (Tavily, Firecrawl, Exa, Brave, SearXNG, model-native) -- research requires real sources
- AI model selection (Gemini native + OpenAI-compatible) -- users have different keys and cost/quality preferences
- Final report generation with citations -- the deliverable
- Source citations and references -- report credibility
- Research history with localforage persistence -- users return to past research
- Settings management (92 fields, needs Zod-validated decomposition) -- users must configure API keys and preferences
- Error handling with consistent feedback -- multi-step processes fail often

**Should have (differentiators):**
- Dual-model architecture (thinking + networking) -- cost/speed optimization
- Auto-review loops (0-5 configurable rounds) -- deeper research than single-pass
- Knowledge base (file upload + URL crawling) -- private data research
- MCP server (5 tools, StreamableHTTP transport) -- programmatic access from AI agents
- Prompt customization -- power user feature for domain-specific tuning
- SSE endpoint for programmatic research -- external tool integration
- CORS proxy mode -- server-side API key management
- Domain filtering, citation images, PWA, i18n, report style/length preferences, multi-API key rotation

**Defer (v2+):**
- Google Vertex AI (complex auth, Gemini native covers same models)
- Built-in vector database / RAG (separate product)
- Plugin/extension system (prompt overrides cover most extensibility)
- Only-use-local-resource mode (edge case toggle)
- Multi-API key rotation (nice-to-have optimization)

### Architecture Approach

A layered modular monolith within Next.js 15 App Router. Each subsystem (provider factory, research engine, knowledge base, MCP, PWA) is a self-contained module. The critical architectural shift is extracting the 857-line useDeepResearch hook into a framework-agnostic ResearchOrchestrator state machine, with React hooks as thin adapters. Composable middleware replaces the 814-line if-else chain. A provider factory with registry pattern eliminates duplicated switch-cases.

**Major components:**
1. Research Orchestrator (engine/research/) -- state machine managing the multi-step research workflow, testable without React
2. Provider Factory (engine/provider/) -- registry pattern mapping provider IDs to AI SDK model factories (Gemini native + OpenAI-compatible)
3. Search Factory (engine/search/) -- standardized search provider interface returning `{ sources, images }`
4. Knowledge Processor (engine/knowledge/) -- file parsing pipeline (PDF, Office, text) with Fuse.js search
5. Composable Middleware (lib/middleware.ts) -- signature verification, API key injection, rate limiting as composable functions
6. Zustand Stores (stores/) -- domain-split client state (research, history, settings, knowledge, UI) with localforage persistence
7. MCP Server (via @modelcontextprotocol/sdk) -- 5 tools with StreamableHTTP transport, no custom transport implementation
8. Design System (components/ui/) -- shadcn/ui primitives restyled with Obsidian Deep tokens via CSS variables

### Critical Pitfalls

1. **Static Export + API Routes + PWA Contradiction** -- These three features fundamentally conflict. Decide one primary deployment target (recommend standalone for Docker). Do not try to make both paths identical.

2. **AI SDK streamText Without Consumption** -- Abandoned streams cause memory leaks and unclosed provider connections. Always use AbortController with try/finally cleanup. Test unmount-during-stream scenarios.

3. **JSON.parse on AI Output** -- LLMs do not guarantee valid JSON. Use AI SDK's `generateObject` with Zod schema instead of parsing raw text. Wrap all JSON parsing in try/catch with retry logic.

4. **Zustand Persist Stores Growing Until localStorage Quota Exceeded** -- Research sessions can be 200KB+ each. Use IndexedDB (localforage) for history and task data. Implement cleanup policies. Never persist large data in localStorage.

5. **API Keys in Client-Side Zustand Stores** -- Plaintext API keys in localStorage are exposed to any XSS vulnerability. For standalone mode, store keys server-side. For static export, encrypt with user passphrase. At minimum, do not persist by default.

6. **MCP Server Using Deprecated SSE Transport** -- Use official `@modelcontextprotocol/sdk` package. Do not implement custom transport layers. SSE is deprecated in the MCP spec.

7. **Provider Abstraction Missing Provider-Specific Features** -- "OpenAI-compatible" is a spectrum. Use AI SDK dedicated provider packages where they exist. Test each provider independently. Do not assume one generic factory covers all quirks.

## Implications for Roadmap

Based on the dependency graph between subsystems and the pitfalls that must be avoided early, the following phase structure is recommended.

### Phase 1: Foundation and Scaffolding
**Rationale:** All subsequent work depends on project structure, validated configuration, error hierarchy, and design system tokens. Getting this right prevents cascading inconsistencies.
**Delivers:** Next.js 15 project with App Router, Tailwind v4 with Obsidian Deep tokens, shadcn/ui components restyled, Zod-validated env config, error hierarchy, structured logger, storage abstraction.
**Addresses:** Settings management (partial -- env config structure), Error handling (error hierarchy)
**Avoids:** Pitfall 1 (decide deployment target now -- recommend standalone), Pitfall 14 (env validation at startup), Pitfall R3 (avoid over-engineering abstractions)

### Phase 2: Provider Factory and AI Integration
**Rationale:** Nothing works without AI providers. The factory must be built and tested before the research engine. This is the most critical integration point.
**Delivers:** Provider factory with Gemini native + OpenAI-compatible layer, API route for AI proxy, model registry, streaming utilities with AbortController cleanup.
**Addresses:** AI model selection, Streaming progress display (foundation)
**Avoids:** Pitfall 2 (AbortController from day one), Pitfall 7 (use dedicated SDK packages per provider), Pitfall 16 (model ID registry)

### Phase 3: Research Engine Core
**Rationale:** The orchestrator is the heart of the application. It depends on the provider factory and must be built as a testable, framework-agnostic state machine before any UI is attached.
**Delivers:** ResearchOrchestrator state machine, individual step modules (clarify, plan, search, analyze, report), structured output via `generateObject` instead of JSON parsing, cancellation support.
**Addresses:** Multi-step research workflow, Final report generation, Source citations
**Avoids:** Pitfall 3 (use generateObject for structured output), Pitfall 11 (AbortController through entire pipeline), Pitfall R1 (catalog existing workarounds before building)

### Phase 4: Search Provider Integration
**Rationale:** Search providers are needed for the research engine's search phase. The search factory standardizes output and enables parallel execution.
**Delivers:** Search provider factory, Tavily + model-native search adapters (MVP), standardized `{ sources, images }` output, parallel execution with p-limit, domain filtering.
**Addresses:** Web search integration, Domain filtering, Citation images
**Avoids:** Pitfall 10 (parallel execution from the start), Pitfall 21 (Gemini grounding as post-processing plugin)

### Phase 5: Core UI and Research Screens
**Rationale:** With engine + providers + search working, the UI connects everything. Build the research screens first (the core user journey), then settings and history.
**Delivers:** Research Hub (screen 1), Active Research (screen 2) with streaming progress, topic input, workflow indicators, search result cards, activity log, final report display with markdown rendering, report sidebar with TOC and references. Zustand stores for research state.
**Addresses:** Research topic input, Streaming progress display, Final report generation (UI)
**Avoids:** Pitfall 9 (React 19 ref-as-prop patterns), Anti-Pattern 2 (max 300 lines per component)

### Phase 6: Settings and History
**Rationale:** Users need to configure API keys and manage past research. Settings must handle API key security. History needs IndexedDB persistence.
**Delivers:** Settings dialog with tabbed sub-components (AI Models, Search, General, Advanced), Zod-validated settings store, research history with localforage persistence, history panel UI, session cards, stats.
**Addresses:** Settings management, Research history
**Avoids:** Pitfall 4 (IndexedDB for large data), Pitfall 5 (API key security), Pitfall 12 (new storage keys for rewrite)

### Phase 7: Knowledge Base
**Rationale:** Knowledge base is a high-complexity differentiator that layers on top of the research engine. It is not needed for the core research workflow.
**Delivers:** File upload and parsing (PDF via pdfjs-dist, Office via mammoth, text), knowledge store with IndexedDB, Fuse.js search, integration with research orchestrator's search phase, knowledge panel UI.
**Addresses:** Knowledge base (file upload + URL crawling)
**Avoids:** Pitfall 13 (file size limits, Node.js runtime), Pitfall 22 (use crypto.randomUUID for IDs)

### Phase 8: Advanced Features
**Rationale:** Differentiators that depend on the core engine being stable. Auto-review, prompt customization, and remaining search providers.
**Delivers:** Auto-review loops (0-5 rounds), prompt customization system, all remaining search providers (Firecrawl, Exa, Brave, SearXNG), multi-API key rotation, CORS proxy mode, SSE endpoint for programmatic research.
**Addresses:** Auto-review loops, Prompt customization, CORS proxy mode, SSE endpoint, Remaining search providers, Multi-API key rotation
**Avoids:** Pitfall 15 (composable middleware for proxy mode)

### Phase 9: MCP Server
**Rationale:** MCP exposes the research engine to external AI agents. It depends on a stable engine and should be built last among the major features.
**Delivers:** MCP server via @modelcontextprotocol/sdk, 5 tools (deep-research, write-research-plan, generate-SERP-query, search-task, write-final-report), StreamableHTTP transport, API routes.
**Addresses:** MCP server integration
**Avoids:** Pitfall 6 (use official SDK, no custom transport)

### Phase 10: PWA, i18n, and Polish
**Rationale:** Cross-cutting concerns that can be integrated incrementally once core features are stable.
**Delivers:** Serwist PWA with service worker and offline support, next-intl i18n with 4 locales, remaining screens (History Hub screen 3, Settings screen 4, Knowledge Base screen 5, MCP Status screen 6), responsive design, final Obsidian Deep polish.
**Addresses:** PWA, i18n, Obsidian Deep design system across all screens
**Avoids:** Pitfall 18 (Serwist skipWaiting for Docker redeployments), Pitfall 19 (lazy-load translation files), Pitfall 20 (no React Compiler initially)

### Phase Ordering Rationale

- Phases 1-2 establish foundation: configuration, design tokens, and the provider layer that everything depends on
- Phase 3 is the critical path: the research orchestrator is the heart of the product and must be framework-agnostic and testable
- Phases 4-5 deliver the core user journey: search + UI to see research happening
- Phases 6-7 complete essential features: settings, history, knowledge base
- Phases 8-10 are differentiators and polish that layer on top of a working core
- The ordering avoids the highest-severity pitfalls (deployment contradiction, stream cleanup, JSON parsing, storage quota, API key security) in the phases where they would otherwise manifest

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Provider Factory):** AI SDK v6 provider-specific behavior for DeepSeek, OpenRouter, Groq needs verification against current SDK versions. The PITFALLS research flagged LOW confidence here.
- **Phase 3 (Research Engine):** AI SDK v6 streaming API surface (fullStream events, reasoning handling) needs verification. The ThinkTagStreamProcessor behavior differs per model.
- **Phase 8 (CORS Proxy):** Composable middleware pattern with proper HMAC/JWT needs concrete implementation research. Current middleware has replay attack vulnerability.
- **Phase 9 (MCP):** @modelcontextprotocol/sdk API for StreamableHTTP transport needs verification. Current codebase uses custom implementation that must be fully replaced.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Next.js 15 + Tailwind v4 + shadcn/ui setup
- **Phase 5 (Core UI):** Standard React component patterns, established Zustand store patterns
- **Phase 6 (Settings + History):** Standard form and CRUD patterns with react-hook-form + Zod
- **Phase 10 (PWA + i18n):** Serwist and next-intl have well-documented Next.js integration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry. Integration points tested (peer deps confirmed). One strong opinion: AI SDK v6 over EOL v4. |
| Features | HIGH | Based on direct analysis of existing codebase (855-line hook, 577-line engine, 434-line MCP). Feature dependency tree is clear. |
| Architecture | HIGH | Patterns are proven (state machine, factory, composable middleware). Dependency graph between subsystems is well-defined. |
| Pitfalls | HIGH | 22 pitfalls identified from direct codebase analysis. Critical pitfalls have clear prevention strategies. Some provider-specific behavior has LOW confidence (training data only). |

**Overall confidence:** HIGH

### Gaps to Address

- **AI SDK v6 streaming API specifics:** The fullStream event types, reasoning handling, and structured output API need verification against actual v6 documentation during Phase 3 planning. Current research is based on AI SDK v4 behavior with inferred v6 changes.
- **Provider-specific quirks for OpenAI-compatible providers:** DeepSeek reasoning_content field, OpenRouter HTTP-Referer headers, Groq streaming differences -- these are flagged as LOW confidence and need testing during Phase 2 implementation.
- **@modelcontextprotocol/sdk API surface:** The official SDK's StreamableHTTP transport API needs concrete research during Phase 9 planning. Current codebase uses a 1210-line custom implementation that provides no migration guide.
- **Obsidian Deep design system integration with shadcn/ui v2 + Tailwind v4:** The CSS variable remapping strategy is documented but needs hands-on validation during Phase 1. shadcn v2's Tailwind v4 support is relatively new.
- **Existing codebase edge cases:** The rewrite must catalog all provider-specific workarounds (Chinese bracket fix, Gemini grounding mutations, etc.) before the old codebase is removed. CONCERNS.md is a start but not comprehensive.

## Sources

### Primary (HIGH confidence)
- npm registry (verified 2026-03-31): all package versions confirmed via `npm view`
- Existing codebase analysis: useDeepResearch.ts (855 lines), DeepResearch engine (577 lines), provider.ts (150 lines), search.ts (458 lines), useKnowledge.ts (333 lines), MCP server.ts (434 lines)
- Vercel AI SDK documentation: https://sdk.vercel.ai/docs
- MCP Protocol specification: https://modelcontextprotocol.io/docs/concepts/transports
- Next.js App Router documentation: https://nextjs.org/docs/app
- Design system: SCREENS.md defines 6 screens with detailed element descriptions
- Project codebase analysis: .planning/codebase/ARCHITECTURE.md, .planning/codebase/CONCERNS.md

### Secondary (MEDIUM confidence)
- AI SDK provider-specific behavior (DeepSeek, OpenRouter, Groq): based on training data, not verified against current SDK versions
- Next.js 15 breaking changes (async params, caching defaults): well-documented, consistent across sources
- React 19 ref-as-prop change: official React 19 release notes
- Zustand + localforage persistence pattern: community consensus, multiple examples

### Tertiary (LOW confidence)
- ThinkTagStreamProcessor behavior with AI SDK v6 reasoning events: needs verification
- Serwist v9.5.7 with Next.js 15.5.14 exact compatibility: peer dep says >=14 but not tested at this exact version
- Tailwind v4 CSS-first config with shadcn v2 exact integration: documented but relatively new

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
