# S03: Research Engine Core

**Goal:** Build a framework-agnostic ResearchOrchestrator state machine that drives the multi-step research workflow (clarify → plan → search → analyze → [review loop] → report). The orchestrator uses the S02 provider registry for model resolution, streamWithAbort for streaming steps, and generateStructured for SERP query generation. Search execution is deferred to S04 via a SearchProvider interface — S03 uses NoOpSearchProvider. The orchestrator emits typed lifecycle events (step-start, step-delta, step-reasoning, step-complete, step-error, progress) and supports AbortController-based cancellation at any step.
**Demo:** After this: ResearchOrchestrator state machine running multi-step workflow with structured output and cancellation support.

## Tasks
- [x] **T01: Created research engine type foundation with 10-state lifecycle, Zod schemas, event map, and NoOpSearchProvider** — Create the type foundation for the research engine: ResearchState enum, ResearchConfig, ResearchEvent discriminated union, SearchTask, SearchResult, Source, ImageSource, and their Zod schemas. Also define the SearchProvider interface and NoOpSearchProvider. These are pure types and interfaces with no runtime dependencies beyond Zod and existing S02 types.
  - Estimate: 45m
  - Files: src/engine/research/types.ts, src/engine/research/search-provider.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/types.test.ts
- [x] **T02: Created 9 pure prompt template functions with typed parameters, DEFAULT_PROMPTS map, and resolvePrompt override resolver** — Port prompt templates from the old codebase into pure functions that return prompt strings. Each function takes explicit inputs (no global state). Include PromptOverrides type and resolvePrompts() that merges overrides onto defaults. Prompts needed: system, clarify, plan, serpQueries, analyze, review, report, outputGuidelines. No external dependencies — just string templates.
  - Estimate: 30m
  - Files: src/engine/research/prompts.ts, src/engine/research/__tests__/prompts.test.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/prompts.test.ts
- [x] **T03: Built ResearchOrchestrator state machine driving full research pipeline with typed events, abort support, and 19-test suite** — Implement the ResearchOrchestrator class — a framework-agnostic state machine that drives the full research pipeline (clarify → plan → search → analyze → [review loop] → report). Uses S02's registry for model resolution, streamWithAbort for streaming steps, generateStructured for SERP queries, and the SearchProvider interface for search (NoOp in S03). Includes typed event emitter, AbortController lifecycle, and per-step model resolution. Also creates the barrel export and comprehensive test suite using AI SDK's MockLanguageModelV1.
  - Estimate: 2h
  - Files: src/engine/research/orchestrator.ts, src/engine/research/index.ts, src/engine/research/__tests__/orchestrator.test.ts
  - Verify: pnpm vitest run src/engine/research/__tests__/
