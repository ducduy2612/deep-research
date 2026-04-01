---
estimated_steps: 35
estimated_files: 4
skills_used: []
---

# T01: Provider Types and Test Framework

## Description

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

## Inputs

- `src/lib/errors.ts`
- `src/types/index.ts`

## Expected Output

- `vitest.config.ts`
- `src/engine/provider/types.ts`
- `src/engine/provider/__tests__/types.test.ts`

## Verification

pnpm vitest run src/engine/provider/__tests__/types.test.ts

## Observability Impact

No runtime observability — this task produces TypeScript types and Zod schemas only.
