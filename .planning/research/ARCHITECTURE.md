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
