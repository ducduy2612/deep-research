# Project Research Summary

**Project:** Deep Research Rewrite
**Domain:** AI-powered deep research tool with multi-step reasoning, search orchestration, and report generation
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

Deep Research is a client-side-first AI research tool that orchestrates multi-step LLM workflows -- clarifying questions, report planning, parallel web search, auto-review loops, and final report synthesis -- with streaming progress and rich markdown output. The existing codebase has accumulated significant technical debt: an 857-line React hook mixing business logic with UI lifecycle, a 3000-line settings component, duplicated provider switch-cases across 6 files. Experts building this type of tool separate the orchestration engine from the UI framework, use provider factories to eliminate duplication, and employ state machines for complex multi-step workflows.

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
- officeparser 6.0.7: document parser for Office formats (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) with structured AST -- replaces custom officeParser.ts (718 lines)
- LLM-based OCR via OpenAI-compatible provider factory: PDF files sent directly to vision models (GLM-OCR, GPT-4o, etc.) for OCR -- models accept PDF bytes natively, no rendering needed. Handles scanned docs, complex layouts, handwritten text. Replaces pdfParser.ts (62 lines) and traditional text extraction.
- Pino 10.3.1: structured JSON logging, 5x faster than Winston
- Serwist 9.5.7: PWA service worker management with first-class Next.js integration
- next-intl 4.8.3: purpose-built i18n for Next.js App Router (replaces i18next)

### Expected Features

The feature landscape spans 10 table-stakes features, 13 differentiators, and 8 explicitly excluded anti-features. The MVP must deliver the multi-step research workflow with streaming, provider configuration, search integration, and final report generation. Knowledge base, history, and advanced features layer on top.

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

A layered modular monolith within Next.js 15 App Router. Each subsystem (provider factory, research engine, knowledge base, PWA) is a self-contained module. The critical architectural shift is extracting the 857-line useDeepResearch hook into a framework-agnostic ResearchOrchestrator state machine, with React hooks as thin adapters. Composable middleware replaces the 814-line if-else chain. A provider factory with registry pattern eliminates duplicated switch-cases.

**Major components:**
1. Research Orchestrator (engine/research/) -- state machine managing the multi-step research workflow, testable without React
2. Provider Factory (engine/provider/) -- registry pattern mapping provider IDs to AI SDK model factories (Gemini native + OpenAI-compatible)
3. Search Factory (engine/search/) -- standardized search provider interface returning `{ sources, images }`
4. Knowledge Processor (engine/knowledge/) -- file parsing pipeline: `officeparser` v6 for Office docs (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) with structured AST, LLM-based OCR via OpenAI-compatible vision model (GLM-OCR etc.) for PDFs (model accepts PDF directly), text parser for plain text formats, and Fuse.js search
5. Composable Middleware (lib/middleware.ts) -- signature verification, API key injection, rate limiting as composable functions
6. Zustand Stores (stores/) -- domain-split client state (research, history, settings, knowledge, UI) with localforage persistence
7. Design System (components/ui/) -- shadcn/ui primitives restyled with Obsidian Deep tokens via CSS variables

### Critical Pitfalls

1. **Static Export + API Routes + PWA Contradiction** -- These three features fundamentally conflict. Decide one primary deployment target (recommend standalone for Docker). Do not try to make both paths identical.

2. **AI SDK streamText Without Consumption** -- Abandoned streams cause memory leaks and unclosed provider connections. Always use AbortController with try/finally cleanup. Test unmount-during-stream scenarios.

3. **JSON.parse on AI Output** -- LLMs do not guarantee valid JSON. Use AI SDK's `generateObject` with Zod schema instead of parsing raw text. Wrap all JSON parsing in try/catch with retry logic.

4. **Zustand Persist Stores Growing Until localStorage Quota Exceeded** -- Research sessions can be 200KB+ each. Use IndexedDB (localforage) for history and task data. Implement cleanup policies. Never persist large data in localStorage.

5. **API Keys in Client-Side Zustand Stores** -- Plaintext API keys in localStorage are exposed to any XSS vulnerability. For standalone mode, store keys server-side. For static export, encrypt with user passphrase. At minimum, do not persist by default.

6. **Provider Abstraction Missing Provider-Specific Features** -- "OpenAI-compatible" is a spectrum. Use AI SDK dedicated provider packages where they exist. Test each provider independently. Do not assume one generic factory covers all quirks.

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
**Delivers:** File upload and parsing: `officeparser` v6 for Office docs (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF with structured AST, tables, formatting), LLM-based OCR via OpenAI-compatible vision model (GLM-OCR, GPT-4o, etc.) for PDFs (model accepts PDF bytes directly, no rendering needed — handles scanned docs, complex layouts, handwritten text), lightweight text parser for plain text formats. Knowledge store with IndexedDB, Fuse.js search, integration with research orchestrator's search phase, knowledge panel UI. Replaces 780 lines of custom parsers (officeParser.ts + pdfParser.ts).
**Addresses:** Knowledge base (file upload + URL crawling)
**Avoids:** Pitfall 13 (file size limits, Node.js runtime), Pitfall 22 (use crypto.randomUUID for IDs)

### Phase 8: Advanced Features
**Rationale:** Differentiators that depend on the core engine being stable. Auto-review, prompt customization, and remaining search providers.
**Delivers:** Auto-review loops (0-5 rounds), prompt customization system, all remaining search providers (Firecrawl, Exa, Brave, SearXNG), multi-API key rotation, CORS proxy mode, SSE endpoint for programmatic research.
**Addresses:** Auto-review loops, Prompt customization, CORS proxy mode, SSE endpoint, Remaining search providers, Multi-API key rotation
**Avoids:** Pitfall 15 (composable middleware for proxy mode)

### Phase 9: PWA, i18n, and Polish
**Rationale:** Cross-cutting concerns that can be integrated incrementally once core features are stable.
**Delivers:** Serwist PWA with service worker and offline support, next-intl i18n with 4 locales, remaining screens (History Hub screen 3, Settings screen 4, Knowledge Base screen 5), responsive design, final Obsidian Deep polish.
**Addresses:** PWA, i18n, Obsidian Deep design system across all screens
**Avoids:** Pitfall 18 (Serwist skipWaiting for Docker redeployments), Pitfall 19 (lazy-load translation files), Pitfall 20 (no React Compiler initially)

### Phase Ordering Rationale

- Phases 1-2 establish foundation: configuration, design tokens, and the provider layer that everything depends on
- Phase 3 is the critical path: the research orchestrator is the heart of the product and must be framework-agnostic and testable
- Phases 4-5 deliver the core user journey: search + UI to see research happening
- Phases 6-7 complete essential features: settings, history, knowledge base
- Phases 8-9 are differentiators and polish that layer on top of a working core
- The ordering avoids the highest-severity pitfalls (deployment contradiction, stream cleanup, JSON parsing, storage quota, API key security) in the phases where they would otherwise manifest

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Provider Factory):** AI SDK v6 provider-specific behavior for DeepSeek, OpenRouter, Groq needs verification against current SDK versions. The PITFALLS research flagged LOW confidence here.
- **Phase 3 (Research Engine):** AI SDK v6 streaming API surface (fullStream events, reasoning handling) needs verification. The ThinkTagStreamProcessor behavior differs per model.
- **Phase 8 (CORS Proxy):** Composable middleware pattern with proper HMAC/JWT needs concrete implementation research. Current middleware has replay attack vulnerability.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Next.js 15 + Tailwind v4 + shadcn/ui setup
- **Phase 5 (Core UI):** Standard React component patterns, established Zustand store patterns
- **Phase 6 (Settings + History):** Standard form and CRUD patterns with react-hook-form + Zod
- **Phase 9 (PWA + i18n):** Serwist and next-intl have well-documented Next.js integration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry. Integration points tested (peer deps confirmed). One strong opinion: AI SDK v6 over EOL v4. |
| Features | HIGH | Based on direct analysis of existing codebase (855-line hook, 577-line engine). Feature dependency tree is clear. |
| Architecture | HIGH | Patterns are proven (state machine, factory, composable middleware). Dependency graph between subsystems is well-defined. |
| Pitfalls | HIGH | 22 pitfalls identified from direct codebase analysis. Critical pitfalls have clear prevention strategies. Some provider-specific behavior has LOW confidence (training data only). |

**Overall confidence:** HIGH

### Gaps to Address

- **AI SDK v6 streaming API specifics:** The fullStream event types, reasoning handling, and structured output API need verification against actual v6 documentation during Phase 3 planning. Current research is based on AI SDK v4 behavior with inferred v6 changes.
- **Provider-specific quirks for OpenAI-compatible providers:** DeepSeek reasoning_content field, OpenRouter HTTP-Referer headers, Groq streaming differences -- these are flagged as LOW confidence and need testing during Phase 2 implementation.
- **Obsidian Deep design system integration with shadcn/ui v2 + Tailwind v4:** The CSS variable remapping strategy is documented but needs hands-on validation during Phase 1. shadcn v2's Tailwind v4 support is relatively new.
- **Existing codebase edge cases:** The rewrite must catalog all provider-specific workarounds (Chinese bracket fix, Gemini grounding mutations, etc.) before the old codebase is removed. CONCERNS.md is a start but not comprehensive.

## Sources

### Primary (HIGH confidence)
- npm registry (verified 2026-03-31): all package versions confirmed via `npm view`
- Existing codebase analysis: useDeepResearch.ts (855 lines), DeepResearch engine (577 lines), provider.ts (150 lines), search.ts (458 lines), useKnowledge.ts (333 lines)
- Vercel AI SDK documentation: https://sdk.vercel.ai/docs
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

# Architecture Patterns

**Domain:** AI-powered research tool (ground-up rewrite)
**Researched:** 2026-03-31
**Overall confidence:** HIGH

## Recommended Architecture

The rewrite uses a **layered modular monolith** within Next.js 15 App Router. Each subsystem (provider factory, research engine, knowledge base, PWA) is a self-contained module with clear boundaries. Client-side state lives in Zustand stores split by domain. Server-side logic runs in API routes and composable middleware. The research workflow engine is extracted from React hooks into a standalone orchestrator class.

```
src/
  app/                          # Next.js App Router (routes, layouts, API routes)
    layout.tsx                  # Root layout: providers, fonts, global styles
    page.tsx                    # Research Hub (screen 1) - Server Component shell
    loading.tsx                 # Route-level loading boundary
    error.tsx                   # Route-level error boundary
    sw.ts                       # Serwist service worker entry point
    api/
      ai/[...slug]/route.ts     # Unified AI proxy (single route, provider in body)
      search/[provider]/[...slug]/route.ts  # Search provider proxy
      research/route.ts         # SSE streaming endpoint for research workflow

  config/                       # Centralized configuration (Zod-validated)
    env.ts                      # Environment variable schema + validation
    providers.ts                # AI provider registry config
    search.ts                   # Search provider config
    app.ts                      # App-wide constants

  engine/                       # Core business logic (framework-agnostic)
    research/
      orchestrator.ts           # Multi-step research workflow state machine
      steps/                    # Individual research steps
        clarify.ts              # Generate clarifying questions
        plan.ts                 # Write research plan
        search.ts               # Execute web searches
        analyze.ts              # Analyze and extract learnings
        report.ts               # Synthesize final report
      types.ts                  # Research engine types
      errors.ts                 # Research-specific error classes
    provider/
      factory.ts                # Provider factory (registry pattern)
      gemini.ts                 # Google Gemini native adapter
      openai-compatible.ts      # OpenAI-compatible adapter (DeepSeek, OpenRouter, Groq, xAI)
      types.ts                  # Shared provider interface
    search/
      factory.ts                # Search provider factory
      tavily.ts                 # Tavily adapter
      firecrawl.ts              # Firecrawl adapter
      exa.ts                    # Exa adapter
      brave.ts                  # Brave adapter
      searxng.ts                # SearXNG adapter
      types.ts                  # Shared search interface
    knowledge/
      processor.ts              # File processing pipeline (routes by MIME type)
      parsers/
        office.ts               # officeparser adapter (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF)
        pdf-ocr.ts              # PDF → LLM OCR via OpenAI-compatible vision model (e.g. GLM-OCR)
        text.ts                 # Plain text parser (for text/JSON/XML/YAML/code)
      store.ts                  # Knowledge base CRUD operations
      search.ts                 # Local knowledge search (Fuse.js)

  stores/                       # Zustand stores (client-side state)
    research.ts                 # Active research session state
    history.ts                  # Completed research archive
    settings.ts                 # User preferences + provider config
    knowledge.ts                # Knowledge base state
    ui.ts                       # UI state (modals, panels, navigation)

  components/                   # React UI components
    ui/                         # Primitive design system components
      button.tsx
      input.tsx
      card.tsx
      dialog.tsx
      tabs.tsx
      slider.tsx
      select.tsx
      toast.tsx
      scroll-area.tsx
      tooltip.tsx
      badge.tsx
      separator.tsx
    layout/                     # Structural layout components
      header.tsx
      sidebar.tsx
      panel-group.tsx
      research-layout.tsx       # 3-panel research layout
    research/                   # Research workflow components
      topic-input.tsx           # Search bar / topic entry
      workflow-progress.tsx     # Step-by-step progress indicator
      clarifying-questions.tsx  # Questions panel
      search-results.tsx        # Live search result cards
      activity-log.tsx          # Real-time activity feed
      final-report.tsx          # Report display with markdown
      report-sidebar.tsx        # TOC + source references
    settings/                   # Settings sub-components (max 300 lines each)
      settings-dialog.tsx       # Modal shell
      ai-models-tab.tsx         # AI provider configuration
      search-tab.tsx            # Search provider config
      general-tab.tsx           # General preferences
      advanced-tab.tsx          # Advanced settings
    history/                    # Research history components
      history-panel.tsx         # History list panel
      session-card.tsx          # Individual session card
      stats-row.tsx             # Statistics summary

  hooks/                        # React hooks (thin wrappers around engine)
    use-research.ts             # Research workflow hook
    use-provider.ts             # AI provider selection hook
    use-search.ts               # Search execution hook
    use-knowledge.ts            # Knowledge base hook
    use-settings.ts             # Settings hook
    use-pwa.ts                  # PWA install/status hook

  lib/                          # Shared utilities
    logger.ts                   # Structured logging (pino or custom)
    errors.ts                   # Error classes and handling utilities
    storage.ts                  # IndexedDB/localStorage abstraction
    validation.ts               # Shared Zod schemas
    signature.ts                # HMAC request signing
    middleware.ts               # Composable middleware functions
    cn.ts                       # Tailwind class merge utility
    i18n.ts                     # i18n configuration

  locales/                      # i18n translation files
    en.json
    zh.json
    ja.json
    ...

  styles/                       # Global styles
    globals.css                 # Tailwind base + Obsidian Deep tokens
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Engine / Research Orchestrator** | Runs multi-step research workflow as a state machine | Provider Factory, Search Factory, Knowledge Store |
| **Engine / Provider Factory** | Creates AI model instances by provider ID | AI SDK provider packages, Settings Store (for API keys) |
| **Engine / Search Factory** | Creates search provider instances by provider ID | Search API adapters, Config |
| **Engine / Knowledge Processor** | Parses uploaded files into searchable text | File Parsers, Knowledge Store |
| **API Routes** | Proxy requests to external APIs with auth | Middleware (signature), Provider/Search Factories |
| **Middleware** | Request authentication, API key injection, rate limiting | Config (env validation), Signature utility |
| **Zustand Stores** | Client-side state management with persistence | Components (via selectors), Hooks |
| **React Hooks** | Thin wrappers connecting engine to React lifecycle | Engine modules, Zustand Stores, Components |
| **UI Components** | Render interface, capture user input | Hooks (for data/actions), Design System primitives |
| **Service Worker** | Offline caching, precaching, runtime strategies | Next.js build manifest |

### Data Flow

**Research Workflow (primary data flow):**

```
User enters topic
       |
       v
[TopicInput component]
       |
       v  (calls useResearch.startResearch)
[useResearch hook]
       |
       v  (creates orchestrator instance)
[Research Orchestrator (engine)]
       |
       +---> Step 1: Clarify (Provider Factory -> AI model -> stream questions)
       |            |
       |            v  (streamed to TaskStore.research)
       |     [ClarifyingQuestions component]
       |
       +---> Step 2: Plan (Provider Factory -> AI model -> stream plan)
       |            |
       |            v  (stored in TaskStore.research.plan)
       |     [WorkflowProgress component]
       |
       +---> Step 3: Search (parallel via Search Factory -> N providers)
       |            |
       |            +---> Tavily API
       |            +---> Firecrawl API
       |            +---> Knowledge Store (local search)
       |            |
       |            v  (results merged, stored in TaskStore)
       |     [SearchResults component] (renders as results arrive)
       |
       +---> Step 4: Analyze (Provider Factory -> AI model -> extract learnings)
       |            |
       |            v  (learnings accumulated)
       |     [ActivityLog component]
       |
       +---> Step 5: Report (Provider Factory -> AI model -> stream final report)
                    |
                    v  (streamed to TaskStore.research.report)
             [FinalReport component] + [ReportSidebar component]
                    |
                    v  (on complete, save to HistoryStore)
             [HistoryPanel component]
```

**Provider Factory Flow:**

```
Settings Store (user config: provider, model, API key)
       |
       v
[useProvider hook] reads settings, calls factory
       |
       v
[Provider Factory]
       |
       +---> providerId === "gemini"
       |       v
       |     @ai-sdk/google -> google(modelId) -> LanguageModelV1
       |
       +---> providerId === "openai" | "deepseek" | "openrouter" | "groq" | "xai"
               v
             createOpenAI({ baseURL, apiKey }) -> custom(modelId) -> LanguageModelV1
       |
       v
Returns: LanguageModelV1 (uniform interface)
       |
       v
Used by: streamText(), generateText(), generateObject()
```

**API Proxy Flow:**

```
Client fetch('/api/ai/...', { body: { provider, model, messages } })
       |
       v
[Middleware] -- verifies HMAC signature, checks rate limits
       |
       v
[API Route /api/ai/[...slug]]
       |
       +---> Reads provider from request body
       +---> Resolves API key from env (never from client)
       +---> Forwards to provider API
       |
       v
Provider API response streamed back to client
```

**Knowledge Base Flow:**

```
User uploads file(s)
       |
       v
[KnowledgePanel component]
       |
       v  (calls useKnowledge.upload)
[useKnowledge hook]
       |
       v
[Knowledge Processor (engine)]
       |
       +---> Detects MIME type
       +---> Routes to appropriate parser (PDF, Office, text)
       +---> Extracts text content
       +---> Indexes with Fuse.js
       |
       v
[Knowledge Store (Zustand + IndexedDB)]
       |
       v  (during research, queried by orchestrator)
[Knowledge Search (engine)] -> returns relevant passages
       |
       v  (injected into AI context)
[Research Orchestrator] includes knowledge in synthesis step
```

## Patterns to Follow

### Pattern 1: Provider Factory (Registry Pattern)

**What:** Central registry that maps provider IDs to AI SDK model factories. Eliminates the duplicated switch-case logic across middleware, hooks, and config that plagues the current codebase.

**When:** Any code that needs to create an AI model instance.

**Example:**

```typescript
// src/engine/provider/types.ts
import type { LanguageModelV1 } from 'ai';

export type ProviderId = 'gemini' | 'openai' | 'deepseek' | 'openrouter' | 'groq' | 'xai';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  models: string[];
  defaultModel: string;
  requiresApiKey: boolean;
  apiKeyEnvVar: string;
  baseURL?: string;
}

export interface ProviderFactoryConfig {
  providerId: ProviderId;
  modelId: string;
  apiKey: string;
  baseURL?: string;
}

// src/engine/provider/factory.ts
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import type { ProviderFactoryConfig, ProviderId } from './types';

// OpenAI-compatible provider base URLs
const OPENAI_COMPATIBLE_BASES: Partial<Record<ProviderId, string>> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  xai: 'https://api.x.ai/v1',
};

export function createModel(config: ProviderFactoryConfig): LanguageModelV1 {
  if (config.providerId === 'gemini') {
    return google(config.modelId);
  }

  // All other providers use OpenAI-compatible interface
  const baseURL = config.baseURL ?? OPENAI_COMPATIBLE_BASES[config.providerId];
  if (!baseURL) {
    throw new Error(`Unknown provider: ${config.providerId}`);
  }

  const provider = createOpenAI({
    baseURL,
    apiKey: config.apiKey,
    name: config.providerId,
  });

  return provider(config.modelId);
}
```

**Why this over switch-case:** The factory is the single source of truth. Adding a new provider means adding one entry to `OPENAI_COMPATIBLE_BASES` or one `if` branch -- not updating 6 files.

### Pattern 2: Research Orchestrator (State Machine)

**What:** A class that manages the multi-step research workflow as an explicit state machine with defined transitions. Extracts the 857-line `useDeepResearch` hook into a testable, framework-agnostic module.

**When:** Running a research session.

**Example:**

```typescript
// src/engine/research/types.ts
export type ResearchPhase =
  | 'idle'
  | 'clarifying'
  | 'planning'
  | 'searching'
  | 'analyzing'
  | 'reporting'
  | 'complete'
  | 'error';

export interface ResearchState {
  phase: ResearchPhase;
  topic: string;
  questions: string[];
  plan: string;
  searchResults: SearchResult[];
  learnings: Learning[];
  report: string;
  sources: Source[];
  error: ResearchError | null;
}

export type ResearchEventType =
  | 'START' | 'ANSWER_QUESTIONS' | 'PLAN_COMPLETE'
  | 'SEARCH_RESULT' | 'LEARNING_EXTRACTED' | 'REPORT_CHUNK'
  | 'COMPLETE' | 'CANCEL' | 'ERROR';

// src/engine/research/orchestrator.ts
import type { ResearchState, ResearchPhase, ResearchEventType } from './types';

type Transition = { from: ResearchPhase; event: ResearchEventType; to: ResearchPhase };

const TRANSITIONS: Transition[] = [
  { from: 'idle',       event: 'START',              to: 'clarifying' },
  { from: 'clarifying', event: 'ANSWER_QUESTIONS',    to: 'planning' },
  { from: 'planning',   event: 'PLAN_COMPLETE',       to: 'searching' },
  { from: 'searching',  event: 'SEARCH_RESULT',       to: 'searching' },  // stay, accumulate
  { from: 'searching',  event: 'LEARNING_EXTRACTED',   to: 'analyzing' },
  { from: 'analyzing',  event: 'LEARNING_EXTRACTED',   to: 'analyzing' },  // stay, accumulate
  { from: 'analyzing',  event: 'REPORT_CHUNK',         to: 'reporting' },
  { from: 'reporting',  event: 'REPORT_CHUNK',         to: 'reporting' },  // stay, stream
  { from: 'reporting',  event: 'COMPLETE',             to: 'complete' },
  // Cancel and error are valid from any phase
];

export class ResearchOrchestrator {
  private state: ResearchState;
  private abortController: AbortController | null = null;
  private listeners: Set<(state: ResearchState) => void> = new Set();

  constructor(
    private readonly modelFactory: (config: any) => LanguageModelV1,
    private readonly searchFactory: (provider: string) => SearchProvider,
    private readonly knowledgeBase: KnowledgeStore | null,
    private readonly config: ResearchConfig,
  ) {
    this.state = this.initialState();
  }

  subscribe(listener: (state: ResearchState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn({ ...this.state }));
  }

  private transition(event: ResearchEventType): void {
    if (event === 'CANCEL') {
      this.abortController?.abort();
      this.state.phase = 'idle';
      this.notify();
      return;
    }
    if (event === 'ERROR') {
      this.state.phase = 'error';
      this.notify();
      return;
    }

    const transition = TRANSITIONS.find(
      t => t.from === this.state.phase && t.event === event
    );
    if (transition) {
      this.state.phase = transition.to;
      this.notify();
    }
  }

  async start(topic: string): Promise<void> {
    this.abortController = new AbortController();
    this.state.topic = topic;
    this.transition('START');

    try {
      await this.runClarify();
      // ... continues through phases
    } catch (err) {
      this.state.error = toResearchError(err);
      this.transition('ERROR');
    }
  }

  cancel(): void {
    this.transition('CANCEL');
  }
}
```

**Why this over the current hook-based approach:** The orchestrator is testable without React. State transitions are explicit and enforced. The hook becomes a thin adapter that subscribes to the orchestrator and syncs state into Zustand.

### Pattern 3: Composable Middleware

**What:** Replace the 814-line middleware.ts with composable functions, each handling one concern. Middleware chains through auth, rate limiting, and provider routing.

**When:** All API requests.

**Example:**

```typescript
// src/lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

type MiddlewareHandler = (
  req: NextRequest,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

function compose(...handlers: MiddlewareHandler[]): MiddlewareHandler {
  return async (req, final) => {
    let index = 0;

    async function run(): Promise<NextResponse> {
      if (index < handlers.length) {
        const handler = handlers[index++];
        return handler(req, run);
      }
      return final();
    }

    return run();
  };
}

// Individual middleware functions (each < 100 lines)
async function verifySignature(req: NextRequest, next: () => Promise<NextResponse>) { ... }
async function injectApiKey(req: NextRequest, next: () => Promise<NextResponse>) { ... }
async function rateLimit(req: NextRequest, next: () => Promise<NextResponse>) { ... }
async function filterModels(req: NextRequest, next: () => Promise<NextResponse>) { ... }

export const apiMiddleware = compose(
  verifySignature,
  rateLimit,
  injectApiKey,
  filterModels,
);
```

### Pattern 4: Centralized Environment Config with Zod

**What:** Single file validates all environment variables at startup. Replace 30+ scattered env var reads with one validated config object.

**When:** Application startup, config access.

**Example:**

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Build mode
  NEXT_PUBLIC_BUILD_MODE: z.enum(['default', 'standalone', 'export']).default('default'),

  // AI Provider keys (all optional - users configure in settings)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),

  // Search provider keys
  TAVILY_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  SEARXNG_BASE_URL: z.string().url().optional(),

  // Security
  ACCESS_PASSWORD: z.string().optional(),
  HMAC_SECRET: z.string().optional()
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed. Check server logs.');
  }
  return parsed.data;
}

export const env = validateEnv();
```

### Pattern 5: Structured Logging

**What:** Replace console.log/error with a structured logger that supports levels, context, and JSON output.

**When:** All logging throughout the application.

**Example:**

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel;
  private context: Record<string, unknown>;

  constructor(context?: Record<string, unknown>) {
    this.minLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
    this.context = context ?? {};
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...context });
  }

  debug(message: string, data?: Record<string, unknown>): void { this.log('debug', message, data); }
  info(message: string, data?: Record<string, unknown>): void { this.log('info', message, data); }
  warn(message: string, data?: Record<string, unknown>): void { this.log('warn', message, data); }
  error(message: string, error?: Error, data?: Record<string, unknown>): void { ... }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // implementation with structured output
  }
}

export const logger = new Logger();
```

### Pattern 6: Error Hierarchy

**What:** Domain-specific error classes with consistent handling. Replace the mixed throw/return empty/toast patterns.

**When:** All error scenarios.

**Example:**

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isUserFacing: boolean = false,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProviderError extends AppError {
  constructor(provider: string, message: string, cause?: Error) {
    super(`Provider ${provider} error: ${message}`, 'PROVIDER_ERROR', 502, true, cause);
  }
}

export class ResearchError extends AppError {
  constructor(phase: string, message: string, cause?: Error) {
    super(`Research ${phase} failed: ${message}`, 'RESEARCH_ERROR', 500, true, cause);
  }
}

export class StorageError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', 500, false, cause);
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500, false);
  }
}
```

### Pattern 7: Thin Hook Adapter

**What:** React hooks are thin wrappers that connect the engine layer to React lifecycle and Zustand stores. Business logic lives in the engine; hooks handle subscriptions, lifecycle, and React-specific concerns.

**When:** Every hook.

**Example:**

```typescript
// src/hooks/use-research.ts
import { useEffect, useRef, useCallback } from 'react';
import { useResearchStore } from '@/stores/research';
import { useSettingsStore } from '@/stores/settings';
import { ResearchOrchestrator } from '@/engine/research/orchestrator';
import { createModel } from '@/engine/provider/factory';
import { createSearchProvider } from '@/engine/search/factory';

export function useResearch() {
  const orchestratorRef = useRef<ResearchOrchestrator | null>(null);
  const { state, setState, reset } = useResearchStore();
  const settings = useSettingsStore(s => s.ai);

  const startResearch = useCallback(async (topic: string) => {
    reset();

    const orchestrator = new ResearchOrchestrator(
      (config) => createModel(config),
      (provider) => createSearchProvider(provider),
      null, // knowledge base
      settings,
    );

    orchestratorRef.current = orchestrator;

    // Sync orchestrator state to Zustand
    const unsubscribe = orchestrator.subscribe((orchState) => {
      setState(orchState);
    });

    await orchestrator.start(topic);

    return () => {
      unsubscribe();
      orchestratorRef.current = null;
    };
  }, [settings, setState, reset]);

  const cancelResearch = useCallback(() => {
    orchestratorRef.current?.cancel();
  }, []);

  useEffect(() => {
    return () => {
      orchestratorRef.current?.cancel();
    };
  }, []);

  return {
    ...state,
    startResearch,
    cancelResearch,
  };
}
```

### Pattern 8: Design System Component Pattern

**What:** Primitive UI components encapsulate Obsidian Deep design tokens. Components accept `className` for composition but have sensible defaults matching the design spec.

**When:** All UI components.

**Example:**

```typescript
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-br from-obsidian-primary to-obsidian-primary-deep text-[#1000a9] rounded-xl',
        secondary: 'bg-obsidian-surface-raised text-obsidian-on-surface hover:bg-obsidian-surface-bright rounded-xl',
        ghost: 'text-obsidian-primary hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Business Logic in React Hooks

**What:** Placing orchestration logic, API calls, and state machine transitions inside `useEffect` or custom hooks.
**Why bad:** Untestable without React, impossible to reuse outside components, leads to 800+ line hook files.
**Instead:** Extract to engine classes (see Pattern 2). Hooks only subscribe and dispatch.

### Anti-Pattern 2: Monolithic Components

**What:** Single component files exceeding 300 lines (the current Setting.tsx at 3000 lines is the extreme).
**Why bad:** Hard to navigate, impossible to test in isolation, high cognitive load, merge conflicts.
**Instead:** One responsibility per file. Settings becomes a dialog shell + individual tab components. Each tab < 300 lines.

### Anti-Pattern 3: Switch-Case Provider Selection

**What:** `switch(providerId)` duplicated in middleware, hooks, API routes, and config.
**Why bad:** Every new provider requires changes in N files. Easy to miss one location.
**Instead:** Single provider factory (see Pattern 1). All code asks the factory for a model instance.

### Anti-Pattern 4: API Keys in localStorage

**What:** Storing raw API keys in browser localStorage via Zustand persist.
**Why bad:** Any XSS attack exposes all keys. DevTools shows them in plain text.
**Instead:** For the rewrite, keys should be stored server-side in environment variables when possible. When client-side storage is necessary (user-provided keys), use encrypted storage or accept the trade-off explicitly with a documented security model. At minimum, never persist to localStorage -- use sessionStorage or in-memory only.

### Anti-Pattern 5: Scattered Environment Variables

**What:** `process.env.SOMETHING` appearing in 10+ files with no validation.
**Why bad:** Missing variables cause runtime crashes. No startup-time errors. Hard to document required config.
**Instead:** Centralized Zod-validated config (see Pattern 4). One import: `import { env } from '@/config/env'`.

### Anti-Pattern 6: Inconsistent Error Handling

**What:** Some functions throw, some return empty arrays, some show toast notifications.
**Why bad:** Callers cannot predict failure modes. Silent data loss. Poor UX.
**Instead:** Domain error hierarchy (see Pattern 6). Every async function throws typed errors. Error boundaries and hooks catch and display consistently.

### Anti-Pattern 7: Inline Third-Party Code

**What:** Copying an external library into `src/utils/parser/officeParser.ts` and modifying it.
**Why bad:** No upstream security patches. Maintenance burden. License ambiguity.
**Instead:** Use the npm package directly. If customization is needed, fork to a separate package with clear attribution, or wrap the library with an adapter in the engine layer.

## Subsystem Architecture Details

### 1. AI Provider Subsystem

**Problem solved:** Current codebase has 10 separate API route directories (`src/app/api/ai/google/`, `src/app/api/ai/openai/`, etc.) each with identical route handlers, plus duplicated switch-case logic in hooks, middleware, and config.

**New architecture:**

- **Two provider types only:** Google Gemini (native via `@ai-sdk/google`) and OpenAI-compatible (via `@ai-sdk/openai` with custom base URLs for DeepSeek, OpenRouter, Groq, xAI).
- **Single API route:** `/api/ai/[...slug]` reads provider from request body, resolves through the factory.
- **Provider registry:** A config object maps provider IDs to their metadata (name, base URL, env var for key, supported models). Adding a provider = adding one entry.

**Package dependency reduction:** From `@ai-sdk/anthropic`, `@ai-sdk/azure`, `@ai-sdk/deepseek`, `@ai-sdk/google-vertex`, `@ai-sdk/mistral`, `@ai-sdk/openai-compatible`, `@ai-sdk/xai`, `@openrouter/ai-sdk-provider`, `ollama-ai-provider` (9 packages) down to `@ai-sdk/google` + `@ai-sdk/openai` (2 packages).

### 2. Research Engine Subsystem

**Problem solved:** The 857-line `useDeepResearch` hook mixes React lifecycle, state management, API calls, streaming, and business logic.

**New architecture:**

- **ResearchOrchestrator class:** Framework-agnostic state machine. Manages phase transitions. Holds references to provider factory and search factory. Emits state updates via subscription.
- **Step modules:** Each research step (clarify, plan, search, analyze, report) is a separate module with a clear `execute()` function. Steps receive config and emit typed events.
- **Streaming integration:** Steps that stream AI output use the Vercel AI SDK `streamText()` and forward chunks to the orchestrator, which notifies subscribers.
- **Cancellation:** Single `AbortController` created at orchestrator start, passed to all steps. `cancel()` aborts everything cleanly.
- **Testing:** Orchestrator can be tested with mock factories. Steps can be unit tested independently.

### 3. Knowledge Base Subsystem

**Problem solved:** File parsing uses a modified inline library (718 lines of custom `officeParser.ts` + 62-line `pdfParser.ts`) with no table structure, no formatting metadata, and no OCR capability for PDFs. Knowledge search has no clear interface.

**New architecture:**
- **KnowledgeProcessor:** Accepts a File, detects MIME type, and routes to the appropriate parser:
  - **Office docs** (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) → `officeparser` v6 for structured AST extraction
  - **PDFs** → Send PDF file directly to an LLM-based OCR service via the OpenAI-compatible provider factory (e.g. GLM-OCR). No rendering to images needed — models accept PDF input natively. Returns structured text preserving tables, layout, and reading order.
  - **Plain text** (text, JSON, XML, YAML, code) → lightweight `text.ts` parser
- **Parsers:**
  - `office.ts`: Thin adapter wrapping `officeparser.parseOffice()` to return `{ text, ast }` (using `ast.toText()` for backward compatibility). Handles DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF.
  - `pdf-ocr.ts`: Sends PDF bytes directly to a vision-capable LLM (configured via the existing OpenAI-compatible provider factory — e.g. GLM-OCR) for OCR. The model accepts PDF input natively — no rendering to images needed. Returns structured text preserving tables, layout, and reading order. Handles scanned documents, images with text, and handwritten content that traditional text extraction misses.
  - `text.ts`: Handles plain text, JSON, XML, YAML, and code files directly.
- **KnowledgeStore (engine):** CRUD operations on knowledge entries. Uses IndexedDB via localforage for storage (not Zustand -- knowledge data can be large).
- **KnowledgeSearch:** Uses Fuse.js to fuzzy-match queries against stored knowledge content. Returns ranked results with relevance scores.
- **Integration:** Research orchestrator optionally includes knowledge search results in the search phase alongside web results.

### 4. PWA Subsystem

**Problem solved:** PWA support exists but service worker configuration is tangled with build config.

**New architecture:**

- **Serwist integration:** Continue using `@serwist/next` (already in dependencies) with clean configuration.
- **Service worker entry:** `src/app/sw.ts` defines caching strategies:
  - Static assets: CacheFirst (precache at build time)
  - API responses: StaleWhileRevalidate (show cached, update in background)
  - Images/fonts: CacheFirst with expiration (30 days)
- **Offline fallback:** Dedicated offline page for unmatched navigation requests.
- **Install prompt:** `usePWA` hook manages install prompt, update detection, and offline status.

### 6. i18n Subsystem

**Problem solved:** Incomplete translation coverage, some hardcoded strings.

**New architecture:**

- **react-i18next:** Continue using (already in dependencies) with namespace-per-feature organization.
- **Locale files:** JSON files in `src/locales/{lang}.json` with nested keys by feature area (research, settings, history, errors, common).
- **Type-safe keys:** Generate TypeScript types from locale files for autocomplete and compile-time missing key detection.
- **Language detection:** `i18next-browser-languagedetector` with localStorage persistence.

### 7. Middleware Subsystem

**Problem solved:** 814-line middleware with if-else chains, duplicated logic, security concerns.

**New architecture:**

- **Composable functions:** Each concern (signature verification, API key injection, rate limiting, model filtering) is a standalone function.
- **Composition:** `compose(fn1, fn2, fn3)` chains them. Adding a new concern = adding one function.
- **Config-driven:** Provider access control and model filtering read from validated config, not hardcoded conditionals.
- **Target:** < 200 lines total across all middleware functions. The `middleware.ts` entry point is < 50 lines.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **API proxy throughput** | Next.js serverless handles easily | Add rate limiting per IP, request queuing | Need dedicated proxy (Nginx/Cloudflare), offload from Next.js |
| **Research concurrency** | In-process orchestrator fine | AbortController cleanup critical, memory monitoring | Need job queue (BullMQ/Redis), offload research to workers |
| **Knowledge storage** | IndexedDB ~50MB sufficient | IndexedDB ~50MB sufficient (per user, client-side) | Same -- client-side storage scales linearly |
| **Bundle size** | Code-split by route, tree-shake providers | Monitor with bundle analyzer, lazy-load heavy parsers | Consider WASM for PDF parsing |
| **Search API costs** | Pay-per-request, acceptable | Add result caching (LRU), deduplicate queries | Server-side cache layer (Redis), search result pooling |
| **Offline support** | Basic precache sufficient | Background sync for pending research submissions | Full offline-first with IndexedDB queue + sync |

## Integration Points

### Between Subsystems

```
Provider Factory <----> Research Engine (provides AI model instances)
Search Factory   <----> Research Engine (provides search capability)
Knowledge Store  <----> Research Engine (provides local knowledge context)
Settings Store   <----> Provider Factory (provides API keys, model selection)
Settings Store   <----> Search Factory (provides search API keys)
Research Store   <----> UI Components (reactive rendering)
History Store    <----> Research Engine (saves completed research)
Service Worker   <----> API Routes (caching strategies)
Middleware       <----> API Routes (auth, key injection)
Logger           <----> All subsystems (structured logging)
Error Hierarchy  <----> All subsystems (consistent error handling)
```

### External Integration Points

| Integration | Protocol | Config Source |
|-------------|----------|---------------|
| Google Gemini API | HTTPS REST | Settings Store / env |
| OpenAI-compatible APIs | HTTPS REST (OpenAI format) | Settings Store / env |
| Tavily Search API | HTTPS REST | Settings Store / env |
| Firecrawl API | HTTPS REST | Settings Store / env |
| Exa Search API | HTTPS REST | Settings Store / env |
| Brave Search API | HTTPS REST | Settings Store / env |
| SearXNG | HTTPS REST (self-hosted) | Settings Store (base URL) |

## Build Order Implications

Based on the dependency graph between subsystems, the recommended build order for the architecture is:

1. **Foundation layer** (no dependencies): Config/env, error hierarchy, logger, cn utility, storage abstraction
2. **Engine primitives** (depends on foundation): Provider types, search types, research types
3. **Provider factory** (depends on engine types + AI SDK packages): The factory must work before anything else
4. **Search factory** (depends on engine types): Search adapters can be built in parallel with provider factory
5. **Knowledge processor** (depends on foundation): File parsers + knowledge store, independent of AI
6. **Research orchestrator** (depends on provider factory + search factory + knowledge): The core workflow engine
7. **Zustand stores** (depends on engine types): Define store shapes matching engine output
8. **Design system components** (depends on foundation): UI primitives with Obsidian Deep tokens
9. **React hooks** (depends on engine + stores): Thin adapters connecting orchestrator to React
10. **API routes + middleware** (depends on engine + config): Server-side proxy layer
11. **Page components** (depends on UI + hooks + stores): Assemble screens from components
12. **PWA + service worker** (depends on API routes): Offline caching layer
13. **i18n** (cross-cutting, can be integrated incrementally): Translation files and hook integration

## Sources

- Vercel AI SDK documentation: https://sdk.vercel.ai/docs
- AI SDK Core providers and models: https://sdk.vercel.ai/docs/ai-sdk-core
- Zustand documentation: https://zustand.docs.pmnd.rs
- Serwist (PWA for Next.js): https://serwist.pages.dev
- Next.js App Router documentation: https://nextjs.org/docs/app
- Project codebase analysis: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`

---

*Architecture research: 2026-03-31*

# Technology Stack

**Project:** Deep Research Rewrite
**Researched:** 2026-03-31
**Confidence:** HIGH (versions verified via npm registry)

## CRITICAL: Version Constraints Are Outdated

The project constraints specify "Next.js 15, Vercel AI SDK 4.x". As of March 2026:

| Constraint | Specified | Current Latest | Recommendation |
|------------|-----------|----------------|----------------|
| Next.js | 15.x | **16.2.1** (stable) | Use **Next.js 15.5.14** -- stable, well-tested, avoids v16 migration risk |
| AI SDK | 4.x | **6.0.141** (stable), 7.0.0-beta | Use **AI SDK 4.3.19** (last v4) OR upgrade to **6.0.141** |
| Zod | unspecified | **4.3.6** | Use **Zod 3.24.x** with AI SDK 4.x; use **Zod 4.3.x** with AI SDK 6.x |
| Tailwind CSS | 3.4.1 (old codebase) | **4.2.2** | Use **Tailwind CSS 4.2.2** -- complete rewrite, better DX |

**Recommendation: Upgrade AI SDK to v6 and use Zod v4.**

Rationale: AI SDK 4.x last release was July 2025 and is no longer maintained. AI SDK 6.x has been stable since December 2025 with 141 patch releases -- it is battle-tested. Starting a ground-up rewrite on an EOL SDK version creates immediate technical debt. The API surface is similar enough that the upgrade cost is minimal at project start, and the benefit is access to continued bug fixes, new model support, and provider improvements.

Similarly, use Tailwind CSS v4 which is a ground-up rewrite with CSS-first configuration, no `tailwind.config.ts` needed, and native dark mode support.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.5.14 | React framework, App Router, API routes | Stable v15 line, avoids v16 bleeding edge; App Router is mature; standalone output for Docker |
| React | 19.2.4 | UI library | Required by Next.js 15; Server Components, Actions, use() hook |
| React DOM | 19.2.4 | DOM rendering | Peer dependency of React 19 |
| TypeScript | 6.0.2 | Type safety | Latest stable; stricter checks, better inference |

### AI / LLM Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `ai` | 6.0.141 | AI SDK core -- streaming, text gen, structured output | Latest stable v6; 141 patches of bug fixes; active maintenance |
| `@ai-sdk/google` | 3.0.54 | Google Gemini provider (native) | Native Gemini support -- gemini-2.x models, structured output, tool calling. v3 pairs with ai v6 |
| `@ai-sdk/openai` | 3.0.49 | OpenAI provider | Official OpenAI provider. v3 pairs with ai v6. Also needed as base for OpenAI-compatible |
| `@ai-sdk/openai-compatible` | 2.0.37 | OpenAI-compatible API layer | Covers DeepSeek, OpenRouter, Groq, xAI via shared interface. v2 pairs with ai v6 |

**Provider architecture:** Two provider factories:
1. **Gemini native** via `@ai-sdk/google` -- for Google models
2. **OpenAI-compatible** via `@ai-sdk/openai-compatible` -- covers OpenAI, DeepSeek, OpenRouter, Groq, xAI with custom `baseURL` per provider

**Not included (intentionally dropped):**
- `@ai-sdk/anthropic` -- dropped per project scope
- `@ai-sdk/azure` -- dropped per project scope
- `@ai-sdk/mistral` -- dropped per project scope
- `@ai-sdk/deepseek` -- covered by openai-compatible
- `@ai-sdk/xai` -- covered by openai-compatible
- `@openrouter/ai-sdk-provider` -- covered by openai-compatible
- `ollama-ai-provider` -- dropped for v1.0

### Validation & Data

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zod` | 4.3.6 | Schema validation for env vars, API inputs, config | Latest v4; supports `zod/v3` backward compat export. AI SDK 6.x accepts `^3.25.76 \|\| ^4.1.8` |
| `react-hook-form` | 7.72.0 | Form state management | Battle-tested, tiny bundle, works with Zod resolver |
| `@hookform/resolvers` | 5.2.2 | Zod integration for react-hook-form | Must match react-hook-form version |

**Note on Zod v4:** Zod v4 exports both `zod/v4` (new API) and `zod/v3` (backward compat). AI SDK 6.x peer dependency accepts `^3.25.76 || ^4.1.8`. Using Zod v4 gives access to the newer API for application code while maintaining AI SDK compatibility.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zustand` | 5.0.12 | Client-side state management | Lightweight, no boilerplate, built-in persistence middleware. v5 stable with improved TypeScript inference |
| `localforage` | 1.10.0 | Offline-first storage abstraction | Wraps IndexedDB/WebSQL/localStorage with async API. Used by Zustand persist middleware for large research data |

### Styling & UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `tailwindcss` | 4.2.2 | Utility-first CSS | v4 is a complete rewrite -- CSS-first config, no `tailwind.config.ts`, native `@theme` blocks, automatic content detection |
| `@tailwindcss/postcss` | 4.2.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 integration with PostCSS |
| `postcss` | 8.5.8 | CSS processing pipeline | Required by Tailwind |
| `@tailwindcss/typography` | 0.5.19 | Prose styling for markdown content | Essential for rendering research reports with proper typography |
| **shadcn/ui** | 2.x | Component library (Radix + Tailwind + CVA) | Full code ownership, no lock-in. Radix primitives for a11y (Dialog, Select, Dropdown, Tabs, Accordion, Popover, Tooltip). Supports Tailwind v4 natively. Apply Obsidian Deep design by overriding CSS variables and restyling component variants -- no need to build from scratch |
| `class-variance-authority` | 0.7.1 | Component variant system | Powers shadcn's variant patterns. Add custom Obsidian variants (gradient button, surface hierarchy, AI pulse) |
| `clsx` | 2.1.1 | Conditional class name utility | Lightweight, no deps, works perfectly with Tailwind |
| `tailwind-merge` | 3.5.0 | Intelligent Tailwind class merging | Prevents class conflicts when composing components |
| `lucide-react` | 1.7.0 | Icon library | Comprehensive, tree-shakeable, consistent design |
| `sonner` | 2.0.7 | Toast notifications | Beautiful, accessible, minimal API |

**Not included (intentionally):**
- `next-themes` -- The Obsidian Deep design is dark-only. No theme switching needed. Hardcode dark mode in Tailwind v4 config via `@variant dark { ... }` or use CSS custom properties.
- Building custom component primitives -- shadcn/ui provides Radix-based accessible components (Dialog, Select, Dropdown, Tabs, Accordion, Popover, Tooltip, etc.) with full code ownership. No reason to rebuild these from scratch. Add components via `npx shadcn@latest add <component>` then restyle to match Obsidian Deep.

**Design system integration strategy:**

The Obsidian Deep design system (see `/design/DESIGN.md`) is applied to shadcn components through CSS variable remapping and variant customization -- not by replacing shadcn. This avoids weeks of building accessible primitives from scratch.

Steps:
1. **Override CSS variables** -- Map Obsidian tokens to shadcn's variable names in `globals.css` (e.g. `--background` → `#131315`, `--card` → `#201f22`, `--primary` → `#c0c1ff`). Drop light mode entirely.
2. **Restyle components** -- Remove borders (tonal layering instead), apply glassmorphism to floating elements, use surface hierarchy colors.
3. **Add custom variants** -- Gradient primary button, AI pulse indicator, ghost border pattern via CVA.
4. **Dark-only config** -- Delete `:root` light theme variables. Obsidian Deep has no light mode.

**Tailwind v4 configuration approach for Obsidian Deep:**

Tailwind v4 uses CSS-first configuration. No `tailwind.config.ts` file needed. shadcn v2 supports Tailwind v4 natively.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Obsidian Deep surface hierarchy */
  --color-well: #08090d;
  --color-deck: #0d0f14;
  --color-sheet: #13161d;
  --color-raised: #1a1e27;
  --color-float: #222733;

  /* Primary accent */
  --color-primary: #6366f1;
  --color-primary-muted: #4f46e5;

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Spacing scale */
  --spacing-18: 4.5rem;
}
```

### Markdown / Content Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `react-markdown` | 10.1.0 | Markdown rendering component | De-facto standard, plugin ecosystem |
| `remark-gfm` | 4.0.1 | GitHub Flavored Markdown | Tables, strikethrough, task lists |
| `remark-math` | 6.0.0 | LaTeX math syntax support | Research content frequently contains math |
| `rehype-highlight` | 7.0.2 | Syntax highlighting in code blocks | Lightweight, uses highlight.js |
| `rehype-katex` | 7.0.1 | LaTeX rendering | Renders math notation beautifully |
| `rehype-raw` | 7.0.0 | Raw HTML in markdown | Needed for embedded content |
| `katex` | 0.16.44 | Math typesetting engine | Peer dep of rehype-katex |
| `mermaid` | 11.13.0 | Diagram and chart rendering | Flowcharts, sequence diagrams in research reports |

**Note:** `marked` was in the old codebase. Drop it -- `react-markdown` with remark/rehype plugins covers all use cases. Using two markdown parsers creates inconsistency.

### File Processing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `officeparser` | 6.0.7 | Office document parser | Handles DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF. Returns structured AST with tables, formatting, metadata, images, chart data. Replaces custom officeParser.ts (718 lines) |
| `file-saver` | 2.0.5 | Client-side file download trigger | Small utility for saving generated reports |

**PDF OCR via LLM (no pdfjs-dist needed):**

PDFs are NOT parsed with officeparser or pdfjs-dist. Instead, the PDF file is sent directly to an OpenAI-compatible vision/OCR model (e.g. GLM-OCR, GPT-4o, Gemini) that natively accepts PDF input. The model returns structured text preserving layout, tables, and reading order.

This leverages the existing OpenAI-compatible provider factory — no new dependency needed. The OCR endpoint is configured in settings as another OpenAI-compatible provider with a custom `baseURL` and `apiKey`. Benefits:
- Handles scanned documents, images with text, handwritten content, complex layouts
- No intermediate rendering step — model reads PDF natively
- Same API surface across all vision-capable models (GLM-OCR, GPT-4o, Gemini, etc.)
- Improves as models improve — no code changes needed

**Office docs** (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) use `officeparser` v6 for structured AST extraction.
**Plain text** formats (text, JSON, XML, YAML, code) are handled by a lightweight `text.ts` parser in the engine layer.

### PWA / Offline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `serwist` | 9.5.7 | Service worker management | Successor to next-pwa. First-class Next.js integration |
| `@serwist/next` | 9.5.7 | Next.js Serwist integration | Works with Next.js 14+, App Router compatible |
| `@serwist/cli` | 9.5.7 | Serwist CLI tools | Required peer dep of @serwist/next v9.5.x |
| `react-use-pwa-install` | 1.0.3 | PWA install prompt hook | Custom install prompt for mobile browsers |

### Internationalization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next-intl` | 4.8.3 | Next.js i18n framework | Best i18n solution for Next.js App Router. Server Components support, type-safe, no `i18next` dependency needed |
| `typescript` | 6.0.2 | Required peer dep | next-intl requires TS >= 5.0 |

**Not included (intentionally):**
- `i18next` -- Drop in favor of `next-intl` which has its own message format. next-intl is purpose-built for Next.js App Router and handles Server Components natively. Using i18next with Next.js App Router requires workarounds.
- `react-i18next` -- Replaced by next-intl
- `i18next-browser-languagedetector` -- Replaced by next-intl's built-in detection
- `i18next-resources-to-backend` -- Replaced by next-intl's built-in lazy loading

### Logging & Observability

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `pino` | 10.3.1 | Structured JSON logging | Fastest Node.js logger (5x faster than Winston). Structured output, multiple transports, works in browser via `pino/browser` |
| `pino-pretty` | 13.1.3 | Dev-friendly log formatting | Readable logs during development, not for production |

**Architecture:** Pino runs on the server side (API routes, middleware). Client-side errors use a lightweight wrapper that sends to the server API route for structured logging. No need for heavy client-side logging libraries.

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

### Utilities

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `nanoid` | 5.1.7 | Unique ID generation | Small, fast, URL-safe. For research session IDs, request IDs |
| `dayjs` | 1.11.20 | Date manipulation | Lightweight moment.js alternative, immutable, chainable |
| `fuse.js` | 7.1.0 | Fuzzy search | Client-side fuzzy search for research history, settings |
| `radash` | 12.1.1 | Utility functions | Modern lodash alternative: `tryit`, `map`, `group`, `suspend`, `retry` |
| `p-limit` | 7.3.0 | Promise concurrency limiting | Rate limit concurrent API calls to providers |

**Note on `ts-md5`:** Drop it. Use the Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) for any hashing needs. MD5 is cryptographically broken and should not be used even for non-security purposes when alternatives exist.

### Dev Dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `eslint` | 10.1.0 | Linting | Flat config support, latest rules |
| `@eslint/js` | 10.0.1 | ESLint JS rules | Required for flat config |
| `typescript-eslint` | 8.58.0 | TypeScript ESLint integration | Official TS-aware linting |
| `@types/react` | 19.2.14 | React type definitions | Match React 19.x |
| `vitest` | 4.1.2 | Unit testing framework | Fast, Vite-native, TypeScript support out of box |
| `@testing-library/react` | 16.3.2 | React component testing | Standard for testing React components user-behavior-first |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AI SDK | ai@6.x | ai@4.x (project spec) | v4 EOL since July 2025. No bug fixes, no new model support. Starting fresh on EOL = instant debt |
| AI SDK | ai@6.x | ai@7.x (beta) | Beta, unstable API. Too risky for rewrite |
| Next.js | 15.5.14 | 16.2.1 | v16 just released, ecosystem still catching up. v15 is proven |
| i18n | next-intl | i18next + react-i18next | i18next requires workarounds for App Router / Server Components. next-intl is purpose-built |
| Logging | pino | winston | Pino is 5x faster, structured by default, better DX |
| Markdown | react-markdown | marked | Using both creates inconsistency. react-markdown + plugins covers everything |
| CSS | Tailwind v4 | Tailwind v3 | v4 is a ground-up rewrite with CSS-first config. Perfect for fresh project. v3 config format is deprecated |
| Theme | No next-themes | next-themes | Obsidian Deep is dark-only. No theme switching. Remove unnecessary dependency |
| Forms | react-hook-form | conform | RHF is more mature, larger community, better Zod integration |
| Utilities | radash | lodash | Tree-shakeable, modern API, no prototype pollution risk |
| Hashing | Web Crypto API | ts-md5 | MD5 is broken. Web Crypto is built-in, no dependency needed |

---

## Integration Points

### AI SDK Provider Factory Pattern

```typescript
// lib/ai/providers.ts
import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

type ProviderConfig = {
  type: 'gemini' | 'openai-compatible';
  apiKey: string;
  baseURL?: string;  // for openai-compatible providers
  modelId: string;
};

function createProvider(config: ProviderConfig) {
  switch (config.type) {
    case 'gemini':
      return google(config.modelId);
    case 'openai-compatible':
      return createOpenAICompatible({
        name: config.modelId,
        baseURL: config.baseURL!,
      })(config.modelId);
  }
}
```

### Zustand + LocalForage Persistence

```typescript
// stores/research-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';

export const useResearchStore = create(
  persist(
    (set) => ({ /* state + actions */ }),
    {
      name: 'deep-research-store',
      storage: createJSONStorage(() => localforage),
    }
  )
);
```

### Zod v4 + AI SDK v6 Compatibility

```typescript
// lib/validation/env.ts
import { z } from 'zod';  // Uses zod v4 API

// AI SDK v6 accepts both zod v3.25+ and v4.1+
// Zod v4 package exports both APIs:
// import { z } from 'zod/v4'  -- new API
// import { z } from 'zod/v3'  -- backward compat
```

### Pino in Next.js API Routes

```typescript
// app/api/research/route.ts
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  logger.info({ event: 'research_start', query: body.query });
  // ... research logic
  logger.info({ event: 'research_complete', sessionId, duration });
}
```

---

## Installation

```bash
# Core framework
npm install next@15.5.14 react@19.2.4 react-dom@19.2.4

# AI SDK v6 + providers
npm install ai@6 @ai-sdk/google@3 @ai-sdk/openai@3 @ai-sdk/openai-compatible@2

# Validation & forms
npm install zod@4 react-hook-form@7 @hookform/resolvers@5

# State management
npm install zustand@5 localforage@1

# Styling & UI
npm install tailwindcss@4 @tailwindcss/postcss@4 postcss@8 @tailwindcss/typography@0.5
npm install clsx@2 tailwind-merge@3 lucide-react@1 sonner@2 class-variance-authority@0.7
npx shadcn@latest init  # then add components: npx shadcn@latest add button dialog select tabs ...

# Markdown rendering
npm install react-markdown@10 remark-gfm@4 remark-math@6
npm install rehype-highlight@7 rehype-katex@7 rehype-raw@7 katex@0.16 mermaid@11

# File processing (officeparser for Office docs, LLM OCR for PDFs via existing provider factory)
npm install officeparser@6 file-saver@2

# PWA
npm install serwist@9 @serwist/next@9 @serwist/cli@9 react-use-pwa-install@1

# i18n
npm install next-intl@4

# Logging
npm install pino@10

# Utilities
npm install nanoid@5 dayjs@1 fuse.js@7 radash@12 p-limit@7

# Dev dependencies
npm install -D typescript@6 @types/react@19 eslint@10 @eslint/js@10 typescript-eslint@8
npm install -D vitest@4 @testing-library/react@16 pino-pretty@13
```

---

## Docker Deployment

The existing codebase already has Docker support. For the rewrite:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:standalone

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

---

## Sources

- npm registry (verified 2026-03-31): all package versions confirmed via `npm view`
- Vercel AI SDK docs: https://sdk.vercel.ai/docs/introduction -- banner states "AI SDK 4.2 is now available" but npm shows v6.0.141 as latest stable
- AI SDK version timeline: v4.3.19 (2025-07-15, last v4), v5.0.0 (2025-07-31), v6.0.0 (2025-12-22), v6.0.141 (2026-03-27)
- AI SDK v6 peer deps: `zod: "^3.25.76 || ^4.1.8"`, `react: "^18 || ^19 || ^19.0.0-rc"`
- AI SDK v4 peer deps: `zod: "^3.0.0"`, `react: "^18 || ^19 || ^19.0.0-rc"` -- v4 cannot use Zod v4
- Next.js 15.5.14 peer deps: `react: "^18.2.0 || 19.0.0-rc-* || ^19.0.0"`
- Serwist v9.5.7 peer deps: `next: ">=14.0.0"`, `@serwist/cli: "^9.5.7"`
- next-intl v4.8.3 peer deps: `next: "^12.0.0 || ^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0"`
- Tailwind CSS v4 uses CSS-first config (no tailwind.config.ts): https://tailwindcss.com/docs
- Pino is recommended as fastest Node.js logger: https://github.com/pinojs/pino

# Feature Landscape

**Domain:** AI-powered deep research tool with multi-step reasoning, search orchestration, and report generation
**Researched:** 2026-03-31

## Table Stakes

Features users expect from an AI research tool. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Research topic input | Entry point for the entire app. Users type a question and expect structured research. | Low | Simple text input. Current implementation has a Topic component with glassmorphism search bar. |
| Multi-step research workflow | Core value proposition. Users expect the AI to plan, search, analyze, and synthesize -- not just answer in one shot. | High | 5 sequential steps: clarifying questions, report plan, SERP query generation, parallel search tasks (with optional review loops), final report. Each step streams results progressively. |
| Streaming progress display | Users need real-time visibility into what the AI is doing during a multi-minute process. Without it, the app appears frozen. | Medium | ThinkTagStreamProcessor splits reasoning from content. TaskStore updates drive reactive UI. Requires smoothStream config (character/word/line). |
| Web search integration | Research without search is just an LLM chat. Users expect the tool to find real sources. | Medium | 6 search providers: Tavily, Firecrawl, Exa, Brave, SearXNG, plus model-native search (Gemini grounding, OpenAI web_search_preview, OpenRouter web plugin, xAI search). Standardized output: `{ sources, images }`. |
| AI model selection | Users have different API keys and cost/quality preferences. Must support at least one provider out of the box. | Medium | Rewriting reduces to 2 provider integrations: Google Gemini (native via @ai-sdk/google) and OpenAI-compatible (covers OpenAI, DeepSeek, OpenRouter, Groq, xAI). Each needs thinking model + networking (task) model config. |
| Final report generation | The deliverable. Users expect a structured markdown report with citations, not raw search results. | High | Report assembled from learnings, sources, images. Supports file-format resources (Vercel AI SDK `type: "file"`). Includes style preferences (balanced/executive/technical/concise) and length (brief/standard/comprehensive). |
| Source citations and references | Without citations, the report has no credibility. Users expect clickable source links. | Medium | Sources collected during search tasks, deduplicated by URL. Appended as markdown reference links. Google Gemini grounding metadata maps citation indices to segments. |
| Research history | Users return to past research. Without history, the tool is single-use. | Medium | HistoryStore persists completed sessions via localforage (IndexedDB fallback). Each session stores full TaskStore snapshot. CRUD operations: save, load, update, remove. |
| Settings management | Users must configure API keys, model choices, and research preferences. | Medium | Currently 92 setting fields in a monolithic store. Rewrite should use Zod-validated config with focused sub-components. Key categories: AI Models, Search Providers, Research Preferences, General. |
| Error handling and feedback | Multi-step processes fail often (API limits, bad keys, network errors). Users need clear messages, not silent failures. | Medium | Currently inconsistent (toast vs throw vs console.log). Rewrite needs structured error boundaries, consistent toast notifications, and error recovery per workflow step. |

## Differentiators

Features that set this tool apart from basic "ask an LLM" interfaces. Not universally expected, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dual-model architecture (thinking + networking) | Separates deep reasoning from search/processing tasks. Thinking model (e.g., Gemini 2.5 Pro) for planning and report writing. Networking model (e.g., Gemini 2.5 Flash) for search result processing. Optimizes cost and speed. | Medium | Both models configured per-provider. ThinkingModel handles: questions, report plan, SERP generation, review, final report. NetworkingModel handles: search result processing, knowledge extraction. |
| Auto-review loops | After initial search, the AI reviews results and generates follow-up queries to fill gaps. Configurable 0-5 rounds. Produces much more thorough reports than single-pass search. | Medium | `reviewSearchResult()` uses thinking model to evaluate learnings and suggest new queries. Loops until no new queries generated or max rounds reached. Key differentiator vs. simple search-summarize tools. |
| Knowledge base (file upload + URL crawling) | Users can inject proprietary documents, PDFs, and web pages into research. Enables research over private data that search engines cannot reach. | High | File parsing: Office docs (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) via `officeparser` v6 with structured AST; PDFs sent directly to an LLM-based OCR service (e.g. GLM-OCR) via the OpenAI-compatible provider factory — models accept PDF bytes natively, no rendering needed; plain text/JSON/XML/YAML/code via lightweight text parser. URL crawling via Jina Reader or local server-side crawler. Content chunked at 10K chars, rewritten by AI for XML/HTML content. Stored in KnowledgeStore with localforage persistence. |
| Prompt customization (deep research prompt overrides) | Power users can customize every prompt in the research pipeline. Enables domain-specific research tuning (academic, legal, medical, etc.). | Medium | `DeepResearchPromptOverrides` allows overriding: systemInstruction, outputGuidelinesPrompt, systemQuestionPrompt, reportPlanPrompt, generateSerpQueriesPrompt, processResultPrompt, processSearchResultPrompt, processSearchKnowledgeResultPrompt, reviewSerpQueriesPrompt, writeFinalReportPrompt, rewritingPrompt. Stored as JSON string in settings. |
| SSE endpoint for programmatic research | Server-side research execution with streamed events. Enables integration with external tools and workflows. | Medium | `/api/sse` route runs full DeepResearch pipeline server-side. Streams progress events (progress, message, error, reasoning). Client can abort via signal. Uses env vars for API keys (no browser needed). |
| CORS proxy mode | Allows deployment where API keys stay server-side. Users access the app via a password, not API keys. | Medium | `mode` setting: "local" (browser calls APIs directly), "proxy" (server-side middleware injects keys). Middleware verifies HMAC signature from access password. Provider disabling and model filtering via env vars. |
| Citation images | Embeds relevant images from search results directly into the final report with proper attribution. | Low | ImageSource objects collected from search providers. Appended as markdown image syntax with descriptions. Controlled by `citationImage` toggle. |
| Domain filtering for search | Users can restrict search to specific domains (e.g., only academic sources) or exclude domains (e.g., exclude forums). | Low | `searchIncludeDomains` and `searchExcludeDomains` in settings. Parsed from comma/newline-separated strings. Applied post-search via `applyDomainFilters()`. Supports wildcard subdomain matching. |
| PWA with offline capability | Installable as a desktop/mobile app. Service worker caches assets for offline access. | Low | Serwist for service worker. `src/app/sw.ts` entry point. Works with static export. |
| i18n (internationalization) | Multi-language UI and research output. Research reports can be generated in any language. | Medium | react-i18next with 4 locales: en-US, zh-CN, es-ES, vi-VN. Language setting also controls AI response language via system prompt injection. |
| Report style/length preferences | Users control report tone and depth. Executive summaries for business users, technical reports for engineers. | Low | 4 styles (balanced, executive, technical, concise) x 3 lengths (brief, standard, comprehensive). Injected as prompt additions to final report generation. |
| Only-use-local-resource mode | Research using only uploaded knowledge base documents, no web search. Enables fully private research over proprietary data. | Low | Toggle in settings. When enabled, `runSearchTask` skips web search after knowledge extraction. Useful for confidential documents. |
| Multi-API key rotation | Distribute load across multiple API keys to avoid rate limits. | Low | `multiApiKeyPolling()` function rotates through comma-separated API keys. Applied to both AI and search provider keys. |

## Anti-Features

Features to explicitly NOT build in the rewrite.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Anthropic/Azure/Mistral/Ollama provider integrations | Dropped from v1.0 scope. 10+ integrations created massive switch-case duplication (150-line provider factory, 350-line useAiProvider hook, 200-line getModel function, 40-line hasApiKey function). Maintaining all of them slowed iteration. | Google Gemini (native) + OpenAI-compatible layer. OpenAI-compatible covers DeepSeek, OpenRouter, Groq, xAI, and any future provider that exposes an OpenAI-compatible API. |
| Multi-user collaboration | Single-user tool. Adding user accounts, auth, and real-time sync adds enormous complexity for unclear value. The app runs client-side with user-owned API keys. | Keep single-user, client-side model. PWA with localStorage/localforage for persistence. |
| Real-time chat interface | Research is a structured workflow, not a conversation. Chat adds UI complexity (message threads, scroll management, context windows) that conflicts with the multi-step pipeline. | Keep the workflow-driven UI: input topic, watch progress, read report. The clarifying questions step provides interactivity without full chat. |
| Server-side deployment with user accounts | Requires backend infrastructure, database, auth, billing. Contradicts the client-side-first architecture. | Keep the proxy/CORS mode for server-side API key management. No user accounts needed. |
| Built-in vector database / RAG | Knowledge base is currently raw text with AI rewriting. Adding embeddings, vector search, and RAG pipeline is a separate product. | Keep simple text-based knowledge extraction. Content chunked and rewritten by AI. For the rewrite, consider improving chunk quality but skip vector search. |
| Mobile native app | Web-first with PWA covers mobile use cases. Native apps require separate codebases and app store distribution. | PWA is sufficient. Responsive design with Obsidian Deep system should handle mobile well. |
| Plugin/extension system | Over-engineering for v1.0. The prompt override system already provides extensibility without a formal plugin architecture. | Prompt customization + OpenAI-compatible provider support covers most extensibility needs. Revisit if/when community demand justifies it. |
| Google Vertex AI support | Requires complex auth (service account, private key, project/location config). Google Gemini native already covers Google's models. | Drop in v1.0. Google Gemini via API key is sufficient. Vertex AI can return as an advanced option later if enterprise users need it. |

## Feature Dependencies

```
AI Provider Integration (Gemini + OpenAI-compatible)
  |
  +---> Thinking Model Selection
  |       |
  |       +---> Clarifying Questions
  |       +---> Report Plan Generation
  |       +---> SERP Query Generation
  |       +---> Auto-Review Loop
  |       +---> Final Report Writing
  |
  +---> Networking Model Selection
          |
          +---> Search Result Processing
          +---> Knowledge Base Extraction

Search Provider Integration (Tavily/Firecrawl/Exa/Brave/SearXNG/Model-native)
  |
  +---> Domain Filtering
  +---> Multi-API Key Rotation

Multi-Step Research Workflow
  |
  +---> [1] Topic Input
  +---> [2] Clarifying Questions (optional)
  +---> [3] Report Plan
  +---> [4] SERP Query Generation
  +---> [5] Parallel Search Tasks
  |       |
  |       +---> Knowledge Base Lookup (if resources attached)
  |       +---> Web Search (if search enabled)
  |       +---> AI Processing of results
  |       +---> Source/Image collection
  |
  +---> [6] Auto-Review Loop (configurable 0-5 rounds)
  +---> [7] Final Report Generation
          |
          +---> Style/Length preferences
          +---> Citation images
          +---> Reference links

Knowledge Base
  |
  +---> File Upload (PDF/Office/Text)
  |       |
  |       +---> File Parsing
  |       +---> Content Chunking (10K limit)
  |       +---> AI Rewriting (for XML/HTML content)
  |
  +---> URL Crawling (Jina/Local)
  +---> Knowledge Storage (localforage/IndexedDB)
  +---> Knowledge Lookup during research tasks

Research History
  |
  +---> Depends on: TaskStore (research session data)
  +---> Storage: localforage (IndexedDB)
  +---> Operations: save, load, update, remove

Settings
  |
  +---> AI Provider Config (API key, proxy, models)
  +---> Search Provider Config (provider, API key, proxy, scope)
  +---> Research Preferences (parallel search, auto-review, max topics, style/length)
  +---> General (language, theme, debug mode)
  +---> Advanced (prompt overrides, domain filters)

CORS Proxy / Middleware
  |
  +---> Depends on: Settings (mode, access password)
  +---> API key injection
  +---> Provider disabling
  +---> Model filtering
  +---> HMAC signature verification

PWA
  |
  +---> Service Worker (Serwist)
  +---> Static export compatibility

i18n
  |
  +---> UI translations (react-i18next)
  +---> AI response language (system prompt injection)
  +---> Locale files (en-US, zh-CN, es-ES, vi-VN)
```

## MVP Recommendation

Prioritize (Phase 1 - Core Research):
1. AI provider factory (Gemini + OpenAI-compatible) -- without this, nothing works
2. Multi-step research workflow (plan, search, report) -- the core value proposition
3. Settings for provider configuration -- users cannot use the app without entering API keys
4. Streaming progress display -- the UI must show what is happening during research
5. Final report with citations -- the deliverable

Prioritize (Phase 2 - Essential Features):
6. Search provider integration (at least Tavily + model-native) -- web research
7. Research history -- so users can return to past research
8. Knowledge base (file upload) -- private data research
9. Obsidian Deep design system across all screens -- visual polish

Prioritize (Phase 3 - Differentiators):
10. Auto-review loops -- deeper research
11. Prompt customization -- power user feature
12. All search providers + domain filtering
13. CORS proxy mode -- server-side deployment
14. PWA + i18n -- accessibility

Defer:
- Google Vertex AI: Complex auth, Gemini native covers the same models. LOW priority.
- Only-use-local-resource mode: Edge case, can be added as a toggle later.
- Multi-API key rotation: Nice-to-have optimization, not critical for v1.0.

## Feature Complexity Summary

| Feature | Complexity | Reason |
|---------|-----------|--------|
| AI Provider Factory (Gemini + OpenAI-compatible) | Medium | Two integration paths. Gemini has native SDK quirks (grounding metadata, search grounding). OpenAI-compatible is well-standardized but needs baseURL/apiKey abstraction. |
| Multi-step research workflow | High | 5+ sequential steps, each with streaming, error recovery, and state management. The orchestration logic in useDeepResearch.ts is 855 lines -- needs clean decomposition. |
| Search provider integration | Medium | 6 providers, each with different API shapes. Standardize to `{ sources, images }` output. Model-native search adds per-provider tool/providerOptions config. |
| Knowledge base | High | File parsing: `officeparser` v6 for Office docs (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) + LLM-based OCR via OpenAI-compatible vision model (e.g. GLM-OCR) for PDFs (model accepts PDF directly, no rendering) + lightweight text parser. Replaces 3 legacy parsers. LLM OCR handles scanned docs, handwritten text, and complex layouts. |
| Settings | Medium | 92 flat fields currently. Rewrite needs Zod-validated schema, focused sub-components, and provider-specific conditional rendering. |
| Research history | Medium | CRUD over localforage storage. Session backup/restore. Import/export. Simple data model but storage quota management matters. |
| Streaming display | Medium | ThinkTagStreamProcessor + smoothStream + fullStream parsing. Google grounding metadata handling. OpenAI Chinese bracket fix. Provider-specific post-processing. |
| CORS proxy / middleware | Medium | Request interception, API key injection, signature verification, provider/model filtering. Currently 814 lines -- needs decomposition into composable handlers. |
| PWA | Low | Serwist configuration. Service worker registration. Well-established patterns. |
| i18n | Low-Medium | react-i18next setup. 4 locale files. AI response language is a prompt concern, not a UI concern. |
| Obsidian Deep design system | Medium | 6 screens with dark-only design, glassmorphism, surface hierarchy (Well/Deck/Sheet/Raised/Float). Tailwind configuration provided. Not complex, but needs consistent implementation across all components. |

## Sources

- Existing codebase analysis: useDeepResearch.ts (855 lines), DeepResearch engine (577 lines), provider.ts (150 lines), search.ts (458 lines), useKnowledge.ts (333 lines)
- Settings store: 92 configuration fields across AI, search, and general preferences
- Design system: SCREENS.md defines 6 screens with detailed element descriptions
- PROJECT.md: Validated requirements, active scope, and out-of-scope decisions

# Domain Pitfalls

**Domain:** AI-powered research tool (Next.js 15 + React 19 + Vercel AI SDK 4.x + Zustand)
**Researched:** 2026-03-31
**Context:** Ground-up rewrite addressing known issues from existing codebase

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Static Export + API Routes + PWA Contradiction

**What goes wrong:** The existing codebase has three build modes (`export`, `standalone`, default) that fundamentally change how the app works. Static export strips API routes and middleware entirely (confirmed by the `ignore-loader` webpack rule in `next.config.ts`). PWA service workers cache at build time but Docker containers may serve from different paths. These three features fight each other.
**Why it happens:** Next.js `output: "export"` cannot run API routes or middleware. Period. The current codebase works around this with a "CORS proxy mode" where the browser calls AI/search providers directly -- which means API keys are exposed in the browser. Meanwhile, PWA offline support requires caching API responses that may not exist in export mode.
**Consequences:** Either you lose PWA offline for API-dependent features in static export mode, or you must maintain two fundamentally different architectures (server-side proxy vs client-side direct calls) that diverge in behavior, error handling, and security.
**Prevention:** Decide one primary deployment target. For Docker, use `standalone` mode with the server. For static hosting, accept that API calls go direct from the browser and secure keys accordingly (or accept the limitation). Do NOT try to make both paths identical -- test each mode independently with integration tests.
**Detection:** If you find yourself writing `if (BUILD_MODE === "export")` conditionals in application code (not just build config), the architecture is splitting.

### Pitfall 2: AI SDK streamText Without Consumption Causes Silent Failures

**What goes wrong:** `streamText()` uses backpressure -- it only generates tokens as they are requested. If you start a stream but do not consume it (e.g., the user navigates away, a React component unmounts, an error occurs before the stream loop starts), the stream silently hangs and the underlying HTTP connection stays open. The `onError` callback fires but errors are suppressed to prevent crashes.
**Why it happens:** The AI SDK design choice to suppress errors in `streamText` (documented behavior: "immediately starts streaming and suppresses errors to prevent server crashes") means abandoned streams do not throw. The existing `useDeepResearch.ts` hook (857 lines) does not clean up streams on unmount.
**Consequences:** Memory leaks on the server, unclosed HTTP connections to AI providers (costing money), and research tasks that appear to hang without error feedback. With multi-step research making 5-10 sequential stream calls per query, this multiplies.
**Prevention:** Always wrap stream consumption in try/finally with explicit cleanup. Use AbortController for every stream call and abort on component unmount. Use the `onError` callback for structured error logging. Test unmount-during-stream scenarios explicitly.
**Detection:** Unclosed connections to AI providers in server logs; research tasks showing no error but never completing.

### Pitfall 3: JSON.parse on AI Output Without Fallbacks

**What goes wrong:** The research orchestration flow in the existing codebase parses AI output as JSON in multiple places (e.g., `generateSERPQuery` at line 177 of `index.ts`: `JSON.parse(removeJsonMarkdown(content))`). If the AI returns malformed JSON -- which happens frequently with cheaper models, non-English prompts, or when the model decides to add commentary around the JSON -- the entire research pipeline crashes.
**Why it happens:** LLMs do not guarantee valid JSON output even with explicit instructions. The `removeJsonMarkdown` helper tries to extract JSON from markdown code blocks, but models can produce output that looks like valid JSON but has trailing commas, unescaped characters, or partial truncation due to token limits.
**Consequences:** Research fails at the SERP query generation step, which is step 2 of 4 in the pipeline. The user sees an opaque error. No partial results are saved.
**Prevention:** Use Zod's `safeParse` with detailed error messages (the existing code does use Zod but only after `JSON.parse` -- the parse itself is the failure point). Wrap all JSON parsing of AI output in try/catch with retry logic. Consider using AI SDK's structured output (`generateObject` with Zod schema) instead of parsing raw text as JSON.
**Detection:** Error logs showing "Unexpected token" or "JSON.parse" at the SERP query generation step.

### Pitfall 4: Zustand Persist Stores Growing Until localStorage Quota Exceeded

**What goes wrong:** The `task.ts` store persists the entire research state (report plan, search tasks with full content, sources, images, final report) to localStorage via Zustand's persist middleware. The `history.ts` store accumulates completed research sessions. There is no quota management, no size limits, no cleanup policy, no pagination. localStorage has a 5-10MB per-origin limit.
**Why it happens:** Zustand's `persist` middleware writes the entire store on every `set()` call. Research reports can be 50-100KB of markdown. With images and sources metadata, a single research session can be 200KB+. Five sessions = 1MB. Twenty sessions = quota exceeded.
**Consequences:** Zustand persist silently fails (or throws in some browsers), corrupting the store. The user loses all settings and history. The app may not load at all if the persisted state cannot be parsed.
**Prevention:** (1) Do not persist large data in localStorage -- use IndexedDB (via `localforage` or Zustand's `persist` with a custom storage engine) for history and task data. (2) Implement a size-aware cleanup policy: cap history entries, compress old entries, or archive to IndexedDB. (3) Add error handling around persist operations with a quota check. (4) Separate volatile task state (current research) from persistent history (completed research).
**Detection:** Browser console showing "Failed to execute 'setItem' on 'Storage'" or "QuotaExceededError". App loading with default settings after having been configured.

### Pitfall 5: API Keys in Client-Side Zustand Stores

**What goes wrong:** The `setting.ts` store persists all API keys (OpenAI, Anthropic, DeepSeek, xAI, Mistral, Azure, Tavily, Firecrawl, Exa, Brave, etc.) as plain text in browser localStorage. Any XSS vulnerability in any dependency exposes every API key the user has configured.
**Why it happens:** The app runs as a client-side tool. In static export mode, there is no server to hold keys. The current architecture stores keys in the Zustand persist middleware, which serializes to localStorage by default.
**Consequences:** An XSS in any third-party dependency (npm packages, analytics scripts, etc.) can exfiltrate all API keys. Browser extensions with broad permissions can read localStorage. This is the highest-severity security issue in the codebase.
**Prevention:** (1) For the server-full mode (`standalone`), store keys server-side in encrypted cookies or a session store. (2) For static export mode, use `crypto.subtle` to encrypt keys with a user-provided passphrase before storing. (3) Never log or include keys in error reports. (4) Consider using `sessionStorage` for ephemeral use cases where persistence is not needed. (5) At minimum, do not persist API keys by default -- require explicit opt-in.
**Detection:** DevTools > Application > Local Storage showing plaintext API keys.

### Pitfall 7: Provider Abstraction That Cannot Handle Provider-Specific Features

**What goes wrong:** The rewrite simplifies to "Gemini native + OpenAI-compatible layer" but the existing `provider.ts` shows 13 provider branches with provider-specific behavior scattered throughout: OpenAI uses `openai.responses()` for certain models, Gemini uses `useSearchGrounding`, OpenRouter requires special `providerOptions`, Ollama needs custom `fetch` with credential handling. A naive two-branch abstraction will miss these.
**Why it happens:** "OpenAI-compatible" is a spectrum, not a standard. Each provider has quirks: DeepSeek's reasoning models return `reasoning_content` in a non-standard field, OpenRouter requires `HTTP-Referer` headers and uses provider-prefixed model IDs, Groq has different streaming behavior. The AI SDK has a dedicated `@ai-sdk/deepseek` provider and community `@openrouter/ai-sdk-provider` precisely because `createOpenAI()` with a custom baseURL does not cover all cases.
**Consequences:** Users of "OpenAI-compatible" providers experience silent failures, missing features, or incorrect behavior. Debugging is hard because the error looks like a provider issue but is actually an abstraction gap.
**Prevention:** Use the AI SDK's dedicated provider packages where they exist (`@ai-sdk/deepseek`, `@openrouter/ai-sdk-provider`, `@ai-sdk/groq`). Reserve `createOpenAI()` with custom baseURL only for truly unknown OpenAI-compatible endpoints. Create a provider registry that maps provider ID to the correct SDK factory, not a single generic factory. Test each provider independently.
**Detection:** Provider-specific features (tool calling, structured output, reasoning content) not working for providers that claim OpenAI compatibility.

## Moderate Pitfalls

### Pitfall 8: Next.js 15 Async params/searchParams Breaking Change

**What goes wrong:** In Next.js 15, `params` and `searchParams` in page and layout components are now Promises that must be awaited. Copying patterns from Next.js 14 tutorials or the existing codebase will cause type errors and undefined values.
**Prevention:** Always `await params` and `await searchParams` in page/layout components. Configure TypeScript strictly to catch this. Review every page component in the rewrite.

### Pitfall 9: React 19 ref-as-prop Without forwardRef Migration

**What goes wrong:** React 19 passes `ref` as a regular prop. Components using `forwardRef` will still work but the pattern is deprecated. More critically, components that accidentally accept a `ref` prop in their type definition will now receive the actual ref object, causing unexpected behavior.
**Prevention:** Remove `forwardRef` wrappers. Accept `ref` directly in component props. Do not name any prop `ref` unless it is meant to be a React ref.

### Pitfall 10: Sequential Search Tasks Instead of Parallel Execution

**What goes wrong:** The existing `runSearchTask` method iterates tasks with `for await (const item of tasks)` -- sequential processing. With 5 search tasks at 10-30 seconds each, the user waits 50-150 seconds when parallel execution could cut it to 10-30 seconds.
**Prevention:** Use `Promise.all` (or `p-limit` for controlled concurrency, which the existing `useDeepResearch.ts` already imports). The server-side `DeepResearch` class should accept a concurrency parameter. Add rate-limit awareness per provider.

### Pitfall 11: No AbortController Integration for Research Cancellation

**What goes wrong:** The existing research flow has no cancellation mechanism. If the user wants to stop research mid-way, the only option is to reload the page. Running streams continue consuming tokens and money on the server.
**Prevention:** Pass an AbortController signal through the entire research pipeline. The AI SDK's `streamText` and `generateText` accept an `abortSignal` option. On component unmount or user cancel, abort the signal. Propagate the signal through search providers and stream consumers.

### Pitfall 12: Zustand Store State Shape Migration on Rewrite

**What goes wrong:** The rewrite changes store shapes (simplified provider structure, different field names). Existing users who have persisted Zustand stores in their browser will experience deserialization errors or silently corrupted state when the new code reads the old shape.
**Prevention:** Since the rewrite is explicitly "no migration" (fresh start), use different localStorage keys for the new stores (e.g., `setting_v2` instead of `setting`). Add a `version` field to Zustand persist config and a `migrate` function for future-proofing. On first load, detect old keys and offer to clear them.

### Pitfall 13: File Upload Processing Blocking Serverless Functions

**What goes wrong:** Parsing documents is CPU-intensive and memory-heavy. Office files are ZIP archives requiring decompression via `officeparser`. PDFs are sent to an LLM-based OCR service (e.g. GLM-OCR) which adds API latency per file — large multi-page PDFs can be slow. In serverless environments (Vercel), this hits the 4.5MB payload limit (Hobby) or 50MB (Pro) and can exceed function timeouts (10s Hobby, 60s Pro).
**Prevention:** Set explicit file size limits. Limit PDF page count. Run document parsing on the Node.js runtime (not Edge). Add progress indicators for large files. Consider processing files client-side with Web Workers for the static export mode. For LLM-based OCR, send the PDF file directly (models accept PDF natively) to minimize overhead.

### Pitfall 14: Environment Variable Validation at Runtime Not Build Time

**What goes wrong:** The existing codebase has 30+ environment variables read at build time in `next.config.ts` and at runtime in middleware and API routes, with no validation. Missing or malformed variables cause cryptic runtime errors deep in the call stack (e.g., `undefined.split is not a function` when `GOOGLE_VERTEX_LOCATION` is missing).
**Prevention:** Create a single Zod schema for all environment variables. Validate at app startup (server-side) with clear error messages listing which variables are missing/invalid. For client-side variables (`NEXT_PUBLIC_*`), validate on first use with fallback defaults. Never silently default to empty strings for required configuration.

### Pitfall 15: Middleware Authorization Bypass via Edge Cases

**What goes wrong:** The existing middleware (814 lines) has a complex chain of conditionals for request authorization. The rewrite needs middleware for API route protection, but complex authorization logic in Edge middleware is fragile. The current signature verification uses `Date.now()` timestamps without nonce or expiration validation, making replay attacks trivial.
**Prevention:** Simplify middleware to a composable pattern: one function per concern (auth check, provider routing, CORS). Use proper HMAC or JWT with short expiration (5 minutes). Add integration tests that probe authorization bypass attempts. Consider whether middleware authorization is even needed in standalone Docker mode (network-level access control may suffice).

### Pitfall 16: AI SDK Provider-Specific Model ID Format Confusion

**What goes wrong:** Different providers use different model ID formats. The AI SDK uses the provider's native model ID. DeepSeek uses `deepseek-chat`, OpenRouter uses `deepseek/deepseek-chat`, xAI uses `grok-3`. The setting store currently stores model IDs as plain strings per provider, but the rewrite's simplified "OpenAI-compatible" layer must handle model ID translation.
**Prevention:** Create a model ID registry that maps provider + display name to the correct model ID for that provider. Do not let users type raw model IDs -- offer a curated list per provider with an "advanced" option for custom IDs. Validate model IDs against provider documentation before making API calls.

## Minor Pitfalls

### Pitfall 17: ThinkTagStreamProcessor Custom Parsing vs AI SDK Native Reasoning

**What goes wrong:** The existing codebase has a custom `ThinkTagStreamProcessor` that strips `<think />` tags from model output. This is needed because some models (DeepSeek R1, etc.) output reasoning in `<think/>` tags that are not part of the AI SDK's native reasoning handling. The AI SDK 4.x has native `reasoning` events in `fullStream`, but these only work for models that use the provider's native reasoning API (not raw think tags).
**Prevention:** Check which models use native AI SDK reasoning vs. think-tag output. For models with native reasoning support (Anthropic, OpenAI), use the SDK's `reasoning` stream events. For models with think-tag output, keep the processor but make it a clearly documented adapter, not interleaved with main stream logic.

### Pitfall 18: PWA Service Worker Version Conflicts After Docker Redeployment

**What goes wrong:** When deploying via Docker, the service worker from the previous deployment may remain active in users' browsers. The old service worker caches assets with build-specific hashes that no longer exist on the new deployment, causing white screens or stale API behavior.
**Prevention:** Ensure the service worker's `PRECACHE_MANIFEST` is regenerated on every Docker build. Use Serwist's `skipWaiting` and `clientsClaim` for immediate activation. Add a version check endpoint that the service worker polls to detect stale versions.

### Pitfall 19: i18n Bundle Size Bloat

**What goes wrong:** Loading all translation files for all languages upfront increases the initial bundle size. With multiple languages and the existing partial coverage (some hardcoded strings, some translated), the rewrite may end up with a mix of approaches.
**Prevention:** Use lazy loading for translation files (load only the active language). Use a consistent approach: all user-facing strings go through the translation function, or use a build-time extraction tool to find untranslated strings. Do not mix `react-i18next` with hardcoded strings.

### Pitfall 20: Experimental React Compiler Instability

**What goes wrong:** The existing `next.config.ts` enables `experimental.reactCompiler: true`. React Compiler is still experimental and can cause subtle bugs: incorrect memoization, missed re-renders, or crashes with complex patterns (especially with Zustand's `useSyncExternalStore` integration).
**Prevention:** Do not enable React Compiler in the rewrite from day one. Get the app working first, then benchmark with and without the compiler. If enabled, add it as an opt-in config, not the default. Have a build flag to disable it immediately if issues arise.

### Pitfall 21: Google Gemini-Specific Grounding Metadata Handling

**What goes wrong:** The existing code has Gemini-specific logic for processing grounding metadata (source citations from Gemini's search grounding). This logic mutates content with `content = content.replaceAll(...)` inside the stream loop, which is fragile and provider-specific. If the grounding metadata format changes or is used with a different model, citations break silently.
**Prevention:** Extract grounding metadata processing into a dedicated post-processing step, not inline during streaming. Make it a plugin that activates only for Gemini providers. Do not mutate the accumulated content string during stream processing -- collect metadata and apply transformations after the stream completes.

### Pitfall 22: Knowledge Base Resource ID Collision via Date.now()

**What goes wrong:** The existing knowledge store uses `Date.now()` for resource IDs. If two resources are added within the same millisecond (possible with batch uploads or fast operations), IDs collide and one resource overwrites the other.
**Prevention:** Use `crypto.randomUUID()` (available in all modern browsers and Node.js) for resource IDs. This is a one-line fix that eliminates the entire class of collision bugs.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project scaffolding + build config | Pitfall 1: Static export + API routes + PWA contradiction | Decide primary deployment target first; test build modes independently |
| Zustand store design | Pitfall 4: localStorage quota exceeded | Design storage architecture (localStorage vs IndexedDB) before writing stores |
| API key management | Pitfall 5: Plaintext keys in localStorage | Design encryption or server-side storage strategy before implementing settings |
| Provider factory | Pitfall 7: Provider-specific feature gaps | Use AI SDK dedicated provider packages; test each provider independently |
| Research orchestration | Pitfall 2: Stream cleanup on unmount; Pitfall 3: JSON parse failures | Design AbortController integration from the start; use `generateObject` for structured output |
| Middleware/authorization | Pitfall 15: Complex auth logic in middleware | Design composable middleware with proper HMAC/JWT before implementation |
| File upload/knowledge base | Pitfall 13: Serverless payload limits | Set explicit size limits; use Node.js runtime; test with real files |
| Search provider integration | Pitfall 10: Sequential vs parallel execution | Design concurrency from the start; rate-limit per provider |
| PWA/service worker | Pitfall 18: Stale cache after redeployment | Design versioning and cache-busting strategy with Serwist |

## Rewrite-Specific Pitfalls (Unique to Starting Over)

### Pitfall R1: Reimplementing Existing Subtle Fixes

**What goes wrong:** The existing codebase has accumulated subtle fixes for edge cases: OpenAI's Chinese context markdown reference bracket issue (the `replaceAll("【", "[")` in `index.ts`), Gemini grounding metadata processing, Ollama's credential stripping. The rewrite will lose these fixes if they are not explicitly catalogued.
**Prevention:** Before deleting the old codebase, extract and document every provider-specific workaround. Create a test suite that verifies these edge cases against the new implementation. The CONCERNS.md file is a start but does not capture all workarounds.

### Pitfall R2: Rewriting Without a Working Reference

**What goes wrong:** Starting the rewrite before having a fully documented feature set means features are forgotten or reimplemented incorrectly. The existing codebase is the only reference for behavior that users expect.
**Prevention:** The existing codebase should remain accessible (on a branch) during the rewrite. Create a feature checklist from the existing implementation BEFORE writing new code. Test new code against the old behavior for critical paths (research orchestration, search, report generation).

### Pitfall R3: Over-Engineering the Rewrite

**What goes wrong:** In response to the technical debt, the rewrite goes too far: 15-layer abstraction, plugin systems, event buses, over-generic provider interfaces. The result is code that is harder to understand than the original 3000-line component.
**Prevention:** Apply the 300-line limit pragmatically. Extract components and modules when there is a clear reason (reuse, testability, independent state changes), not just to hit a number. Prefer composition over abstraction. A 200-line file with clear logic is better than 5 files with an abstract factory pattern.

## Sources

- Vercel AI SDK generating-text documentation (verified 2026-03-31): https://sdk.vercel.ai/docs/ai-sdk-core/generating-text -- MEDIUM confidence (official docs, page live but URL structure may change)
- Vercel AI SDK providers and models documentation (verified 2026-03-31): https://sdk.vercel.ai/docs/foundations/providers-and-models -- HIGH confidence (official docs, lists all provider packages including `@ai-sdk/deepseek`, `@openrouter/ai-sdk-provider`)
- Existing codebase analysis: `.planning/codebase/CONCERNS.md` -- HIGH confidence (direct code review)
- AI SDK provider-specific behavior (DeepSeek, OpenRouter, Groq): LOW confidence (training data only, not verified against current SDK versions)
- Next.js 15 breaking changes (async params, caching defaults): MEDIUM confidence (well-documented change, consistent across multiple sources)
- React 19 ref-as-prop change: MEDIUM confidence (official React 19 release notes)

---

*Pitfalls research: 2026-03-31*