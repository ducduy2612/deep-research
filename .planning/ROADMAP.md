# Roadmap: Deep Research — Rewrite

## Overview

Ground-up rewrite of Deep Research building from foundation to full feature delivery. Starts with project scaffolding and the Obsidian Deep design system, then builds the AI provider layer, research engine, and search integration that form the core product. From there, the research UI connects everything into a usable tool, followed by settings/history, knowledge base, CORS proxy, and finally PWA/i18n cross-cutting concerns. Each phase delivers a coherent, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Design System** - Project scaffolding, Obsidian Deep design tokens, shadcn/ui components, env config, error hierarchy, structured logging, storage abstraction
- [ ] **Phase 2: Provider Factory and AI Integration** - Gemini native + OpenAI-compatible provider factory, streaming with AbortController cleanup, model registry
- [ ] **Phase 3: Research Engine Core** - ResearchOrchestrator state machine, multi-step workflow with structured output, cancellation support
- [ ] **Phase 4: Search Provider Integration** - All 5 search providers, model-native search, domain filtering, citation images, parallel execution
- [ ] **Phase 5: Core Research UI** - Research Hub screen, Active Research screen with streaming progress, Final Report display, report configuration
- [ ] **Phase 6: Settings and History** - Tabbed settings dialog with Zod validation, prompt customization, research history with localforage persistence
- [ ] **Phase 7: Knowledge Base** - File upload and parsing (PDF via LLM OCR, Office via officeparser, plain text), URL crawling, knowledge store
- [ ] **Phase 8: CORS Proxy Mode** - Local/proxy mode switching, HMAC verification, composable route handlers
- [ ] **Phase 9: PWA, i18n, and Polish** - Serwist PWA with offline support, next-intl i18n with lazy-loaded locales, final polish

## Phase Details

### Phase 1: Foundation and Design System
**Goal**: The project runs locally with the Obsidian Deep design system applied, all infrastructure utilities in place, and a verified component architecture
**Depends on**: Nothing (first phase)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Developer can run `npm run dev` and see a page rendered with Obsidian Dark theme (dark background, Inter body font, JetBrains Mono for code, tonal surface layering)
  2. Surface hierarchy (Well, Deck, Sheet, Raised, Float) renders correctly via Tailwind utility classes with tonal layering and no borders between surfaces
  3. Floating elements display glassmorphism effect (backdrop-blur, semi-transparent background) confirming the design token system is wired end-to-end
  4. All shadcn/ui primitives are installed and restyled with Obsidian Deep CSS variables, producing dark-mode-appropriate controls
  5. Every component file in the project is under 300 lines (lint rule or CI check enforces this)
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Provider Factory and AI Integration
**Goal**: Users can configure and connect to any supported AI provider (Gemini + OpenAI-compatible) with validated API keys and working streaming responses
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06
**Success Criteria** (what must be TRUE):
  1. User can configure a Google Gemini provider with an API key and select specific thinking and networking models, then receive a streamed text response to a test prompt
  2. User can configure an OpenAI-compatible provider (OpenAI, DeepSeek, OpenRouter, Groq, or xAI) with API key, base URL, and model selection, then receive a streamed text response
  3. System returns structured data via AI SDK `generateObject` with Zod schema validation, not raw JSON parsing, when requesting structured AI responses
  4. System cleanly cancels in-progress AI streams when abort is triggered, with no memory leaks or dangling connections (verifiable via browser dev tools memory timeline)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Research Engine Core
**Goal**: Users can start a research session on a topic and receive a complete, structured markdown report with citations, while watching real-time progress of each step
**Depends on**: Phase 2
**Requirements**: RES-01, RES-02, RES-03, RES-05, RES-06
**Success Criteria** (what must be TRUE):
  1. User can input a research topic and the system begins the multi-step workflow (clarifying questions, report plan, search tasks, report generation), with each step emitting streaming progress events
  2. User receives a structured markdown final report with inline citations and a source references section after the workflow completes
  3. User can abort an in-progress research session at any step and see partial results (any steps completed before abort are preserved)
  4. When any research step fails (API limit, invalid key, network error), user sees a clear error message identifying which step failed and can retry or reconfigure
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Search Provider Integration
**Goal**: Users can research with real web sources from any configured search provider, with domain filtering and citation images
**Depends on**: Phase 3
**Requirements**: SRC-01, SRC-02, SRC-03, SRC-04, SRC-05, SRC-06, SRC-07, SRC-08
**Success Criteria** (what must be TRUE):
  1. User can configure and use any of the 5 search providers (Tavily, Firecrawl, Exa, Brave, SearXNG) and receive search results during a research session
  2. System automatically uses model-native search (Gemini grounding, OpenAI web_search_preview) when available for the selected AI provider, falling back to configured search providers otherwise
  3. User can restrict search to specific domains (include-only) or exclude domains using wildcard subdomain matching (e.g., `*.example.com`)
  4. User can toggle citation images on, causing relevant images from search results to be embedded in the final report alongside text citations
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Core Research UI
**Goal**: Users interact with the full research workflow through the Obsidian Deep-themed Research Hub and Active Research screens, configuring report parameters and viewing results
**Depends on**: Phase 4
**Requirements**: RES-04
**Success Criteria** (what must be TRUE):
  1. User lands on the Research Hub screen with a topic input area and can start a new research session with selected report style (balanced, executive, technical, concise) and length (brief, standard, comprehensive)
  2. During research, user sees real-time streaming progress on the Active Research screen showing which step is running (clarify, plan, search, analyze, report) with step indicators and activity log
  3. Final report renders as rich markdown with clickable citations, a table of contents sidebar, and source reference cards, all styled with Obsidian Deep design
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Settings and History
**Goal**: Users can configure all application settings through focused sub-components and manage their research history with persistent storage
**Depends on**: Phase 5
**Requirements**: SET-01, SET-02, SET-03, SET-04, SET-05, HIST-01, HIST-02, HIST-03, HIST-04
**Success Criteria** (what must be TRUE):
  1. User can open a tabbed settings dialog with focused sections (AI Models, Search, Research Preferences, General, Advanced) and configure all settings with Zod-validated inputs showing clear error messages on invalid entries
  2. User can override any prompt in the research pipeline (system instruction, questions, plan, SERP generation, review, report, rewriting) through the Advanced settings tab
  3. Settings persist across browser sessions via localforage (IndexedDB) -- closing and reopening the app retains all configuration
  4. User can view a list of past research sessions showing topic, date, and status, open any session to view the full report and sources, and delete individual sessions
  5. Each settings sub-component is under 300 lines (consistent with component architecture constraint)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Knowledge Base
**Goal**: Users can upload documents and URLs as research sources, using them alongside or instead of web search
**Depends on**: Phase 6
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06
**Success Criteria** (what must be TRUE):
  1. User can upload PDF files and have their content extracted via LLM-based OCR (handling scanned documents and complex layouts), then use the extracted content in research
  2. User can upload Office documents (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) and plain text files (TXT, JSON, XML, YAML, code) and have them parsed into searchable text
  3. User can add URLs to the knowledge base and have their content crawled and extracted for use in research
  4. User can toggle local-only mode to restrict research to knowledge base documents only, disabling web search entirely
  5. System chunks uploaded content at 10K character boundaries and rewrites non-plain-text content via AI for better searchability
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: CORS Proxy Mode
**Goal**: Users can run the app in proxy mode where API keys are stored server-side and injected via verified requests
**Depends on**: Phase 7
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. User can switch between local mode (browser calls APIs directly with client-side keys) and proxy mode (server-side API key injection), with the transition requiring no changes to the research workflow
  2. Proxy mode verifies all incoming requests via HMAC signature derived from a configured access password, rejecting unsigned or invalid requests
  3. Proxy mode supports disabling specific providers and filtering available models via environment variables, limiting what client users can access
  4. Middleware is decomposed into composable route handlers (replacing a monolithic if-else chain), with each handler being independently testable
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: PWA, i18n, and Polish
**Goal**: Users can install the app as a PWA, use it in multiple languages, and experience a polished Obsidian Deep interface across all screens
**Depends on**: Phase 8
**Requirements**: PWA-01, PWA-02, I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. User can install the app as a PWA on desktop or mobile browser and launch it from the home screen with app-like behavior
  2. Service worker caches assets for offline access -- user can open the app without network connectivity and see the cached UI
  3. User can switch the UI language between English (en-US) and Vietnamese (vi-VN), with all UI text updating immediately and locale files lazy-loaded for performance
  4. User can set a research output language that controls the AI response language via system prompt, producing reports in the selected language
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Design System | 0/? | Not started | - |
| 2. Provider Factory and AI Integration | 0/? | Not started | - |
| 3. Research Engine Core | 0/? | Not started | - |
| 4. Search Provider Integration | 0/? | Not started | - |
| 5. Core Research UI | 0/? | Not started | - |
| 6. Settings and History | 0/? | Not started | - |
| 7. Knowledge Base | 0/? | Not started | - |
| 8. CORS Proxy Mode | 0/? | Not started | - |
| 9. PWA, i18n, and Polish | 0/? | Not started | - |
