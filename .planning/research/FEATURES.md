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
