---
id: T02
parent: S02
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/provider/factory.ts", "src/engine/provider/__tests__/factory.test.ts"]
key_decisions: ["Factory returns the raw provider instance; consumers call .chat() or .languageModel() to get a LanguageModelV1"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "17/17 factory tests pass via `pnpm vitest run src/engine/provider/__tests__/factory.test.ts`. Full provider suite (types + factory) = 38/38 pass. ESLint zero warnings/errors via `pnpm lint`."
completed_at: 2026-03-31T17:20:22.019Z
blocker_discovered: false
---

# T02: Create provider factory functions for Google Gemini and OpenAI-compatible providers with unified dispatch, AppError wrapping, and 17 passing tests

> Create provider factory functions for Google Gemini and OpenAI-compatible providers with unified dispatch, AppError wrapping, and 17 passing tests

## What Happened
---
id: T02
parent: S02
milestone: M001
key_files:
  - src/engine/provider/factory.ts
  - src/engine/provider/__tests__/factory.test.ts
key_decisions:
  - Factory returns the raw provider instance; consumers call .chat() or .languageModel() to get a LanguageModelV1
duration: ""
verification_result: passed
completed_at: 2026-03-31T17:20:22.021Z
blocker_discovered: false
---

# T02: Create provider factory functions for Google Gemini and OpenAI-compatible providers with unified dispatch, AppError wrapping, and 17 passing tests

**Create provider factory functions for Google Gemini and OpenAI-compatible providers with unified dispatch, AppError wrapping, and 17 passing tests**

## What Happened

Implemented src/engine/provider/factory.ts with three functions: createGoogleProvider (wraps @ai-sdk/google's createGoogleGenerativeAI with optional baseURL), createOpenAICompatibleProvider (wraps @ai-sdk/openai's createOpenAI with apiKey/baseURL/name for DeepSeek, OpenRouter, Groq, xAI), and createProvider (unified dispatcher using isOpenAICompatible() from types.ts). All functions include try/catch → AppError(AI_REQUEST_FAILED) wrapping, logger.info with providerId + modelCount (never API key), and defensive unknown-provider rejection. Created 17 comprehensive tests covering argument passing, optional fields, logging safety, error wrapping (Error and non-Error), dispatch for all 6 provider IDs, and unknown-provider edge case.

## Verification

17/17 factory tests pass via `pnpm vitest run src/engine/provider/__tests__/factory.test.ts`. Full provider suite (types + factory) = 38/38 pass. ESLint zero warnings/errors via `pnpm lint`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/provider/__tests__/factory.test.ts` | 0 | ✅ pass | 130ms |
| 2 | `pnpm vitest run src/engine/provider/ (full suite)` | 0 | ✅ pass | 142ms |
| 3 | `pnpm lint` | 0 | ✅ pass | 5000ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/provider/factory.ts`
- `src/engine/provider/__tests__/factory.test.ts`


## Deviations
None.

## Known Issues
None.
