# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**AI Providers (LLMs):**
- Google Generative AI (Gemini)
  - SDK: `@ai-sdk/google`
  - Default URL: `https://generativelanguage.googleapis.com`
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY` env var
  - Config: `GOOGLE_GENERATIVE_AI_API_BASE_URL`

- OpenAI
  - SDK: `@ai-sdk/openai`
  - Default URL: `https://api.openai.com`
  - Auth: `OPENAI_API_KEY` env var
  - Config: `OPENAI_API_BASE_URL`

- Anthropic Claude
  - SDK: `@ai-sdk/anthropic`
  - Default URL: `https://api.anthropic.com`
  - Auth: `ANTHROPIC_API_KEY` env var
  - Config: `ANTHROPIC_API_BASE_URL`

- Azure OpenAI
  - SDK: `@ai-sdk/azure`
  - URL Pattern: `https://{AZURE_RESOURCE_NAME}.openai.azure.com/openai/deployments`
  - Auth: `AZURE_API_KEY`, `AZURE_RESOURCE_NAME`, `AZURE_API_VERSION` env vars
  - Config: `AZURE_API_BASE_URL`

- Google Vertex AI
  - SDK: `@ai-sdk/google-vertex`
  - URL Pattern: `https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google`
  - Auth: Service account credentials (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_PRIVATE_KEY_ID`)
  - Config: `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_LOCATION`

- DeepSeek
  - SDK: `@ai-sdk/deepseek`
  - Default URL: `https://api.deepseek.com`
  - Auth: `DEEPSEEK_API_KEY` env var
  - Config: `DEEPSEEK_API_BASE_URL`

- xAI (Grok)
  - SDK: `@ai-sdk/xai`
  - Default URL: `https://api.x.ai`
  - Auth: `XAI_API_KEY` env var
  - Config: `XAI_API_BASE_URL`

- Mistral AI
  - SDK: `@ai-sdk/mistral`
  - Default URL: `https://api.mistral.ai`
  - Auth: `MISTRAL_API_KEY` env var
  - Config: `MISTRAL_API_BASE_URL`

- OpenRouter
  - SDK: `@openrouter/ai-sdk-provider`
  - Default URL: `https://openrouter.ai/api`
  - Auth: `OPENROUTER_API_KEY` env var
  - Config: `OPENROUTER_API_BASE_URL`

- Ollama (Local)
  - SDK: `ollama-ai-provider`
  - Default URL: `http://0.0.0.0:11434`
  - Auth: None (local only)
  - Config: `OLLAMA_API_BASE_URL`

- OpenAI-Compatible APIs
  - SDK: `@ai-sdk/openai-compatible`
  - Config: `OPENAI_COMPATIBLE_API_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`

- Pollinations AI
  - Default URL: `https://text.pollinations.ai/openai`
  - Config: `POLLINATIONS_API_BASE_URL`

**Search Providers:**
- Tavily
  - Default URL: `https://api.tavily.com`
  - Auth: `TAVILY_API_KEY` env var
  - Config: `TAVILY_API_BASE_URL`, `TAVILY_SCOPE`

- Firecrawl
  - Default URL: `https://api.firecrawl.dev`
  - Auth: `FIRECRAWL_API_KEY` env var
  - Config: `FIRECRAWL_API_BASE_URL`

- Exa
  - Default URL: `https://api.exa.ai`
  - Auth: `EXA_API_KEY` env var
  - Config: `EXA_API_BASE_URL`, `EXA_SCOPE`

- Bocha
  - Default URL: `https://api.bochaai.com`
  - Auth: `BOCHA_API_KEY` env var
  - Config: `BOCHA_API_BASE_URL`

- Brave Search
  - Default URL: `https://api.search.brave.com/res`
  - Auth: `BRAVE_API_KEY` env var
  - Config: `BRAVE_API_BASE_URL`

- SearXNG (Self-hosted)
  - Default URL: `http://0.0.0.0:8080`
  - Config: `SEARXNG_API_BASE_URL`, `SEARXNG_SCOPE`

**Web Crawling:**
- Jina Reader
  - URL: `https://r.jina.ai`
  - Purpose: Extract readable content from web pages
  - Implementation: `src/utils/crawler.ts`
  - Auth: None

## Data Storage

**Databases:**
- None (serverless architecture)

**File Storage:**
- Browser storage via `localforage`
  - IndexedDB/WebSQL backend
  - Location: `src/utils/storage.ts`

**Caching:**
- Serwist service worker with runtime caching
  - PWA offline capability
  - Config: `src/app/sw.ts`

**Session Storage:**
- Zustand persistence middleware
  - Stores: setting, history, knowledge, task, global
  - Location: `src/store/`

## Authentication & Identity

**Auth Provider:**
- Custom implementation
  - Access password: `ACCESS_PASSWORD` env var
  - Signature-based API authentication: `src/utils/signature.ts`
  - Google Vertex service account auth: `src/utils/vertexAuth.ts`

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Console-based logging
  - Debug mode toggle: `debug` setting in store

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
  - Config: `vercel.json`
  - Security headers configured

**Docker:**
  - Config: `docker-compose.yml`
  - Port: 3333:3000

**Static Export:**
- GitHub Pages or static hosting support
  - Build mode: `npm run build:export`
  - Limitation: API routes disabled

## Environment Configuration

**Required env vars:**

**AI Provider Keys:**
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `XAI_API_KEY`
- `MISTRAL_API_KEY`
- `AZURE_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_COMPATIBLE_API_KEY`

**Search Provider Keys:**
- `TAVILY_API_KEY`
- `FIRECRAWL_API_KEY`
- `EXA_API_KEY`
- `BOCHA_API_KEY`
- `BRAVE_API_KEY`

**Google Vertex Auth:**
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PRIVATE_KEY_ID`
- `GOOGLE_VERTEX_PROJECT`
- `GOOGLE_VERTEX_LOCATION`

**Azure Config:**
- `AZURE_RESOURCE_NAME`
- `AZURE_API_VERSION`

**App Config:**
- `ACCESS_PASSWORD` - Optional access restriction
- `HEAD_SCRIPTS` - Optional custom head scripts

**API Base URLs (optional overrides):**
- `API_PROXY_BASE_URL`
- `GOOGLE_GENERATIVE_AI_API_BASE_URL`
- `OPENROUTER_API_BASE_URL`
- `OPENAI_API_BASE_URL`
- `ANTHROPIC_API_BASE_URL`
- `DEEPSEEK_API_BASE_URL`
- `XAI_API_BASE_URL`
- `MISTRAL_API_BASE_URL`
- `OPENAI_COMPATIBLE_API_BASE_URL`
- `POLLINATIONS_API_BASE_URL`
- `OLLAMA_API_BASE_URL`
- `TAVILY_API_BASE_URL`
- `FIRECRAWL_API_BASE_URL`
- `EXA_API_BASE_URL`
- `BOCHA_API_BASE_URL`
- `BRAVE_API_BASE_URL`
- `SEARXNG_API_BASE_URL`

**Public Runtime Config:**
- `NEXT_PUBLIC_VERSION` - App version from package.json
- `NEXT_PUBLIC_BUILD_MODE` - Build mode (standalone/export)
- `NEXT_PUBLIC_DISABLED_AI_PROVIDER` - Comma-list of disabled AI providers
- `NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER` - Comma-list of disabled search providers
- `NEXT_PUBLIC_MODEL_LIST` - Custom model allow/blocklist

**Secrets location:**
- Environment variables (`.env` file or deployment platform)
- Google Vertex secrets: Service account JSON credentials

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None (direct API calls only)

## MCP (Model Context Protocol) Server

**Protocol:**
- Custom MCP server implementation
- Location: `src/libs/mcp-server/`
- Tools exposed:
  - `deep-research` - Full research workflow
  - `write-research-plan` - Generate research plan
  - `generate-SERP-query` - Generate search queries
  - `search-task` - Execute search tasks
  - `write-final-report` - Generate final report

**Configuration:**
- `MCP_AI_PROVIDER` - AI provider for MCP
- `MCP_SEARCH_PROVIDER` - Search provider for MCP
- `MCP_THINKING_MODEL` - Model for planning
- `MCP_TASK_MODEL` - Model for task execution

---

*Integration audit: 2026-03-31*
