---
id: T03
parent: S04
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/search/providers/model-native.ts", "src/engine/provider/streaming.ts", "src/engine/search/__tests__/model-native.test.ts"]
key_decisions: ["Google grounding uses createGoogleGenerativeAI directly (not registry) because useSearchGrounding must be set at model creation time", "OpenAI webSearchPreview accessed via createOpenAI().tools.webSearchPreview() since openaiTools is not exported from @ai-sdk/openai", "Model-native provider always returns empty images array since AI SDK sources don't include standalone images"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 18 new tests pass. All 99 search tests pass (43 domain-filter + 38 providers + 18 model-native). Production build succeeds with no type errors."
completed_at: 2026-03-31T19:10:15.502Z
blocker_discovered: false
---

# T03: Implement ModelNativeSearchProvider with Google grounding, OpenAI web_search_preview, OpenRouter web plugin, and xAI live search, plus generateTextWithAbort utility

> Implement ModelNativeSearchProvider with Google grounding, OpenAI web_search_preview, OpenRouter web plugin, and xAI live search, plus generateTextWithAbort utility

## What Happened
---
id: T03
parent: S04
milestone: M001
key_files:
  - src/engine/search/providers/model-native.ts
  - src/engine/provider/streaming.ts
  - src/engine/search/__tests__/model-native.test.ts
key_decisions:
  - Google grounding uses createGoogleGenerativeAI directly (not registry) because useSearchGrounding must be set at model creation time
  - OpenAI webSearchPreview accessed via createOpenAI().tools.webSearchPreview() since openaiTools is not exported from @ai-sdk/openai
  - Model-native provider always returns empty images array since AI SDK sources don't include standalone images
duration: ""
verification_result: passed
completed_at: 2026-03-31T19:10:15.503Z
blocker_discovered: false
---

# T03: Implement ModelNativeSearchProvider with Google grounding, OpenAI web_search_preview, OpenRouter web plugin, and xAI live search, plus generateTextWithAbort utility

**Implement ModelNativeSearchProvider with Google grounding, OpenAI web_search_preview, OpenRouter web plugin, and xAI live search, plus generateTextWithAbort utility**

## What Happened

Implemented the model-native search provider that uses AI SDK's built-in search capabilities instead of external REST APIs. Three files created/modified:

1. **streaming.ts** — Added `generateTextWithAbort` utility following existing error handling patterns (abort → AI_STREAM_ABORTED, other errors → AI_INVALID_RESPONSE).

2. **model-native.ts** — `ModelNativeSearchProvider` class supporting four providers:
   - Google: Fresh `createGoogleGenerativeAI` with `useSearchGrounding: true` (registry can't be used since grounding must be set at model creation)
   - OpenAI: `createOpenAI().tools.webSearchPreview()` for web search tool, registry-resolved model
   - OpenRouter: Web plugin via `providerOptions.openrouter.plugins`
   - xAI: Search parameters via `providerOptions.xai.search_parameters`
   - Unsupported providers (deepseek, groq) throw AppError

3. **model-native.test.ts** — 18 tests covering all providers, unsupported providers, missing model, abort signals, and source extraction.

Key discovery: `openaiTools` and `ProviderOptions` are declared but not exported from their respective packages. Used `createOpenAI().tools.webSearchPreview()` and `Record<string, unknown>` with casts instead.

## Verification

All 18 new tests pass. All 99 search tests pass (43 domain-filter + 38 providers + 18 model-native). Production build succeeds with no type errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/search/__tests__/model-native.test.ts` | 0 | ✅ pass | 245ms |
| 2 | `pnpm vitest run src/engine/search/__tests__/` | 0 | ✅ pass | 158ms |
| 3 | `pnpm build` | 0 | ✅ pass | 8000ms |


## Deviations

Plan suggested importing openaiTools from @ai-sdk/openai — not exported. Used createOpenAI().tools.webSearchPreview() instead. ProviderOptions type not exported from ai — used Record<string, unknown> with cast.

## Known Issues

None.

## Files Created/Modified

- `src/engine/search/providers/model-native.ts`
- `src/engine/provider/streaming.ts`
- `src/engine/search/__tests__/model-native.test.ts`


## Deviations
Plan suggested importing openaiTools from @ai-sdk/openai — not exported. Used createOpenAI().tools.webSearchPreview() instead. ProviderOptions type not exported from ai — used Record<string, unknown> with cast.

## Known Issues
None.
