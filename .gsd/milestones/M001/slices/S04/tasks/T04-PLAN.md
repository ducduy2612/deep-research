---
estimated_steps: 30
estimated_files: 6
skills_used: []
---

# T04: Search factory, barrel export, and orchestrator wiring

Wire all search providers together with a factory function, create barrel exports, and integrate into the ResearchOrchestrator.

1. Create `src/engine/search/factory.ts`:
   - `createSearchProvider(config: SearchProviderConfig, providerConfig?: ProviderConfig, registry?: ProviderRegistry)` — returns the correct SearchProvider implementation
   - For external providers (tavily, firecrawl, exa, brave, searxng): create the adapter with apiKey/baseURL from config
   - For model-native: requires providerConfig and registry to create the model-native adapter
   - Validates that model-native has required providerConfig + registry
   - Logs which provider was created

2. Create `src/engine/search/index.ts`:
   - Re-export all types from types.ts
   - Re-export all provider classes from providers/
   - Re-export factory, domain-filter, citation-images functions
   - Re-export SearchProvider interface and NoOpSearchProvider from research/search-provider (for convenience)

3. Update `src/engine/research/orchestrator.ts`:
   - In both `runInitialSearch` (line ~373) and `runReviewSearch` (line ~530): pass `SearchProviderCallOptions` to `this.searchProvider.search(task.query, options)`
   - Create options object: `{ abortSignal: this.abortController.signal }`
   - The orchestrator doesn't need to know about domain filtering or citation images — those are applied by the caller (UI layer in S05) or inside the search provider wrapper
   - Actually, add a `searchOptions` field to ResearchConfig or pass through constructor so domain filters and citation images can be applied at the orchestrator level
   - Minimal approach: just pass abortSignal for now. Domain filtering and citation images are post-processing that S05 will handle when wiring up the UI.

4. Update `src/engine/research/index.ts`:
   - Add re-exports from `src/engine/search/` for convenience (SearchProviderId, createSearchProvider, domain filter functions)

5. Create `src/engine/search/__tests__/factory.test.ts`:
   - Test factory returns correct provider class for each SearchProviderId
   - Test model-native without providerConfig/registry throws error
   - Test unknown provider ID throws error

6. Create `src/engine/search/__tests__/integration.test.ts`:
   - Test orchestrator with a mock search provider that returns real-looking data
   - Verify abort signal is passed through
   - Verify sources and images flow through the pipeline

7. Run full test suite to ensure nothing is broken.

**Constraint:** The orchestrator update must be backward-compatible — existing tests use NoOpSearchProvider with the old single-arg `search(query)` signature. Since options is optional, this should be fine. Verify existing orchestrator tests still pass.

## Inputs

- `src/engine/search/types.ts`
- `src/engine/search/providers/tavily.ts`
- `src/engine/search/providers/firecrawl.ts`
- `src/engine/search/providers/exa.ts`
- `src/engine/search/providers/brave.ts`
- `src/engine/search/providers/searxng.ts`
- `src/engine/search/providers/model-native.ts`
- `src/engine/search/domain-filter.ts`
- `src/engine/search/citation-images.ts`
- `src/engine/research/orchestrator.ts`
- `src/engine/research/index.ts`
- `src/engine/research/search-provider.ts`

## Expected Output

- `src/engine/search/factory.ts`
- `src/engine/search/index.ts`
- `src/engine/research/orchestrator.ts`
- `src/engine/research/index.ts`
- `src/engine/search/__tests__/factory.test.ts`
- `src/engine/search/__tests__/integration.test.ts`

## Verification

pnpm vitest run src/engine/search/ && pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts && pnpm build
