# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Next.js App Router with Client-Side State Management

**Key Characteristics:**
- Next.js 15 App Router with Server Components and API routes
- Zustand for client-side state management with persistence
- Multi-provider AI integration using Vercel AI SDK
- Research workflow orchestrated through custom hooks
- Serverless API routes with Edge runtime support

## Layers

**Presentation Layer (Components):**
- Purpose: React components that render UI and handle user interactions
- Location: `src/components/`
- Contains: Research workflow components, knowledge management, settings UI, reusable UI components
- Depends on: Zustand stores, custom hooks, utility functions
- Used by: Next.js page routes

**State Management Layer (Stores):**
- Purpose: Centralized state management with persistence
- Location: `src/store/`
- Contains: TaskStore, HistoryStore, KnowledgeStore, SettingStore, GlobalStore
- Depends on: Zustand with persist middleware
- Used by: Components and hooks

**Business Logic Layer (Hooks):**
- Purpose: Research workflow orchestration and reusable logic
- Location: `src/hooks/`
- Contains: Deep research orchestration, web search, knowledge management, AI provider selection
- Depends on: Stores, utilities, AI SDK, search providers
- Used by: Components

**Utility Layer:**
- Purpose: Shared utilities and helper functions
- Location: `src/utils/`
- Contains: Deep research engine, search providers, text processing, file handling, parser utilities
- Depends on: External libraries (AI SDK, PDF.js, etc.)
- Used by: Hooks and components

**API Layer:**
- Purpose: Server-side proxy routes for external APIs
- Location: `src/app/api/`
- Contains: AI provider proxies, search provider proxies, SSE endpoint, MCP server, crawler
- Depends on: External APIs, middleware authentication
- Used by: Client-side fetch calls

**Middleware Layer:**
- Purpose: Request authentication and provider proxying
- Location: `src/middleware.ts`
- Contains: Signature verification, API key injection, provider disabling, model filtering
- Depends on: Environment variables, utility functions
- Used by: Next.js request pipeline

## Data Flow

**Research Workflow:**

1. User enters research topic in `src/components/Research/Topic.tsx`
2. `useDeepResearch` hook orchestrates the workflow:
   - `askQuestions()` - Generates clarifying questions using thinking model
   - `writeReportPlan()` - Creates research plan using thinking model
   - `deepResearch()` - Generates SERP queries and executes searches
   - `runSearchTask()` - Executes parallel searches with optional knowledge base
   - `writeFinalReport()` - Synthesizes final report from learnings
3. Each step streams results to `TaskStore` state
4. Components reactively display progress through `WorkflowProgress` and `SearchResult`
5. Final report displayed in `FinalReport` component with export options

**Knowledge Base Flow:**

1. User uploads files or adds URLs in `src/components/Knowledge/`
2. Files parsed in `src/utils/parser/` (PDF, Office, text)
3. Content stored in `KnowledgeStore` with custom storage backend
4. During research, `searchLocalKnowledges()` queries knowledge base
5. Learnings combined with web search results

**API Proxy Flow:**

1. Client makes request to `/api/ai/{provider}/[...slug]` or `/api/search/{provider}/[...slug]`
2. `middleware.ts` verifies signature and injects API keys
3. Next.js rewrites proxy request to actual provider API
4. Provider response returned to client

**State Management:**

- TaskStore: Active research session (ephemeral, persisted to localStorage)
- HistoryStore: Completed research sessions (persisted to custom storage)
- KnowledgeStore: User knowledge base (persisted to custom storage)
- SettingStore: User preferences and API keys (persisted to localStorage)
- GlobalStore: UI state (modals, panels) - non-persistent

## Key Abstractions

**DeepResearch Class:**
- Purpose: Orchestrates multi-step research workflow with streaming
- Examples: `src/utils/deep-research/index.ts`
- Pattern: Event-driven architecture with `onMessage` callback for progress updates

**AI Provider Factory:**
- Purpose: Unified interface for multiple AI providers (Google, OpenAI, Anthropic, etc.)
- Examples: `src/utils/deep-research/provider.ts`, `src/hooks/useAiProvider.ts`
- Pattern: Factory pattern with dynamic imports and provider-specific configurations

**Search Provider Factory:**
- Purpose: Unified interface for multiple search APIs (Tavily, Exa, Brave, etc.)
- Examples: `src/utils/deep-research/search.ts`
- Pattern: Switch-based factory returning standardized `{ sources, images }` format

**Custom Storage Backend:**
- Purpose: Abstract storage layer for large data (IndexedDB fallback)
- Examples: `src/utils/storage.ts`
- Pattern: Async storage interface used by Zustand persist middleware

**ThinkTagStreamProcessor:**
- Purpose: Processes streaming AI responses, separating thinking from content
- Examples: Used throughout `src/hooks/useDeepResearch.ts`
- Pattern: Streaming text processor with dual callbacks for content and reasoning

## Entry Points

**Main Page:**
- Location: `src/app/page.tsx`
- Triggers: Application root URL
- Responsibilities: Renders research workflow components (Header, Topic, SearchResult, FinalReport)

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All routes
- Responsibilities: Theme provider, i18n provider, global styles, service worker registration

**API Routes:**
- Location: `src/app/api/*/route.ts`
- Triggers: Client fetch calls
- Responsibilities: Proxy requests to AI/search providers with authentication

**SSE Endpoint:**
- Location: `src/app/api/sse/route.ts`
- Triggers: Server-sent events for long-running research
- Responsibilities: Streams research progress using DeepResearch class

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: All `/api/*` requests
- Responsibilities: Authentication, API key injection, provider access control

## Error Handling

**Strategy:** Graceful degradation with user feedback

**Patterns:**
- `try-catch` blocks in all async functions with toast notifications
- `onError` callbacks passed to AI SDK streaming functions
- Parse error handling with fallback values in form validation
- API error responses returned as JSON with appropriate status codes

**Cross-Cutting Concerns**

**Logging:** Console-based logging with conditional debug mode in production

**Validation:** Zod schemas for form validation and data verification (import/export, API responses)

**Authentication:** Signature-based verification using HMAC in middleware, with access password support

**Internationalization:** react-i18next with locale files in `src/locales/`

**Theming:** next-themes with system/light/dark support

**Service Worker:** Serwist for PWA functionality and offline support

---

*Architecture analysis: 2026-03-31*
