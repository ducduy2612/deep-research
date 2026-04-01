---
id: S02
parent: M001
milestone: M001
provides:
  - ProviderConfig and all provider types with Zod schemas for validation
  - createProvider() dispatcher for 6 providers (Google + 5 OpenAI-compatible)
  - createRegistry() composing multiple providers into AI SDK registry
  - resolveModel() for 'provider:model' string → LanguageModel resolution
  - getDefaultModel() for provider+role → default model lookup
  - streamWithAbort() with abort/error/finish lifecycle callbacks
  - generateStructured() with Zod schema output and error categorization
  - POST /api/research route proving full stack integration
  - Barrel export at @/engine/provider for clean imports
requires:
  - slice: S01
    provides: AppError error hierarchy (src/engine/errors.ts), structured logger (src/engine/logger.ts), env config (src/engine/env.ts)
affects:
  - S03
key_files:
  - src/engine/provider/types.ts
  - src/engine/provider/factory.ts
  - src/engine/provider/registry.ts
  - src/engine/provider/streaming.ts
  - src/engine/provider/index.ts
  - src/app/api/research/route.ts
  - src/engine/provider/__tests__/types.test.ts
  - src/engine/provider/__tests__/factory.test.ts
  - src/engine/provider/__tests__/registry.test.ts
  - src/engine/provider/__tests__/streaming.test.ts
  - vitest.config.ts
key_decisions:
  - Zod v4 stepModelMapSchema uses z.object() with optional fields + catchall(z.never()) because z.record() requires all enum keys
  - AI SDK v4 has no onAbort callback — aborts surface through onError as DOMException with name 'AbortError'
  - API route builds provider configs from env at request time (not import time) to avoid crashing startup on missing keys
  - Provider factory returns raw provider instance; consumers call .chat() or .languageModel() to get LanguageModelV1
  - ProviderRegistry exported as opaque type alias to hide AI SDK internals
patterns_established:
  - Provider factory pattern: two factories (Google native, OpenAI-compatible) behind unified createProvider() dispatcher
  - Model resolution via 'provider:model' string format (e.g. 'google:gemini-2.5-pro') through registry
  - Abort lifecycle: AbortController → request.signal → streamText → onError detects DOMException → routes to onAbort callback
  - Error wrapping: all AI SDK errors → AppError with codes (AI_REQUEST_FAILED, AI_STREAM_ABORTED, AI_INVALID_RESPONSE)
  - Barrel export pattern: types (export type + export), factory functions, registry functions, streaming utilities — all from @/engine/provider
observability_surfaces:
  - Logger calls at provider creation: logger.info('Provider created', { providerId, modelCount }) — never logs API keys
  - Logger calls at registry creation: logger.info('Registry created', { providerCount, providers })
  - Stream lifecycle logging: abort, error, and finish events all logged with structured context
  - Structured output logging: logger.info('Structured output generated', { schemaType })
drill_down_paths:
  - milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - milestones/M001/slices/S02/tasks/T03-SUMMARY.md
  - milestones/M001/slices/S02/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T17:36:51.774Z
blocker_discovered: false
---

# S02: Provider Factory and AI Integration

**Built the AI provider factory with Gemini native + OpenAI-compatible dispatch, provider registry with model resolution, streaming utilities with AbortController lifecycle, and a POST /api/research route proving the full stack end-to-end — all backed by 63 passing tests.**

## What Happened

Slice S02 created the complete AI provider integration layer across 4 tasks:

**T01 (Types)** — Installed vitest 4.1.2 with path alias config, then created `src/engine/provider/types.ts` with all provider types (`ProviderId`, `ModelRole`, `ResearchStep`, `ModelCapabilities`, `ProviderModelConfig`, `ProviderConfig`, `StepModelMap`), their Zod v4 schemas, and two helpers (`isOpenAICompatible`, `getModelsByRole`). Key discovery: Zod v4's `z.record()` with enum keys requires all keys present, so `stepModelMapSchema` uses `z.object()` with optional fields + `catchall(z.never())` instead. 21 tests pass.

**T02 (Factory)** — Created `src/engine/provider/factory.ts` with three functions: `createGoogleProvider` (wraps `@ai-sdk/google`'s `createGoogleGenerativeAI`), `createOpenAICompatibleProvider` (wraps `@ai-sdk/openai`'s `createOpenAI` with custom baseURL for DeepSeek/OpenRouter/Groq/xAI), and `createProvider` (unified dispatcher). All errors wrapped as `AppError('AI_REQUEST_FAILED')`, logging includes providerId but never API keys. 17 tests pass.

**T03 (Registry)** — Created `src/engine/provider/registry.ts` with `createRegistry` (composes multiple providers into AI SDK's `createProviderRegistry`), `resolveModel` (resolves `"provider:model"` strings to `LanguageModel` instances), and `getDefaultModel` (finds default model for a provider+role combination). Also created the barrel export `index.ts` defining the module's public API. Used type assertion for AI SDK's template literal constraint on `languageModel()`. 12 tests pass.

**T04 (Streaming + API Route)** — Created `src/engine/provider/streaming.ts` with `streamWithAbort` (wraps `streamText` with abort/error/finish lifecycle — aborts detected via `DOMException.name === 'AbortError'` in onError) and `generateStructured` (wraps `generateObject` with Zod schema output). Created `src/app/api/research/route.ts` — a Next.js POST handler that validates body with Zod, builds provider configs from env at request time, creates registry, resolves model, and streams response with `abortSignal: request.signal`. Updated barrel exports. 13 tests pass.

Final verification: 63/63 tests pass across 4 test files, `pnpm build` succeeds with the API route detected as dynamic, zero lint errors.

## Verification

Full suite: `pnpm vitest run src/engine/provider/__tests__/` — 63/63 tests pass (21 types + 17 factory + 12 registry + 13 streaming). Production build: `pnpm build` succeeds with zero errors, API route `/api/research` detected as dynamic `ƒ`. Lint: `pnpm lint` reports zero warnings/errors. Barrel export `import { ... } from '@/engine/provider'` verified in registry tests.

## Requirements Advanced

- AI-01 — ProviderConfig supports Google provider with API key, thinking/networking model roles, and capabilities flags
- AI-02 — ProviderConfig + createOpenAICompatibleProvider support 5 OpenAI-compatible providers with apiKey, baseURL, and model selection
- AI-03 — ModelRole type ('thinking' | 'networking') and getModelsByRole() enable dual-model architecture per provider
- AI-04 — ResearchStep type (6 steps) and StepModelMap type provide the type foundation for per-step model assignment
- AI-05 — generateStructured() wraps generateObject with Zod schema validation for all structured AI responses
- AI-06 — streamWithAbort() wraps streamText with AbortController lifecycle, and API route forwards req.signal for proper cleanup
- SET-02 — All provider types have matching Zod schemas (providerConfigSchema, stepModelMapSchema, etc.) for settings validation

## Requirements Validated

- AI-01 — ProviderConfig supports Google with apiKey + models; createGoogleProvider wraps @ai-sdk/google; 17 factory tests pass
- AI-02 — createOpenAICompatibleProvider handles OpenAI/DeepSeek/OpenRouter/Groq/xAI with custom baseURL; tested for all 5 providers
- AI-03 — ModelRole type + getModelsByRole() helper filter models by thinking/networking role; 21 type tests pass
- AI-05 — generateStructured wraps generateObject with Zod schema, error recovery for abort and invalid response; 13 streaming tests pass
- AI-06 — streamWithAbort handles AbortController lifecycle; API route forwards req.signal; abort detection via DOMException in onError
- SET-02 — Zod schemas validate ProviderConfig, StepModelMap, ModelCapabilities with clear error messages; 21 schema tests pass

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All tasks delivered exactly as planned.

## Known Limitations

API route constructs a fresh registry per request from env vars — acceptable for low-volume research tool, but a cached registry would be needed for high-throughput use. The route is a minimal integration proof; S03+ will extend it with the full research orchestration.

## Follow-ups

S03 (Research Engine Core) will consume the provider registry and streaming utilities to implement the ResearchOrchestrator state machine. S05 (Core Research UI) will connect the API route to the frontend via streaming hooks.

## Files Created/Modified

- `vitest.config.ts` — New — vitest config with @/ path alias and test include pattern
- `src/engine/provider/types.ts` — New — all provider types, Zod v4 schemas, and helper functions
- `src/engine/provider/factory.ts` — New — createGoogleProvider, createOpenAICompatibleProvider, createProvider with error wrapping
- `src/engine/provider/registry.ts` — New — createRegistry, resolveModel, getDefaultModel with AI SDK createProviderRegistry
- `src/engine/provider/streaming.ts` — New — streamWithAbort and generateStructured with AbortController lifecycle
- `src/engine/provider/index.ts` — New — barrel export defining module public API
- `src/app/api/research/route.ts` — New — POST handler with Zod validation, registry creation, model resolution, streaming response
- `src/engine/provider/__tests__/types.test.ts` — New — 21 tests for types, schemas, and helpers
- `src/engine/provider/__tests__/factory.test.ts` — New — 17 tests for factory functions and error handling
- `src/engine/provider/__tests__/registry.test.ts` — New — 12 tests for registry, model resolution, and barrel exports
- `src/engine/provider/__tests__/streaming.test.ts` — New — 13 tests for streaming utilities and API route
- `package.json` — Modified — added vitest dev dependency, test and test:watch scripts
