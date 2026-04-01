# S02: Provider Factory and AI Integration

**Goal:** Build the AI provider factory and integration layer with streaming support, AbortController cleanup, and a model registry for Gemini native and OpenAI-compatible providers. This slice creates the `src/engine/provider/` module with types, factory functions, an AI SDK provider registry, streaming utilities with abort lifecycle, and a server-side API route — proving the full stack works end-to-end.
**Demo:** After this: Gemini native + OpenAI-compatible provider factory with streaming, AbortController cleanup, and model registry.

## Tasks
- [x] **T01: Install vitest and create provider types with Zod v4 schemas, helpers, and 21 passing tests** — ## Description

Install vitest and create the type foundation for the provider layer. This task produces the TypeScript types and Zod schemas that all subsequent tasks depend on, plus the test framework they'll use.

## Steps

1. **Install vitest**: `pnpm add -D vitest` — vitest is the test runner for all engine code. No jsdom needed (pure TypeScript tests, no React).

2. **Configure vitest**: Create `vitest.config.ts` at project root with path alias `@/` → `src/` (matching `tsconfig.json`). Set `test.include` to `['src/**/*.test.ts']`.

3. **Add test scripts**: In `package.json`, add `"test": "vitest run"` and `"test:watch": "vitest"`.

4. **Create `src/engine/provider/types.ts`**: Define all provider layer types and Zod schemas:
   - `ProviderId` — union type: `'google' | 'openai' | 'deepseek' | 'openrouter' | 'groq' | 'xai'`
   - `OPENAI_COMPATIBLE_IDS` — const array: `['openai', 'deepseek', 'openrouter', 'groq', 'xai']`
   - `ModelRole` — type: `'thinking' | 'networking'`
   - `ResearchStep` — type: `'clarify' | 'plan' | 'search' | 'analyze' | 'review' | 'report'`
   - `ModelCapabilities` — interface: `{ reasoning: boolean; searchGrounding: boolean; structuredOutput: boolean; maxTokens: number }`
   - `ProviderModelConfig` — interface: `{ id: string; name: string; role: ModelRole; capabilities: ModelCapabilities }`
   - `ProviderConfig` — interface: `{ id: ProviderId; apiKey: string; baseURL?: string; models: ProviderModelConfig[] }`
   - `StepModelMap` — type: `Partial<Record<ResearchStep, { providerId: ProviderId; modelId: string }>>`
   - Zod schemas: `modelCapabilitiesSchema`, `providerModelConfigSchema`, `providerConfigSchema`, `stepModelMapSchema` — all matching their TypeScript counterparts
   - Helper: `isOpenAICompatible(id: ProviderId): boolean` — returns true if id is in `OPENAI_COMPATIBLE_IDS`
   - Helper: `getModelsByRole(config: ProviderConfig, role: ModelRole): ProviderModelConfig[]` — filters models by role

5. **Create `src/engine/provider/__tests__/types.test.ts`**: Test the Zod schemas and helpers:
   - Valid `ProviderConfig` with Google provider passes validation
   - Valid `ProviderConfig` with OpenAI-compatible provider passes validation
   - Missing required fields (id, apiKey) fail validation
   - Invalid `ProviderId` fails validation
   - `isOpenAICompatible` returns true for all 5 OpenAI-compatible IDs, false for 'google'
   - `getModelsByRole` filters correctly for thinking and networking roles
   - `StepModelMap` validates partial records correctly

## Must-Haves

- [ ] vitest installed and configured with path alias
- [ ] `ProviderId` union type with all 6 providers
- [ ] `ProviderConfig` with Zod schema for validation
- [ ] `ModelCapabilities` with reasoning and searchGrounding flags
- [ ] `ModelRole` ('thinking' | 'networking') and `ResearchStep` types
- [ ] `isOpenAICompatible()` helper
- [ ] `getModelsByRole()` helper
- [ ] All schema tests passing
  - Estimate: 1h
  - Files: vitest.config.ts, src/engine/provider/types.ts, src/engine/provider/__tests__/types.test.ts, package.json
  - Verify: pnpm vitest run src/engine/provider/__tests__/types.test.ts
- [x] **T02: Create provider factory functions for Google Gemini and OpenAI-compatible providers with unified dispatch, AppError wrapping, and 17 passing tests** — ## Description

Create the factory functions that produce configured AI SDK provider instances. Two factories: one for Google Gemini (via `@ai-sdk/google`), one for all OpenAI-compatible providers (via `@ai-sdk/openai` with custom `baseURL`). A unified `createProvider()` dispatches based on `ProviderId`.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `@ai-sdk/google` | `AppError(AI_REQUEST_FAILED)` with cause | N/A (factory creates instance, no network) | N/A |
| `@ai-sdk/openai` | `AppError(AI_REQUEST_FAILED)` with cause | N/A | N/A |

## Steps

1. **Create `src/engine/provider/factory.ts`** with imports from `@ai-sdk/google`, `@ai-sdk/openai`, `types.ts`, `errors.ts`, `logger.ts`.

2. **Implement `createGoogleProvider(config: ProviderConfig)`**:
   - Call `createGoogleGenerativeAI({ apiKey: config.apiKey, ...(config.baseURL && { baseURL: config.baseURL }) })`
   - Log creation: `logger.info('Provider created', { providerId: config.id, modelCount: config.models.length })` — NEVER log the API key
   - Return the provider instance
   - Wrap in try/catch: throw `AppError('AI_REQUEST_FAILED', ...)` on failure

3. **Implement `createOpenAICompatibleProvider(config: ProviderConfig)`**:
   - Call `createOpenAI({ apiKey: config.apiKey, ...(config.baseURL && { baseURL: config.baseURL }), name: config.id })`
   - Use `.chat()` method to force chat completions API (needed for DeepSeek reasoning models and other non-standard providers)
   - Log creation: same pattern as Google
   - Return the provider instance
   - Wrap in try/catch: throw `AppError('AI_REQUEST_FAILED', ...)` on failure

4. **Implement `createProvider(config: ProviderConfig)`**:
   - Dispatch: if `config.id === 'google'` → `createGoogleProvider(config)`, else → `createOpenAICompatibleProvider(config)`
   - Use `isOpenAICompatible()` from types.ts for the check
   - Validate: throw `AppError('AI_REQUEST_FAILED')` if neither Google nor OpenAI-compatible (defensive)

5. **Create `src/engine/provider/__tests__/factory.test.ts`**:
   - Mock `@ai-sdk/google` and `@ai-sdk/openai` with `vi.mock`
   - Test `createGoogleProvider`: verifies `createGoogleGenerativeAI` called with correct `apiKey` and optional `baseURL`
   - Test `createOpenAICompatibleProvider`: verifies `createOpenAI` called with correct `apiKey`, `baseURL`, and `name`
   - Test `createProvider` dispatches to Google factory for `'google'` id
   - Test `createProvider` dispatches to OpenAI factory for `'openai'`, `'deepseek'`, `'openrouter'` ids
   - Test error handling: factory throws `AppError` with `AI_REQUEST_FAILED` when AI SDK throws
   - Test logging: verifies `logger.info` called with `providerId` (never apiKey)

## Must-Haves

- [ ] `createGoogleProvider` creates Google Generative AI provider instance with apiKey/baseURL
- [ ] `createOpenAICompatibleProvider` creates OpenAI provider with custom baseURL for 5+ providers
- [ ] `createProvider` dispatches correctly based on `ProviderId`
- [ ] All errors wrapped as `AppError('AI_REQUEST_FAILED')`
- [ ] Logging on provider creation without API keys
- [ ] All factory tests passing
  - Estimate: 1h
  - Files: src/engine/provider/factory.ts, src/engine/provider/__tests__/factory.test.ts
  - Verify: pnpm vitest run src/engine/provider/__tests__/factory.test.ts
- [x] **T03: Created provider registry with createRegistry/resolveModel/getDefaultModel and barrel export for engine/provider module** — ## Description

Create the provider registry that composes multiple provider instances and resolves models by `"provider:model"` strings. Also create the barrel export `index.ts` that defines the module's public API.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Factory | `AppError('AI_REQUEST_FAILED')` propagated | N/A | N/A |
| AI SDK registry | `AppError('AI_REQUEST_FAILED')` with model string context | N/A | N/A |

## Steps

1. **Create `src/engine/provider/registry.ts`** with imports from `ai` (for `createProviderRegistry`), `factory.ts`, `types.ts`, `errors.ts`, `logger.ts`.

2. **Implement `createRegistry(configs: ProviderConfig[])`**:
   - For each `ProviderConfig`, call `createProvider(config)` to get the AI SDK provider instance
   - Collect into a record: `{ google: googleProvider, openai: openaiProvider, deepseek: deepseekProvider, ... }`
   - Key by `config.id` (which matches `ProviderId`)
   - Wrap in `createProviderRegistry(providerRecord)` from AI SDK
   - Log: `logger.info('Registry created', { providerCount: configs.length, providers: configs.map(c => c.id) })`
   - Return the registry instance
   - Error handling: if any factory fails, throw `AppError('AI_REQUEST_FAILED')` with context

3. **Implement `resolveModel(registry, modelString: string)`**:
   - Parse the model string (format: `"providerId:modelName"` like `"google:gemini-2.5-pro"`)
   - Call `registry.languageModel(modelString)` to resolve
   - Log: `logger.debug('Model resolved', { modelString })`
   - Error handling: wrap in try/catch, throw `AppError('AI_REQUEST_FAILED')` with `{ modelString }` context if resolution fails
   - Return the `LanguageModel` instance

4. **Implement `getDefaultModel(registry: ProviderRegistry, configs: ProviderConfig[], providerId: ProviderId, role: ModelRole)`**:
   - Find the config for the given providerId
   - Use `getModelsByRole(config, role)` from types.ts to find the default model for the given role
   - Take the first model (index 0) as default
   - Resolve via `resolveModel(registry, `${providerId}:${model.id}`)`
   - Throw `AppError('AI_REQUEST_FAILED')` if no model found for the role
   - Return the resolved `LanguageModel`

5. **Create `src/engine/provider/index.ts`** barrel export:
   - Re-export all types from `types.ts`: `ProviderId`, `OPENAI_COMPATIBLE_IDS`, `ModelRole`, `ResearchStep`, `ModelCapabilities`, `ProviderModelConfig`, `ProviderConfig`, `StepModelMap`, `modelCapabilitiesSchema`, `providerModelConfigSchema`, `providerConfigSchema`, `stepModelMapSchema`, `isOpenAICompatible`, `getModelsByRole`
   - Re-export from `factory.ts`: `createGoogleProvider`, `createOpenAICompatibleProvider`, `createProvider`
   - Re-export from `registry.ts`: `createRegistry`, `resolveModel`, `getDefaultModel`
   - DO NOT re-export streaming (T04) — it will be added later

6. **Create `src/engine/provider/__tests__/registry.test.ts`**:
   - Mock `factory.ts` and `ai` module
   - Test `createRegistry` with 2 provider configs (Google + OpenAI): verifies factory called for each, registry created
   - Test `createRegistry` with empty array: creates empty registry
   - Test `createRegistry` error: factory throws → AppError propagated
   - Test `resolveModel` with valid `"google:gemini-2.5-pro"`: resolves correctly
   - Test `resolveModel` with unknown provider: throws AppError
   - Test `resolveModel` with malformed string (no colon): throws AppError
   - Test `getDefaultModel` for thinking role: returns correct model
   - Test `getDefaultModel` for networking role: returns correct model
   - Test `getDefaultModel` with missing provider: throws AppError
   - Test barrel export: import from `src/engine/provider` and verify all exports exist

## Must-Haves

- [ ] `createRegistry` creates AI SDK `createProviderRegistry` from array of `ProviderConfig`
- [ ] `resolveModel` resolves `"provider:model"` strings to `LanguageModel` instances
- [ ] `getDefaultModel` finds default model for a given provider and role
- [ ] `index.ts` barrel export re-exports all public types and functions
- [ ] All registry tests passing
- [ ] Barrel export importable as `import { ... } from '@/engine/provider'`
  - Estimate: 45m
  - Files: src/engine/provider/registry.ts, src/engine/provider/index.ts, src/engine/provider/__tests__/registry.test.ts
  - Verify: pnpm vitest run src/engine/provider/__tests__/registry.test.ts
- [x] **T04: Created streaming utilities (streamWithAbort, generateStructured) with AbortController lifecycle and POST /api/research route proving full provider stack end-to-end** — ## Description

Create streaming utilities that wrap AI SDK `streamText` and `generateObject` with AbortController lifecycle, error recovery, and structured logging. Then create the API route that proves the full provider stack works end-to-end by accepting a model ID + messages, resolving from registry, and streaming the response.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| AI SDK `streamText` | `AppError('AI_REQUEST_FAILED')` via `onError` callback | `AbortController` abort → `AppError('AI_STREAM_ABORTED')` via `onAbort` | N/A (stream is text) |
| AI SDK `generateObject` | `AppError('AI_REQUEST_FAILED')` on throw | `abortSignal` abort | `AppError('AI_INVALID_RESPONSE')` on Zod schema validation failure |
| HTTP request body | 400 response with validation errors | Client disconnect → `req.signal` fires abort | N/A |

## Load Profile

- **Shared resources**: None — each request creates its own registry instance from env vars
- **Per-operation cost**: 1 AI SDK stream call per request
- **10x breakpoint**: Provider API rate limits (external, not our concern) — abort cleanup prevents resource leaks under load

## Negative Tests

- **Malformed inputs**: Missing `modelId`, empty messages array, invalid message roles, non-string content
- **Error paths**: Unknown model ID (not in registry), provider not configured in env, stream abort via AbortController
- **Boundary conditions**: Empty messages array (should fail validation), very long single message

## Steps

1. **Create `src/engine/provider/streaming.ts`** with imports from `ai`, `types.ts`, `errors.ts`, `logger.ts`.

2. **Implement `streamWithAbort(options)`**:
   ```typescript
   interface StreamOptions {
     model: LanguageModel;
     messages: CoreMessage[];
     abortSignal?: AbortSignal;
     onAbort?: (steps: number) => void;
     onError?: (error: Error) => void;
     onFinish?: (usage: { promptTokens: number; completionTokens: number }) => void;
   }
   ```
   - Call `streamText({ model, messages, abortSignal, ...callbacks })`
   - Wire `onAbort`: log via `logger.info('Stream aborted')`, call user callback, NO error thrown (abort is expected)
   - Wire `onError`: log via `logger.error('Stream error')`, call user callback
   - Wire `onFinish`: log via `logger.info('Stream finished', { usage })`, call user callback
   - Return the stream result for caller to iterate (`result.fullStream` or `result.toTextStreamResponse()`)

3. **Implement `generateStructured<T>(options)`**:
   ```typescript
   interface GenerateStructuredOptions<T> {
     model: LanguageModel;
     schema: ZodSchema<T>;
     prompt: string;
     abortSignal?: AbortSignal;
   }
   ```
   - Call `generateObject({ model, schema, prompt, abortSignal })`
   - Return `result.object` (typed via Zod schema)
   - Error handling: wrap in try/catch — `AbortError` → `AppError('AI_STREAM_ABORTED')`, other errors → `AppError('AI_INVALID_RESPONSE')` with context
   - Log: `logger.info('Structured output generated', { schemaType: schema.description })`

4. **Create `src/app/api/research/route.ts`**:
   - Export `POST` handler for Next.js App Router
   - Parse request body with Zod: `{ modelId: z.string().min(1), messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() })) }`
   - Create provider configs from `env.ts`: if `GOOGLE_GENERATIVE_AI_API_KEY` is set, create Google config; if `OPENAI_API_KEY` is set, create OpenAI config. Use default model lists.
   - Create registry via `createRegistry(configs)`
   - Resolve model via `resolveModel(registry, modelId)`
   - Stream via `streamText({ model, messages, abortSignal: req.signal })` — directly use AI SDK since this is the simplest integration point
   - Return `result.toTextStreamResponse()` for AI SDK v4, OR if that method doesn't exist, create a `ReadableStream` from `result.textStream` and return `new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } })`
   - Error handling: catch all → return `Response.json({ isError: true, code: 'AI_REQUEST_FAILED', message: error.message }, { status: 500 })`
   - Do NOT add `export const runtime = 'edge'` — this is Node.js runtime

5. **Update `src/engine/provider/index.ts`** barrel export: add `streamWithAbort`, `generateStructured`, `StreamOptions`, `GenerateStructuredOptions`

6. **Create `src/engine/provider/__tests__/streaming.test.ts`**:
   - Mock `ai` module (`streamText`, `generateObject`)
   - **streamWithAbort tests**:
     - Verify `streamText` called with correct model, messages, and abortSignal
     - Simulate abort: trigger `onAbort` callback, verify logging and user callback
     - Simulate error: trigger `onError` callback, verify logging
     - Simulate finish: trigger `onFinish` callback, verify logging with usage data
   - **generateStructured tests**:
     - Verify `generateObject` called with correct schema and prompt
     - Verify typed result returned
     - Test abort: mock `generateObject` to throw abort error → verify `AppError('AI_STREAM_ABORTED')`
     - Test invalid response: mock `generateObject` to throw → verify `AppError('AI_INVALID_RESPONSE')`
   - **API route tests** (test the POST handler directly):
     - Mock registry and stream functions
     - Test valid request: verify stream response returned
     - Test invalid body (missing modelId): verify 400 response
     - Test unknown model: verify 500 response with error JSON
     - Test abort: verify `req.signal` forwarded

## Must-Haves

- [ ] `streamWithAbort` wraps `streamText` with abort, error, and finish lifecycle callbacks
- [ ] `generateStructured` wraps `generateObject` with typed Zod schema output and error recovery
- [ ] API route streams response with `abortSignal: req.signal` for proper cleanup on client disconnect
- [ ] API route creates registry from env vars (Google + OpenAI)
- [ ] API route validates request body with Zod
- [ ] All streaming and route tests passing
- [ ] `pnpm build` passes with zero errors
- [ ] Barrel export updated with streaming functions
  - Estimate: 1h
  - Files: src/engine/provider/streaming.ts, src/app/api/research/route.ts, src/engine/provider/__tests__/streaming.test.ts, src/engine/provider/index.ts
  - Verify: pnpm vitest run src/engine/provider/__tests__/streaming.test.ts && pnpm build
