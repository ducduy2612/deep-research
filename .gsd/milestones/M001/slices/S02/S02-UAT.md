# S02: Provider Factory and AI Integration — UAT

**Milestone:** M001
**Written:** 2026-03-31T17:36:51.774Z

# UAT: S02 — Provider Factory and AI Integration

## Preconditions
- `pnpm install` completed
- At least one AI provider API key set in `.env.local` (e.g. `GOOGLE_GENERATIVE_AI_API_KEY`)
- Dev server can start (`pnpm dev`)

---

## Test Case 1: All provider unit tests pass
**Purpose:** Verify the type system, factory, registry, and streaming utilities work correctly.

**Steps:**
1. Run `pnpm vitest run src/engine/provider/__tests__/`
2. Observe output

**Expected:** 4 test files pass, 63/63 tests pass, zero failures.

---

## Test Case 2: Barrel export is importable
**Purpose:** Verify the public API surface is accessible from `@/engine/provider`.

**Steps:**
1. In a TypeScript file, attempt: `import { createProvider, createRegistry, resolveModel, streamWithAbort, generateStructured, isOpenAICompatible, ProviderConfig, ProviderRegistry } from '@/engine/provider'`
2. Run `pnpm build`

**Expected:** No TypeScript errors. Build succeeds.

---

## Test Case 3: Provider factory creates Google provider
**Purpose:** Verify Google Gemini provider factory works with valid config.

**Steps:**
1. Create a `ProviderConfig` with `id: 'google'`, `apiKey: 'test-key'`, and at least one model
2. Call `createProvider(config)`
3. Verify no error thrown

**Expected:** Returns a provider instance. No AppError thrown.

---

## Test Case 4: Provider factory creates OpenAI-compatible providers
**Purpose:** Verify all 5 OpenAI-compatible providers work through the factory.

**Steps:**
1. For each `ProviderId` in `['openai', 'deepseek', 'openrouter', 'groq', 'xai']`:
   - Create a `ProviderConfig` with that id, a test API key, and optional baseURL
   - Call `createProvider(config)`
   - Verify provider instance returned

**Expected:** All 5 return provider instances. No errors.

---

## Test Case 5: isOpenAICompatible helper
**Purpose:** Verify the helper correctly classifies provider types.

**Steps:**
1. Call `isOpenAICompatible('google')` → expect `false`
2. Call `isOpenAICompatible('openai')` → expect `true`
3. Call `isOpenAICompatible('deepseek')` → expect `true`
4. Call `isOpenAICompatible('openrouter')` → expect `true`
5. Call `isOpenAICompatible('groq')` → expect `true`
6. Call `isOpenAICompatible('xai')` → expect `true`

**Expected:** Google returns false; all others return true.

---

## Test Case 6: Provider registry resolves models
**Purpose:** Verify the registry creates from configs and resolves "provider:model" strings.

**Steps:**
1. Create two `ProviderConfig` objects (Google with `gemini-2.5-pro`, OpenAI with `gpt-4o`)
2. Call `createRegistry(configs)`
3. Call `resolveModel(registry, 'google:gemini-2.5-pro')`
4. Call `resolveModel(registry, 'openai:gpt-4o')`

**Expected:** Both resolve to `LanguageModel` instances without errors.

---

## Test Case 7: Registry rejects unknown provider
**Purpose:** Verify error handling for non-existent provider in model string.

**Steps:**
1. Create a registry with only Google provider
2. Call `resolveModel(registry, 'nonexistent:model-1')`

**Expected:** Throws `AppError` with code `AI_REQUEST_FAILED`.

---

## Test Case 8: getDefaultModel returns correct model by role
**Purpose:** Verify default model selection for thinking/networking roles.

**Steps:**
1. Create a `ProviderConfig` for Google with two models: one `role: 'thinking'` and one `role: 'networking'`
2. Create registry from this config
3. Call `getDefaultModel(registry, configs, 'google', 'thinking')`
4. Call `getDefaultModel(registry, configs, 'google', 'networking')`

**Expected:** Each returns the corresponding model for that role.

---

## Test Case 9: streamWithAbort handles abort lifecycle
**Purpose:** Verify abort detection and callback routing.

**Steps:**
1. Create a mock stream with `onError` callback
2. Simulate an abort by triggering `onError` with `new DOMException('The user aborted a request.', 'AbortError')`
3. Verify `onAbort` callback is called instead of `onError`

**Expected:** Abort is detected via `DOMException.name === 'AbortError'` and routed to `onAbort`.

---

## Test Case 10: generateStructured wraps errors correctly
**Purpose:** Verify error categorization for structured output generation.

**Steps:**
1. Mock `generateObject` to throw an `AbortError`
2. Call `generateStructured` → expect `AppError('AI_STREAM_ABORTED')`
3. Mock `generateObject` to throw a generic `Error`
4. Call `generateStructured` → expect `AppError('AI_INVALID_RESPONSE')`

**Expected:** Abort errors map to `AI_STREAM_ABORTED`, all other errors map to `AI_INVALID_RESPONSE`.

---

## Test Case 11: API route validates request body
**Purpose:** Verify the POST /api/research route rejects malformed requests.

**Steps:**
1. Send POST to `/api/research` with empty body `{}`
2. Observe response

**Expected:** 400 status with validation error message (missing `modelId`).

---

## Test Case 12: API route returns streaming response with valid input
**Purpose:** Verify end-to-end streaming works.

**Preconditions:** `GOOGLE_GENERATIVE_AI_API_KEY` set in `.env.local` with a valid key.

**Steps:**
1. Send POST to `/api/research` with body `{ "modelId": "google:gemini-2.5-pro", "messages": [{ "role": "user", "content": "Hello" }] }`
2. Observe response

**Expected:** 200 status with `text/plain; charset=utf-8` content type, streamed response body.

---

## Test Case 13: Production build succeeds
**Purpose:** Verify the entire provider module compiles without errors.

**Steps:**
1. Run `pnpm build`

**Expected:** Build succeeds with zero errors. Route `/api/research` appears as dynamic `ƒ` in build output.

---

## Test Case 14: Zod schemas reject invalid provider configs
**Purpose:** Verify validation catches missing/invalid fields.

**Steps:**
1. Validate `{ id: 'invalid-provider', apiKey: 'test' }` with `providerConfigSchema`
2. Validate `{ id: 'google' }` (missing apiKey) with `providerConfigSchema`
3. Validate `{ id: 'google', apiKey: 'test', models: [{ id: '', name: '', role: 'invalid-role' }] }`

**Expected:** All three fail Zod validation with descriptive error messages.
