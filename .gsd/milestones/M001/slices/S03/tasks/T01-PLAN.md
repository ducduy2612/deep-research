---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Create research types, Zod schemas, and SearchProvider interface

Create the type foundation for the research engine: ResearchState enum, ResearchConfig, ResearchEvent discriminated union, SearchTask, SearchResult, Source, ImageSource, and their Zod schemas. Also define the SearchProvider interface and NoOpSearchProvider. These are pure types and interfaces with no runtime dependencies beyond Zod and existing S02 types.

## Steps

1. Create `src/engine/research/types.ts` with:
   - `ResearchState` union type: `'idle' | 'clarifying' | 'planning' | 'searching' | 'analyzing' | 'reviewing' | 'reporting' | 'completed' | 'failed' | 'aborted'`
   - `Source` interface: `{ url: string; title?: string }`
   - `ImageSource` interface: `{ url: string; description?: string }`
   - `SearchTask` interface: `{ query: string; researchGoal: string }`
   - `SearchResult` interface: `{ query: string; researchGoal: string; learning: string; sources: Source[]; images: ImageSource[] }`
   - `ReportStyle` type: `'balanced' | 'executive' | 'technical' | 'concise'`
   - `ReportLength` type: `'brief' | 'standard' | 'comprehensive'`
   - `PromptOverrideKey` union of all prompt template names (system, clarify, plan, serpQueries, analyze, review, report, outputGuidelines)
   - `PromptOverrides` = `Partial<Record<PromptOverrideKey, string>>`
   - `ResearchConfig` interface with fields: `topic: string`, `providerConfigs: ProviderConfig[]`, `stepModelMap: StepModelMap`, `language?: string`, `reportStyle?: ReportStyle`, `reportLength?: ReportLength`, `autoReviewRounds?: number` (default 0), `maxSearchQueries?: number` (default 5), `promptOverrides?: PromptOverrides`
   - `ResearchEventMap` — an interface mapping each event type to its payload:
     - `step-start: { step: ResearchStep; state: ResearchState }`
     - `step-delta: { step: ResearchStep; text: string }`
     - `step-reasoning: { step: ResearchStep; text: string }`
     - `step-complete: { step: ResearchStep; duration: number }`
     - `step-error: { step: ResearchStep; error: AppError }`
     - `progress: { step: ResearchStep; progress: number }`
   - `ResearchEventType` = keyof ResearchEventMap
   - `ResearchResult` interface: `{ title: string; report: string; learnings: string[]; sources: Source[]; images: ImageSource[] }`
   - Zod schemas: `sourceSchema`, `imageSourceSchema`, `searchTaskSchema`, `researchConfigSchema` (validates full config including nested providerConfigs and stepModelMap)
   - Import `ResearchStep`, `StepModelMap`, `ProviderConfig`, `stepModelMapSchema`, `providerConfigSchema` from `@/engine/provider/types`

2. Create `src/engine/research/search-provider.ts` with:
   - `SearchProvider` interface: `{ search(query: string): Promise<{ sources: Source[]; images: ImageSource[] }> }`
   - Import `Source`, `ImageSource` from `./types`
   - `NoOpSearchProvider` class implementing `SearchProvider` — returns `{ sources: [], images: [] }`

3. Create `src/engine/research/__tests__/types.test.ts` with tests for:
   - `sourceSchema` validates valid source objects and rejects invalid ones
   - `imageSourceSchema` validates valid image sources
   - `searchTaskSchema` validates query + researchGoal
   - `researchConfigSchema` validates a full config with providerConfigs and stepModelMap
   - `researchConfigSchema` rejects config missing required `topic` field
   - Verify ResearchState values are the expected 10 states
   - Verify NoOpSearchProvider returns empty arrays

4. Run tests: `pnpm vitest run src/engine/research/__tests__/types.test.ts`

5. Verify no import errors and types are consistent

## Must-Haves

- [ ] `ResearchState` covers all 10 states
- [ ] `ResearchConfig` has topic, providerConfigs, stepModelMap, and all optional config fields
- [ ] `ResearchEventMap` defines payloads for all 6 event types
- [ ] `SearchProvider` interface with `search()` method
- [ ] `NoOpSearchProvider` returns empty sources and images
- [ ] Zod schemas validate ResearchConfig including nested provider configs
- [ ] All tests pass

## Verification

- `pnpm vitest run src/engine/research/__tests__/types.test.ts` — all tests pass
- `grep -c 'export' src/engine/research/types.ts` returns >= 15 (enough exports)

## Observability Impact

None — pure type definitions and a no-op implementation.

## Inputs

- `src/engine/provider/types.ts` — ResearchStep, StepModelMap, ProviderConfig types and Zod schemas to reuse
- `src/lib/errors.ts` — AppError type used in ResearchEventMap

## Expected Output

- `src/engine/research/types.ts` — All research engine types, interfaces, and Zod schemas
- `src/engine/research/search-provider.ts` — SearchProvider interface and NoOpSearchProvider
- `src/engine/research/__tests__/types.test.ts` — Schema and type validation tests
