# M001: M001: v1.0 — Full Rewrite

## Vision
A ground-up rewrite of the Deep Research application — an AI-powered research tool that orchestrates multi-step web research using various LLM providers. The rewrite applies the Obsidian Dark design system, simplifies AI providers to Gemini native + OpenAI-compatible, and establishes clean architecture from the start.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Foundation And Design System | medium | — | ✅ | Project runs locally with Obsidian Deep design tokens, shadcn/ui components, env config, error hierarchy, structured logging, and storage abstraction. |
| S02 | Provider Factory and AI Integration | medium | S01 | ✅ | Gemini native + OpenAI-compatible provider factory with streaming, AbortController cleanup, and model registry. |
| S03 | Research Engine Core | medium | S02 | ✅ | ResearchOrchestrator state machine running multi-step workflow with structured output and cancellation support. |
| S04 | Search Provider Integration | medium | S03 | ✅ | All 5 search providers (Tavily, Firecrawl, Exa, Brave, SearXNG) with model-native search, domain filtering, and citation images. |
| S05 | Core Research UI | medium | S04 | ✅ | Research Hub screen, Active Research screen with streaming progress, Final Report display, and report configuration. |
| S06 | Settings and History | medium | S05 | ✅ | Tabbed settings dialog with Zod validation, prompt customization, research history with localforage persistence. |
| S07 | Knowledge Base | medium | S06 | ✅ | File upload and parsing (PDF, Office, text), URL crawling, knowledge store with IndexedDB. |
| S08 | CORS Proxy Mode | medium | S07 | ✅ | Local/proxy mode switching, HMAC verification, composable route handlers. |
| S09 | PWA, i18n, and Polish | medium | S08 | ✅ | PWA installable with offline support, i18n with lazy-loaded locales, polished Obsidian Deep interface. |
