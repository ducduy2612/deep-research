# Requirements: Deep Research — Rewrite

**Defined:** 2026-03-31
**Core Value:** Users can input a research question and receive a comprehensive, sourced AI-generated report — with visibility into the research process, sources, and reasoning.

## v1 Requirements

Requirements for milestone v1.0 Full Rewrite. Each maps to roadmap phases.

### Research Workflow

- [ ] **RES-01**: User can input a research topic via the Research Hub screen
- [ ] **RES-02**: User can watch real-time streaming progress of each research step (clarifying questions, report plan, search tasks, report generation)
- [ ] **RES-03**: User receives a structured markdown final report with citations, source references, and optional images
- [ ] **RES-04**: User can configure report style (balanced, executive, technical, concise) and length (brief, standard, comprehensive)
- [ ] **RES-05**: User can abort an in-progress research session and see partial results
- [ ] **RES-06**: User receives clear error feedback when any research step fails (API limits, bad keys, network errors) with recovery options

### AI Provider Integration

- [ ] **AI-01**: User can configure Google Gemini provider with API key and select thinking/networking models
- [ ] **AI-02**: User can configure OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Groq, xAI) with API key, base URL, and model selection
- [ ] **AI-03**: User can assign separate thinking and networking models per provider (dual-model architecture)
- [ ] **AI-04**: User can customize which model is used at each step of the research workflow (clarify, plan, search, analyze, review, report)
- [ ] **AI-05**: System uses AI SDK structured output (`generateObject`) instead of raw JSON parsing for all structured AI responses
- [ ] **AI-06**: System properly cleans up AI streams on abort/unmount with AbortController to prevent memory leaks

### Search Integration

- [ ] **SRC-01**: User can configure and use Tavily as a search provider
- [ ] **SRC-02**: User can configure and use Firecrawl as a search provider
- [ ] **SRC-03**: User can configure and use Exa as a search provider
- [ ] **SRC-04**: User can configure and use Brave Search as a search provider
- [ ] **SRC-05**: User can configure and use SearXNG as a self-hosted search provider
- [ ] **SRC-06**: System uses model-native search (Gemini grounding, OpenAI web_search_preview) when available for the selected provider
- [ ] **SRC-07**: User can restrict search to specific domains (include) or exclude domains with wildcard subdomain matching
- [ ] **SRC-08**: User can toggle citation images to embed relevant images from search results into the final report

### Knowledge Base

- [ ] **KB-01**: User can upload PDF files and have them parsed via LLM-based OCR
- [ ] **KB-02**: User can upload Office documents (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) and have them parsed via officeparser
- [ ] **KB-03**: User can upload plain text files (TXT, JSON, XML, YAML, code) and have them parsed
- [ ] **KB-04**: User can crawl URLs for content via Jina Reader or local crawler
- [ ] **KB-05**: User can toggle local-only mode to research using only uploaded knowledge base documents without web search
- [ ] **KB-06**: System chunks uploaded content at 10K character boundaries and rewrites non-plain-text content via AI

### Settings Management

- [ ] **SET-01**: User can configure all settings through a tabbed settings dialog (AI Models, Search, Research Preferences, General, Advanced)
- [ ] **SET-02**: System validates all settings input via Zod schemas with clear error messages
- [ ] **SET-03**: User can override any prompt in the research pipeline (system instruction, questions, plan, SERP generation, review, report, rewriting)
- [ ] **SET-04**: Settings persist across sessions via localforage (IndexedDB)
- [ ] **SET-05**: Settings sub-components are each under 300 lines, replacing the monolithic settings component

### Research History

- [ ] **HIST-01**: User can view a list of past research sessions with topic, date, and status
- [ ] **HIST-02**: User can open a past research session and view the full report and sources
- [ ] **HIST-03**: User can delete individual research sessions
- [ ] **HIST-04**: System persists research sessions to localforage (IndexedDB) with quota management and cleanup policies

### CORS Proxy Mode

- [ ] **SEC-01**: User can switch between local mode (browser calls APIs directly) and proxy mode (server-side API key injection)
- [ ] **SEC-02**: Proxy mode verifies access via HMAC signature from configured access password
- [ ] **SEC-03**: Proxy mode supports provider disabling and model filtering via environment variables
- [ ] **SEC-04**: Middleware is decomposed into composable route handlers (replacing monolithic if-else chain)

### Design System

- [ ] **UI-01**: All 6 screens implement Obsidian Deep design system (dark-only, tonal layering, no borders)
- [ ] **UI-02**: System uses surface hierarchy (Well → Deck → Sheet → Raised → Float) consistently across all components
- [ ] **UI-03**: Floating elements use glassmorphism (backdrop-blur, semi-transparent backgrounds)
- [ ] **UI-04**: Typography uses Inter for body and JetBrains Mono for code, with consistent spacing tokens
- [ ] **UI-05**: No component file exceeds 300 lines

### PWA

- [ ] **PWA-01**: User can install the app as a PWA on desktop and mobile
- [ ] **PWA-02**: Service worker caches assets for offline access via Serwist

### Internationalization

- [ ] **I18N-01**: User can switch UI language between English (en-US) and Vietnamese (vi-VN)
- [ ] **I18N-02**: User can set research output language, which controls AI response language via system prompt
- [ ] **I18N-03**: Locale files are lazy-loaded for performance

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional i18n Locales

- **I18N-04**: User can switch UI language to Chinese (zh-CN)
- **I18N-05**: User can switch UI language to Spanish (es-ES)

### Advanced Integrations

- **ADV-01**: External tools can trigger research via SSE endpoint (`/api/sse`) with streamed progress events
- **ADV-02**: User can configure multiple API keys per provider with automatic rotation to distribute load

## Out of Scope

| Feature | Reason |
|---------|--------|
| Anthropic/Azure/Mistral/Ollama provider integrations | Dropped for v1.0. OpenAI-compatible layer covers 5+ providers. 10+ integrations created massive switch-case duplication in legacy code. |
| Multi-user collaboration | Single-user tool. No backend auth system needed. |
| Real-time chat interface | Research is a structured workflow, not a conversation. Chat adds UI complexity that conflicts with the pipeline. |
| Mobile native app | Web-first with PWA is sufficient for mobile use cases. |
| Server-side deployment with user accounts | Client-side model with proxy mode for API key management is sufficient. |
| Built-in vector database / RAG | Separate product category. Text-based knowledge extraction is sufficient for v1.0. |
| Plugin/extension system | Prompt overrides + OpenAI-compatible provider support covers extensibility. |
| Google Vertex AI | Complex auth (service account, private key). Google Gemini via API key is sufficient. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | — |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 0
- Unmapped: 37 ⚠️

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
