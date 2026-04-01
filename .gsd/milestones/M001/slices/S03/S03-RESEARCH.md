# S03 Research: Research Engine Core

**Slice:** S03 — Research Engine Core
**Depends on:** S02 (Provider Factory and AI Integration) ✅
**AI SDK version:** v4.3.19 (installed, NOT v6)
**Date:** 2026-03-31

## Summary

S03 builds the ResearchOrchestrator — a framework-agnostic state machine that drives the multi-step research workflow (clarify → plan → search → analyze → review → report). The old codebase implements this as an 857-line React hook (`useDeepResearch.ts`) and a 577-line class (`DeepResearch`). The new implementation extracts the orchestration logic into a testable class with no React or Zustand dependencies, using the provider registry and streaming utilities from S02.

**Key decision:** The orchestrator does NOT own search execution in S03. Search is deferred to S04. The orchestrator defines the search step interface (`SearchProvider`) and uses a no-op/placeholder for now. This keeps S03 focused on state machine logic, step transitions, and structured output.

## Requirements Owned

| Requirement | Description | S03 Scope |
|-------------|-------------|-----------|
| RES-01 | User can input a research topic | Defines the input types and orchestrator start trigger |
| RES-02 | User can watch real-time streaming progress | Event emitter pattern for step lifecycle events |
| RES-03 | User receives a structured markdown final report | Final report generation step |
| RES-05 | User can abort an in-progress research session | AbortController propagated through all steps |
| RES-06 | User receives clear error feedback when any step fails | Error handling with step-level recovery context |

## Implementation Landscape

### What exists (S02 deliverables)

| File | Purpose | S03 consumes |
|------|---------|-------------|
| `src/engine/provider/types.ts` | ProviderConfig, ModelRole, ResearchStep, StepModelMap, Zod schemas | ResearchStep type for step names, StepModelMap for model resolution |
| `src/engine/provider/registry.ts` | createRegistry, resolveModel, getDefaultModel | Model resolution for each step |
| `src/engine/provider/streaming.ts` | streamWithAbort, generateStructured | streamWithAbort for streaming steps, generateStructured for SERP queries |
| `src/engine/provider/factory.ts` | createProvider, createGoogleProvider, createOpenAICompatibleProvider | Indirect — via registry |
| `src/engine/provider/index.ts` | Barrel export | All imports |
| `src/lib/errors.ts` | AppError with codes RESEARCH_STEP_FAILED, RESEARCH_ABORTED | Error handling |
| `src/lib/logger.ts` | Structured logger | Logging |

### What to build

#### 1. Research Types (`src/engine/research/types.ts`)
- `ResearchState` — enum: `idle`, `clarifying`, `planning`, `searching`, `analyzing`, `reviewing`, `reporting`, `completed`, `failed`, `aborted`
- `ResearchConfig` — input config: topic, stepModelMap, providerConfigs, language, reportStyle, reportLength, autoReviewRounds, maxSearchQueries
- `ResearchEvent` — discriminated union of all lifecycle events (step-start, step-delta, step-reasoning, step-complete, step-error, progress)
- `SearchTask` — `{ query: string; researchGoal: string }`
- `SearchResult` — `{ query: string; researchGoal: string; learning: string; sources: Source[]; images: ImageSource[] }`
- `Source`, `ImageSource` — port from old types, no store dependency

#### 2. Prompts (`src/engine/research/prompts.ts`)
Pure functions that return prompt strings. Each takes explicit inputs, no global state:
- `getSystemPrompt()` — system instruction with date placeholder
- `getClarifyPrompt(topic)` — generate follow-up questions
- `getPlanPrompt(topic)` — generate report structure
- `getSerpQueriesPrompt(plan)` — generate search queries (structured output)
- `getAnalyzePrompt(query, researchGoal)` — analyze search results
- `getReviewPrompt(plan, learnings, suggestion)` — determine if more research needed
- `getReportPrompt(plan, learnings, sources, images, requirements)` — write final report
- `getOutputGuidelinesPrompt()` — formatting rules for final report

Templates ported from `_archive/src-v0/constants/prompts.ts`. Override support via `PromptOverrides` partial record merged at construction time.

#### 3. Search Provider Interface (`src/engine/research/search-provider.ts`)
- `SearchProvider` interface — `search(query: string): Promise<{ sources: Source[]; images: ImageSource[] }>`
- `NoOpSearchProvider` — returns empty arrays. Used in S03 tests. S04 replaces with real implementations.

#### 4. ResearchOrchestrator (`src/engine/research/orchestrator.ts`)
The core state machine class (~250-350 lines). Methods:
- `constructor(config: ResearchConfig)` — stores config, builds registry
- `start()` → runs full pipeline: clarify → plan → search → analyze → [review loop] → report
- `abort()` → sets abort controller, transitions to `aborted`
- `on(event, handler)` → subscribe to lifecycle events
- `getState()` → current state
- `getResult()` → final report data (null until completed)

Internal step methods (private):
- `runClarify()` — streamText via streamWithAbort, emit text deltas
- `runPlan()` — streamText via streamWithAbort, emit text deltas
- `runSearch()` — calls searchProvider.search() for each SERP query, then analyze via streamText
- `runReview()` — generateStructured with Zod schema for follow-up queries, loop back to runSearch if queries returned
- `runReport()` — streamText via streamWithAbort, final markdown assembly with source citations

Each step:
1. Transitions state
2. Emits `step-start` event
3. Resolves model for this step via StepModelMap
4. Calls AI SDK via streamWithAbort or generateStructured
5. Emits `step-delta` / `step-reasoning` events during streaming
6. Emits `step-complete` event
7. On error: emits `step-error`, transitions to `failed`

#### 5. Barrel Export (`src/engine/research/index.ts`)
- Re-export types, orchestrator, search provider interface

#### 6. Tests (`src/engine/research/__tests__/`)
- `types.test.ts` — validate ResearchState transitions, ResearchConfig schema
- `orchestrator.test.ts` — state machine transitions, abort, error handling, event emission

### Natural seams for task decomposition

| Task | Files | Risk | Reason |
|------|-------|------|--------|
| T01: Types + Zod schemas | `types.ts` | Low | Pure type definitions, no runtime dependencies beyond zod |
| T02: Prompts | `prompts.ts` | Low | Pure functions, string templates from old code |
| T03: Search provider interface | `search-provider.ts` | Low | Interface + NoOp, 20 lines |
| T04: Orchestrator + tests | `orchestrator.ts`, `index.ts`, `__tests__/` | Medium | Core logic, abort handling, event emission |

T01-T03 are independent and can be parallel. T04 depends on T01-T03.

## Key Design Decisions

### 1. Framework-agnostic orchestrator class
The orchestrator is a plain TypeScript class with no React, Zustand, or Next.js imports. State management is internal (private fields). Events use a simple `Set<callback>` pattern. This makes it testable in isolation and decoupled from UI lifecycle.

### 2. Event emitter (not Zustand store)
The orchestrator emits events. The UI layer (S05) will subscribe and bridge to Zustand. This avoids coupling the engine to the UI framework. Event types:
```
step-start    { step: ResearchStep, state: ResearchState }
step-delta    { step: ResearchStep, text: string }
step-reasoning { step: ResearchStep, text: string }
step-complete  { step: ResearchStep, duration: number }
step-error     { step: ResearchStep, error: AppError }
progress       { step: ResearchStep, progress: number }
```

### 3. Search as dependency injection
`SearchProvider` interface injected into the orchestrator. S03 uses `NoOpSearchProvider`. S04 implements real providers. This allows testing the orchestrator without real search APIs.

### 4. Model resolution per step
Each step resolves its model via `resolveModelForStep(step)` using the StepModelMap. Falls back to thinking model for clarify/plan/report, networking model for search/analyze.

### 5. Abort via AbortController
Single `AbortController` created at `start()`, signal propagated to all `streamWithAbort` and `generateStructured` calls. Calling `abort()` cancels the current step and prevents subsequent steps.

### 6. SERP queries via generateStructured
Old code uses `parsePartialJson(removeJsonMarkdown(content))` — fragile. New code uses `generateStructured()` with a Zod schema, getting validated typed output directly. The schema:
```ts
z.array(z.object({
  query: z.string().describe("The search query"),
  researchGoal: z.string().describe("What this query aims to accomplish"),
}))
```

## Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| AI SDK v4 fullStream event types differ from v6 docs | Medium | Use v4 event types (`text-delta`, `reasoning`, `source`, `finish`), verified in installed package |
| SERP query JSON parsing fails with some models | Medium | `generateStructured` wraps `generateObject` which handles schema enforcement; add retry logic |
| Stream cleanup on abort not working | High | S02 already established AbortController pattern; reuse `streamWithAbort` consistently |
| Review loop infinite | Low | Hard cap via `autoReviewRounds` config (0-5) |
| Prompt templates missing edge cases | Low | Port directly from battle-tested old code; override system for customization |

## Forward Intelligence for Executor

### What's fragile
- **AI SDK v4 `fullStream` event types** — The exact type names (`text-delta`, `reasoning`, `source`, `finish`) are hardcoded. If we upgrade to v6, these change. The orchestrator should centralize stream consumption in a helper to minimize the blast radius.
- **SERP query schema** — The Zod schema for search queries must match what the LLM produces. The old code uses `z.array(z.object({ query: z.string(), researchGoal: z.string() }))`. Use the same schema.

### What changed from the old code
- No more `parsePartialJson` / `removeJsonMarkdown` for structured output — use `generateStructured()`
- No more direct `useSettingStore.getState()` calls — config is passed in at construction
- No more `ThinkTagStreamProcessor` for every step — only for models without reasoning capability
- Gemini grounding post-processing deferred to S04
- Chinese bracket fix (`【】` → `[]`) deferred to S04

### Test strategy
- Mock `LanguageModel` from AI SDK using `MockLanguageModelV4` from `ai/test`
- Test state transitions: idle → clarifying → planning → searching → ... → completed
- Test abort at each step: verify state goes to `aborted`, no hanging promises
- Test error recovery: verify step failure → state goes to `failed` with error context
- Test events: verify correct event sequence emitted for each step
- Test SERP query generation with `generateStructured`: verify Zod schema validation

## Don't Hand-Roll

- **State machine library** — The orchestrator has 10 states and linear transitions. A state machine library (XState) is overkill. A simple state enum with transition validation is sufficient.
- **Event emitter library** — A `Set<handler>` with `emit()` is 5 lines. No need for EventEmitter or RxJS.

## Sources

- AI SDK v4 `streamText` fullStream API: confirmed in `node_modules/ai/dist/index.d.ts`
- AI SDK v4 `generateObject` with Zod: confirmed via `declare function generateObject` signature
- Old orchestrator pattern: `_archive/src-v0/hooks/useDeepResearch.ts` (857 lines) and `_archive/src-v0/utils/deep-research/index.ts` (577 lines)
- Old task store: `_archive/src-v0/store/task.ts`
- Old prompts: `_archive/src-v0/constants/prompts.ts` (366 lines)
- S02 provider types: `src/engine/provider/types.ts`
- S02 streaming utilities: `src/engine/provider/streaming.ts`