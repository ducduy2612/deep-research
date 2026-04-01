---
estimated_steps: 39
estimated_files: 2
skills_used: []
---

# T02: Provider Factory Functions

## Description

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

## Inputs

- `src/engine/provider/types.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`

## Expected Output

- `src/engine/provider/factory.ts`
- `src/engine/provider/__tests__/factory.test.ts`

## Verification

pnpm vitest run src/engine/provider/__tests__/factory.test.ts

## Observability Impact

Adds `logger.info` on provider creation with provider ID and model count — enables tracing which providers are instantiated and when.
