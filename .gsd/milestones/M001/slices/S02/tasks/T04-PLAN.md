---
estimated_steps: 85
estimated_files: 4
skills_used: []
---

# T04: Streaming Utilities and API Route

## Description

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

## Inputs

- `src/engine/provider/registry.ts`
- `src/engine/provider/types.ts`
- `src/engine/provider/factory.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- `src/lib/env.ts`

## Expected Output

- `src/engine/provider/streaming.ts`
- `src/app/api/research/route.ts`
- `src/engine/provider/__tests__/streaming.test.ts`

## Verification

pnpm vitest run src/engine/provider/__tests__/streaming.test.ts && pnpm build

## Observability Impact

Adds structured logging for AI stream lifecycle: start (model + provider), abort (with step count), error (with error message), finish (with token usage). AppError codes distinguish abort from failure. These signals allow diagnosing whether failures are user-initiated aborts vs provider errors.
