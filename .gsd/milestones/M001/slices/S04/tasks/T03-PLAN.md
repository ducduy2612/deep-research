---
estimated_steps: 46
estimated_files: 3
skills_used: []
---

# T03: Model-native search adapter (Gemini, OpenAI, OpenRouter, xAI)

Implement the model-native search provider that uses AI SDK's built-in search capabilities instead of external REST APIs. This is architecturally different — it calls `generateText` with provider-specific tools/options.

1. Add `generateTextWithAbort` utility to `src/engine/provider/streaming.ts`:
   - Wraps AI SDK `generateText` with abort signal and error handling
   - Same pattern as existing `streamWithAbort` and `generateStructured`
   - Returns the full `GenerateTextResult` (caller needs `sources`, `providerMetadata`, etc.)
   - Abort → throws AppError('AI_STREAM_ABORTED')
   - Other errors → throws AppError('AI_INVALID_RESPONSE')

2. Create `src/engine/search/providers/model-native.ts`:
   - `ModelNativeSearchProvider` class implementing `SearchProvider`
   - Constructor takes `{ providerConfig: ProviderConfig; registry: ProviderRegistry; scope?: string; searchContextSize?: string }`
   - `search(query, options?)` method:
     a. Resolve the networking model from provider config (first networking-role model)
     b. Detect provider type from `providerConfig.id`
     c. Call `generateText` with the appropriate configuration:

   **For Google ("google"):**
   - Create model via `createGoogleGenerativeAI({apiKey}).chat(modelId)` — but with `useSearchGrounding: true` as model option
   - Actually: use `createGoogleGenerativeAI({apiKey})('modelId', { useSearchGrounding: true })` to get a model with grounding enabled
   - Call `generateText({ model, prompt: query, abortSignal })`
   - Extract sources from `result.sources` (AI SDK provides these automatically for grounded models)
   - No separate image extraction from grounding

   **For OpenAI ("openai"):**
   - Create model via registry
   - Use `openaiTools` from `@ai-sdk/openai` — specifically check if it has `webSearchPreview`
   - Call `generateText({ model, prompt: query, tools: { web_search_preview: openaiTools.webSearchPreview({searchContextSize}) }, abortSignal })`
   - Extract sources from `result.sources`

   **For OpenRouter ("openrouter"):**
   - Create model via registry
   - Call `generateText({ model, prompt: query, providerOptions: { openrouter: { plugins: [{id: 'web', max_results: maxResults}] } }, abortSignal })`
   - Extract sources from `result.sources`

   **For xAI ("xai"):**
   - Create model via registry (grok-3 models only)
   - Call `generateText({ model, prompt: query, providerOptions: { xai: { search_parameters: { mode: 'auto', max_search_results: maxResults } } }, abortSignal })`
   - Extract sources from `result.sources`

   **Fallback for unsupported providers (deepseek, groq):**
   - Throw AppError('AI_REQUEST_FAILED') with message explaining model-native search is not available
   - This should only happen if user misconfigures (e.g., sets search to model-native with a provider that doesn't support it)

3. The provider always returns `{ sources, images: [] }` — model-native search doesn't return standalone images like external providers. The sources come from the AI SDK's automatic source extraction.

4. Create `src/engine/search/__tests__/model-native.test.ts`:
   - Mock `generateText` from 'ai' module
   - Mock provider factory functions
   - Test each provider type: correct model creation, correct tools/options passed
   - Test abort signal propagation
   - Test unsupported provider throws error
   - Test source extraction from result

**Important constraint:** AI SDK v4, NOT v6. The `google.tools.googleSearch()` tool API is NOT available. Gemini grounding uses the `useSearchGrounding: true` model setting passed when creating the model instance. Check the actual @ai-sdk/google@1.2.x API for the exact syntax — it may be `google('model-id', { useSearchGrounding: true })` or similar.

**Another constraint:** Do NOT import from `@ai-sdk/openai` directly in this file — use dynamic import or conditional import since not all builds will have it. Actually, since it's already a project dependency, a direct import is fine. But check whether `openaiTools` or `openai.tools` is the right API for the installed version.

## Inputs

- `src/engine/search/types.ts`
- `src/engine/research/search-provider.ts`
- `src/engine/provider/streaming.ts`
- `src/engine/provider/factory.ts`
- `src/engine/provider/registry.ts`
- `src/engine/provider/types.ts`

## Expected Output

- `src/engine/search/providers/model-native.ts`
- `src/engine/provider/streaming.ts`
- `src/engine/search/__tests__/model-native.test.ts`

## Verification

pnpm vitest run src/engine/search/__tests__/model-native.test.ts && pnpm build
