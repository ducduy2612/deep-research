---
estimated_steps: 54
estimated_files: 3
skills_used: []
---

# T03: Provider Registry and Barrel Export

## Description

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

## Inputs

- `src/engine/provider/types.ts`
- `src/engine/provider/factory.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`

## Expected Output

- `src/engine/provider/registry.ts`
- `src/engine/provider/index.ts`
- `src/engine/provider/__tests__/registry.test.ts`

## Verification

pnpm vitest run src/engine/provider/__tests__/registry.test.ts
