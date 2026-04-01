# S02 Research: Provider Factory and AI Integration

**Slice:** S02 — Provider Factory and AI Integration
**Status:** Researched
**Confidence:** HIGH

## Summary

S02 builds the AI provider layer: a factory that creates AI SDK model instances for Gemini native and OpenAI-compatible providers, a model registry for provider lookup, an API route for server-side AI streaming, and AbortController cleanup for stream lifecycle management. The installed AI SDK is **v4.3.19** (not v6 as originally recommended — the upgrade was not done in S01 and should be deferred to avoid scope creep). v4 has everything needed: `createProviderRegistry`, `customProvider`, `streamText`, `generateText`, `generateObject`, `streamObject`, and `abortSignal` support.

## Requirements Owned

| ID | Description | S02 Scope |
|----|-------------|-----------|
| AI-01 | Google Gemini provider with API key, thinking/networking models | Full — provider factory + registry |
| AI-02 | OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Groq, xAI) | Full — single OpenAI-compatible factory with custom baseURL |
| AI-03 | Dual-model architecture (thinking + networking per provider) | Partial — type definitions and registry support; actual usage in S03 |
| AI-04 | Per-step model customization | Deferred — type definitions only; usage in S03 |
| AI-05 | Structured output via `generateObject` | Foundation — expose `generateObject` in provider utilities |
| AI-06 | AbortController cleanup on abort/unmount | Full — AbortController lifecycle in streaming utilities |

## Recommendation

Build 4 files in `src/engine/provider/`:

1. **`registry.ts`** — AI SDK `createProviderRegistry` wrapping Google + OpenAI-compatible providers. Model lookup via `registry.languageModel('google:gemini-2.5-pro')` strings. Supports dynamic provider registration (user configures providers at runtime from settings).

2. **`factory.ts`** — Factory functions `createGoogleProvider()` and `createOpenAICompatibleProvider()` that create configured AI SDK provider instances from user settings. The OpenAI-compatible factory uses `createOpenAI({ baseURL, apiKey })` from `@ai-sdk/openai` — a single package covers all 5+ providers (OpenAI, DeepSeek, OpenRouter, Groq, xAI) since they all speak the OpenAI API protocol.

3. **`types.ts`** — TypeScript types for provider config, model roles (thinking/networking), provider IDs, and model capabilities.

4. **`streaming.ts`** — Streaming utility wrapping `streamText`/`generateObject` with AbortController lifecycle, error recovery via AppError, and structured logging.

Plus 1 API route:

5. **`src/app/api/research/route.ts`** — Server-side route that receives model ID + messages, resolves model from registry, streams response with `abortSignal: req.signal`, and returns `result.toTextStreamResponse()`.

## Implementation Landscape

### What Exists (from S01)

- **`src/lib/env.ts`** — Zod-validated env with `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, base URLs. Server-side fallback keys.
- **`src/lib/errors.ts`** — `AppError` with codes `AI_REQUEST_FAILED`, `AI_STREAM_ABORTED`, `AI_INVALID_RESPONSE`. Error categories `ai`, `network`.
- **`src/lib/logger.ts`** — Structured logger with dev-readable + JSON output.
- **`src/lib/storage.ts`** — Type-safe localforage with Zod validation. Pattern for storing provider configs client-side.
- **`src/types/index.ts`** — Empty `AppConfig` type ready for extension.
- **Directories:** `src/hooks/`, `src/store/`, `src/utils/` exist but are empty.

### Old Codebase Patterns (for reference only — do NOT copy)

**Provider factory** (`_archive/src-v0/utils/deep-research/provider.ts`, 150 lines):
- Giant if/else chain with 13 providers using dynamic imports
- Each provider has its own `@ai-sdk/*` package
- Pattern: `createXxxProvider({ baseURL, apiKey })` → `provider(model, settings)` → returns `LanguageModelV1`

**Dual-model** (`_archive/src-v0/utils/deep-research/index.ts`):
- `getThinkingModel()` — resolves thinking model from config
- `getTaskModel()` — resolves networking/task model, adds `useSearchGrounding: true` for Gemini networking models
- `isThinkingModel()` / `isNetworkingModel()` — model capability classification based on model name patterns

**Streaming** (`_archive/src-v0/utils/deep-research/index.ts`):
- Uses `streamText` with `result.fullStream` async iteration
- `fullStream` parts: `text-delta`, `reasoning`, `source`, `step-finish`, `finish`
- `ThinkTagStreamProcessor` strips `<think/>` tags from models that emit reasoning as text rather than structured reasoning parts
- **Critical gap: NO AbortController anywhere in the research engine** — only in SSE routes

**API routes** (`_archive/src-v0/app/api/ai/*/route.ts`):
- 13 per-provider proxy routes that forward requests to provider APIs (CORS proxy pattern)
- Edge runtime, identical pattern per provider
- NOT needed in v1.0 — AI SDK handles provider communication server-side

### AI SDK v4 API Surface (verified against installed v4.3.19)

**Provider creation:**
```ts
// Google Gemini
import { createGoogleGenerativeAI } from '@ai-sdk/google';
const google = createGoogleGenerativeAI({ apiKey, baseURL });
const model = google('gemini-2.5-pro', { useSearchGrounding: true });

// OpenAI-compatible (covers OpenAI, DeepSeek, OpenRouter, Groq, xAI)
import { createOpenAI } from '@ai-sdk/openai';
const openai = createOpenAI({ apiKey, baseURL });
const model = openai('gpt-4o');          // default (responses API for newer models)
const model = openai.chat('deepseek-r1'); // force chat completions API
```

**Provider registry:**
```ts
import { createProviderRegistry } from 'ai';
const registry = createProviderRegistry({ google, openai });
const model = registry.languageModel('google:gemini-2.5-pro');
```

**Streaming with abort:**
```ts
const result = streamText({
  model,
  prompt: '...',
  abortSignal: controller.signal,  // forwards abort to provider
  onAbort: ({ steps }) => { /* cleanup */ },
  onError: ({ error }) => { /* log error */ },
  onFinish: ({ steps, totalUsage }) => { /* success */ },
});
// Iterate: for await (const part of result.fullStream) { ... }
```

**Structured output:**
```ts
import { generateObject } from 'ai';
const result = await generateObject({
  model,
  schema: z.object({ queries: z.array(z.object({ query: z.string() })) }),
  prompt: '...',
});
```

**Key fullStream part types (v4):** `text-delta`, `reasoning`, `reasoning-signature`, `source`, `file`, `tool-call`, `tool-call-streaming-start`, `tool-call-delta`, `tool-result`, `step-finish`, `finish`, `error`

### Natural Seams for Task Decomposition

1. **Types + Provider Config** — `types.ts` defines `ProviderId`, `ProviderConfig`, `ModelRole`, `ModelCapabilities`. No dependencies beyond TypeScript.
2. **Factory** — `factory.ts` depends on types. Creates AI SDK provider instances. Testable in isolation.
3. **Registry** — `registry.ts` depends on factory + types. Wraps providers in AI SDK `createProviderRegistry`.
4. **Streaming Utilities** — `streaming.ts` depends on registry (for model resolution) + errors.ts + logger.ts. Wraps `streamText`/`generateObject` with abort lifecycle.
5. **API Route** — `route.ts` depends on streaming utilities. Thin adapter between HTTP and provider layer.

### What to Build First

**Types first** (unblocks everything), then **factory** (core integration), then **registry** (composition), then **streaming** (lifecycle), then **API route** (HTTP surface). The API route is the integration verification point — if it streams correctly with abort support, the whole layer works.

## Constraints

1. **AI SDK v4, not v6.** The installed version is 4.3.19. Do NOT upgrade during S02 — it's a breaking change that would affect the entire project. All API patterns above are verified against v4.

2. **`@ai-sdk/openai` covers all OpenAI-compatible providers.** Do NOT install `@ai-sdk/openai-compatible`, `@ai-sdk/deepseek`, `@openrouter/ai-sdk-provider`, etc. The `createOpenAI({ baseURL })` factory handles them all with custom base URLs.

3. **Server-side provider instantiation only.** Provider instances (with API keys) must only exist in API routes and server-side code. Client-side code stores provider config in Zustand/localforage and sends it to API routes. Never expose API keys to the client bundle.

4. **Runtime: Node.js (not Edge).** The old code used Edge runtime for API routes. The v1.0 standalone build mode uses Node.js runtime. Do NOT add `export const runtime = 'edge'` to API routes.

5. **300-line file limit.** Split files if they approach this. The old provider.ts was 150 lines for 13 providers; with 2 providers we should be well under.

6. **`src/engine/provider/` is a new directory.** Create it. The `src/engine/` prefix isolates framework-agnostic engine code from Next.js-specific app code. S03 (ResearchOrchestrator) will also live under `src/engine/`.

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Provider-specific quirks (DeepSeek reasoning_content, OpenRouter headers) | Medium | OpenAI-compatible factory uses `.chat()` for chat completions API; provider-specific headers via `createOpenAI({ headers })` option. Test each provider during S03. |
| `useSearchGrounding` only works with specific Gemini models | Low | Validate model name before applying setting. Document which models support grounding. |
| AI SDK v4 `fullStream` event types differ from v6 | Low | We're on v4 and verified the types above. Stay on v4. |
| API keys stored client-side in Zustand/localforage | Medium (deferred to S06) | S02 defines the types; S06 (Settings) implements secure storage. For now, API routes read from env vars OR accept keys in request body. |
| Streaming utility grows too large | Low | Keep it focused on lifecycle (abort, error, logging). Don't add ThinkTagStreamProcessor here — that belongs in S03's orchestrator. |

## Don't Hand-Roll

- **Provider registry:** Use AI SDK's `createProviderRegistry` — it handles provider lookup, model resolution, and fallback.
- **OpenAI-compatible provider:** Use `@ai-sdk/openai` with custom `baseURL` — it handles the protocol differences (responses API vs chat completions API via `.chat()`).
- **Stream lifecycle:** Use AI SDK's `abortSignal` parameter + `onAbort`/`onFinish` callbacks. Do NOT manually manage AbortController signals.
- **Structured output:** Use `generateObject` with Zod schemas. Do NOT parse JSON from AI text output.

## Sources

- AI SDK v4 installed version: 4.3.19 (verified via `node -e "require('ai/package.json').version"`)
- `@ai-sdk/google` v1.2.22, `@ai-sdk/openai` v1.3.23 (installed)
- AI SDK docs via Context7: `createProviderRegistry`, `customProvider`, `streamText` abort handling, `generateObject`
- Old codebase: `_archive/src-v0/utils/deep-research/provider.ts` (provider factory), `_archive/src-v0/utils/deep-research/index.ts` (streaming usage), `_archive/src-v0/utils/model.ts` (model classification), `_archive/src-v0/utils/text.ts` (ThinkTagStreamProcessor)
- S01 deliverables: `src/lib/env.ts`, `src/lib/errors.ts`, `src/lib/logger.ts`, `src/lib/storage.ts`
