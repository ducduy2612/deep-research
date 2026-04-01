---
estimated_steps: 8
estimated_files: 3
skills_used: []
---

# T03: Build ResearchOrchestrator state machine with full test suite

Implement the ResearchOrchestrator class — a framework-agnostic state machine that drives the full research pipeline (clarify → plan → search → analyze → [review loop] → report). Uses S02's registry for model resolution, streamWithAbort for streaming steps, generateStructured for SERP queries, and the SearchProvider interface for search (NoOp in S03). Includes typed event emitter, AbortController lifecycle, and per-step model resolution. Also creates the barrel export and comprehensive test suite using AI SDK's MockLanguageModelV1.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| AI model (streamWithAbort) | Emit step-error event, transition to 'failed' state | Same as error (streamText handles internally) | Emit step-error with AI_INVALID_RESPONSE |
| AI model (generateStructured) | Wrap as AppError('AI_INVALID_RESPONSE'), emit step-error, transition to 'failed' | Same as error | generateObject handles via Zod validation error |
| SearchProvider | Propagate error from search call as step-error | N/A (search provider manages its own timeouts) | N/A (returns typed arrays) |
| AbortController | Transition to 'aborted', stop pipeline cleanly | N/A | N/A |

## Load Profile

- **Shared resources**: None — each orchestrator instance owns its own AbortController and state
- **Per-operation cost**: 1 registry creation + 4-6 AI calls per research session (clarify, plan, SERP queries, analyze per query, review loops, report)
- **10x breakpoint**: N/A — single-user research tool, not concurrent server

## Negative Tests

- **Malformed inputs**: ResearchConfig with empty topic, missing providerConfigs, invalid stepModelMap
- **Error paths**: AI model throws, generateStructured fails Zod validation, search provider throws
- **Boundary conditions**: autoReviewRounds=0 (no review loop), maxSearchQueries=1 (single query), abort during each of the 6 steps, consecutive abort calls

## Steps

1. Create `src/engine/research/orchestrator.ts` with the `ResearchOrchestrator` class:

   **Constructor:** `constructor(config: ResearchConfig, searchProvider?: SearchProvider)`
   - Store config, default searchProvider to `new NoOpSearchProvider()`
   - Initialize state: `idle`
   - Create event handler Sets for each event type
   - Build provider registry from `config.providerConfigs` using `createRegistry()`

   **Public API:**
   - `start(): Promise<ResearchResult | null>` — Runs full pipeline. Creates AbortController. Returns null if aborted/failed.
   - `abort(): void` — Calls AbortController.abort(). Transitions to 'aborted'.
   - `getState(): ResearchState` — Returns current state.
   - `getResult(): ResearchResult | null` — Returns final result (null until completed).
   - `on<T extends ResearchEventType>(event: T, handler: (payload: ResearchEventMap[T]) => void): () => void` — Subscribe. Returns unsubscribe function.
   - `destroy(): void` — Aborts if running, clears all handlers.

   **Private step methods (each follows the same pattern):**
   - Transition state, emit step-start
   - Resolve model for step via `resolveModelForStep(step)` (uses stepModelMap with fallback to thinking model for clarify/plan/review/report, networking model for search/analyze)
   - Build messages using prompt functions
   - Call `streamWithAbort()` (for streaming steps) or `generateStructured()` (for SERP queries)
   - Consume fullStream: emit step-delta for text, step-reasoning for reasoning
   - Emit step-complete with duration
   - On error: emit step-error, transition to failed, throw

   **Pipeline (in start()):**
   1. `runClarify()` — streamText with clarify prompt, emit text deltas
   2. `runPlan()` — streamText with plan prompt, emit text deltas, accumulate plan text
   3. `runSearchPhase()`:
      a. Call `generateStructured()` with SERP query schema → get `SearchTask[]`
      b. For each task: call `searchProvider.search(task.query)` → get sources/images
      c. Call `runAnalyze(task, sources)` — streamText with analyze prompt
      d. Accumulate SearchResults
   4. `runReviewLoop()` — Up to autoReviewRounds iterations:
      a. Call `generateStructured()` with review prompt → get follow-up queries or empty
      b. If empty queries: break
      c. If queries: run search+analyze for each, accumulate results
   5. `runReport()` — streamText with report prompt using all accumulated learnings/sources/images, emit text deltas
   6. Assemble ResearchResult (extract title from first line of report)
   7. Transition to `completed`, return result

   **Model resolution helper:**
   `resolveModelForStep(step: ResearchStep): LanguageModel`
   - Check stepModelMap for this step → if present, resolve via registry
   - Fallback: 'clarify'|'plan'|'review'|'report' → first thinking model from first provider
   - Fallback: 'search'|'analyze' → first networking model from first provider
   - Use `resolveModel()` and `getDefaultModel()` from S02 registry

   **Event emitter:**
   - Private `handlers: Map<ResearchEventType, Set<Function>>`
   - Private `emit(event, payload)` — iterate handlers, call each
   - `on()` adds to set, returns cleanup function

   **Abort handling:**
   - Private `abortController: AbortController | null`
   - In `start()`: create new AbortController, store it
   - Pass `abortController.signal` to all `streamWithAbort()` and `generateStructured()` calls
   - In `abort()`: call `abortController.abort()`, set state to 'aborted'
   - After each step, check if aborted — if so, skip remaining steps

2. Create `src/engine/research/index.ts` barrel export:
   - Re-export all types from `./types`
   - Re-export `SearchProvider`, `NoOpSearchProvider` from `./search-provider`
   - Re-export prompt functions and `resolvePrompt` from `./prompts`
   - Re-export `ResearchOrchestrator` from `./orchestrator`

3. Create `src/engine/research/__tests__/orchestrator.test.ts` using `MockLanguageModelV1` from `ai/test`:

   **Helper: `createMockOrchestrator()`** — Creates an orchestrator with mock provider configs, a mock model, and NoOpSearchProvider. Use `MockLanguageModelV1` with custom `doStream` that yields text-delta events.

   **Test cases:**

   a. **State transitions** — Start orchestrator, verify state goes idle → clarifying → planning → searching → analyzing → reporting → completed

   b. **Event emission** — Subscribe to all events, verify correct sequence: step-start(step), step-delta(step, text), step-complete(step, duration) for each step

   c. **Abort during step** — Start orchestrator, abort after short delay, verify state = 'aborted', no step-complete for interrupted step

   d. **Error handling** — Make mock model throw, verify step-error emitted, state = 'failed'

   e. **SERP query generation** — Verify generateStructured called with correct Zod schema for search tasks

   f. **Review loop** — With autoReviewRounds=2, verify review step called, follow-up queries generated, loop runs

   g. **Review loop capped** — With autoReviewRounds=1, verify loop stops after 1 round even if queries returned

   h. **No review loop** — With autoReviewRounds=0 (default), verify review step is skipped entirely

   i. **Model resolution** — Verify thinking model used for clarify/plan/report, networking model for search/analyze (with stepModelMap configured)

   j. **Unsubscribe** — Subscribe to event, call cleanup function, verify no more events received

   k. **Destroy** — Call destroy on running orchestrator, verify abort + handlers cleared

   **Mock setup for streaming:** Use `MockLanguageModelV1` with `doStream` that returns a readable stream of AI SDK v4 events. For generateStructured calls, mock `doGenerate` to return valid JSON matching the Zod schema.

   **Important AI SDK v4 stream event types (verified in installed package):**
   - `{ type: 'text-delta', textDelta: string }` for text content
   - `{ type: 'reasoning', textDelta: string }` for reasoning content
   - `{ type: 'source', source: { sourceType: 'url', url, title } }` for source citations
   - `{ type: 'finish', usage, providerMetadata }` for completion

4. Run all research tests: `pnpm vitest run src/engine/research/__tests__/`

5. Verify barrel export works: no circular imports, all public API accessible from `@/engine/research`

6. Run full test suite to ensure no regressions: `pnpm vitest run`

7. Verify build: `pnpm build`

## Must-Haves

- [ ] ResearchOrchestrator runs full pipeline with all 6 step types
- [ ] State machine transitions through all 10 states correctly
- [ ] Events emitted in correct order with correct payloads
- [ ] AbortController cancellation works at any step
- [ ] Step failures emit step-error and transition to 'failed'
- [ ] SERP queries via generateStructured with Zod validation
- [ ] Review loop capped by autoReviewRounds
- [ ] Model resolution per step with fallbacks
- [ ] Barrel export with all public types, functions, and class
- [ ] No React/Zustand/Next.js imports
- [ ] 11+ test cases covering state, events, abort, errors, review loop, model resolution

## Verification

- `pnpm vitest run src/engine/research/__tests__/` — all tests pass (types + prompts + orchestrator)
- `pnpm vitest run` — full suite passes (including S02's 63 tests)
- `pnpm build` — production build succeeds

## Observability Impact

- Signals added: structured logger calls at each state transition (logger.info with step, state, duration)
- How a future agent inspects: orchestrator.getState() and getResult() for runtime inspection; event subscriptions for real-time monitoring
- Failure state exposed: step-error events include AppError with code, category, context, and step name

## Inputs

- `src/engine/research/types.ts` — All research types, ResearchConfig, ResearchState, ResearchEventMap
- `src/engine/research/search-provider.ts` — SearchProvider interface and NoOpSearchProvider
- `src/engine/research/prompts.ts` — All prompt functions
- `src/engine/provider/registry.ts` — createRegistry, resolveModel, getDefaultModel
- `src/engine/provider/streaming.ts` — streamWithAbort, generateStructured
- `src/engine/provider/types.ts` — ResearchStep, StepModelMap, ProviderConfig
- `src/lib/errors.ts` — AppError, toAppError
- `src/lib/logger.ts` — structured logger

## Expected Output

- `src/engine/research/orchestrator.ts` — ResearchOrchestrator class with full pipeline
- `src/engine/research/index.ts` — Barrel export for the research module
- `src/engine/research/__tests__/orchestrator.test.ts` — Comprehensive test suite
