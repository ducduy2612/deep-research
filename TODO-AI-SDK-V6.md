# AI SDK v4 → v6 Migration — Remaining Work

## Status: Production code migrated, tests need fixes

### Completed
- [x] Package upgrades: `ai@6.0.145`, `@ai-sdk/google@3.0.57`, `@ai-sdk/openai@3.0.50`
- [x] `CoreMessage` → `ModelMessage` (orchestrator.ts, streaming.ts)
- [x] `maxTokens` → `maxOutputTokens` (route.ts, api-config.ts, types.ts, all test files)
- [x] `generateObject` → `generateText` + `Output.object()` (streaming.ts)
- [x] `usage.promptTokens/completionTokens` → `usage.inputTokens/outputTokens` (streaming.ts)
- [x] `textDelta` → `text` on fullStream text-delta parts (orchestrator.ts — 5 locations)
- [x] `"reasoning"` → `"reasoning-delta"` on fullStream reasoning parts (orchestrator.ts — 5 locations)
- [x] Google search grounding: `useSearchGrounding` model option → `google.tools.googleSearch({})` tool (model-native.ts)
- [x] Factory test type casts: `provider as Record<>` → `provider as unknown as Record<>`
- [x] Streaming test mock model: cast to `import("ai").LanguageModel`

### Remaining — Production Code
- [x] All production source files compile clean (zero tsc errors in src/ excluding __tests__)

### Remaining — Test Files (do next session)

#### 1. `src/engine/provider/__tests__/streaming.test.ts`
The `generateStructured` function now uses `generateText` + `Output.object()` instead of `generateObject`.
The test mocks `generateObject` but should now mock `generateText` (or just let the real one run with a mock model).
The mock setup on line 8-15 needs updating:
```ts
// OLD — no longer intercepts anything since streaming.ts doesn't import generateObject
const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({ ..., generateObject: mockGenerateObject }));

// NEW — mock generateText or restructure tests to use mock model
```
All `generateStructured` test assertions (lines 173-267) need updating:
- `mockGenerateObject.mockResolvedValue({ object: X })` → `mockGenerateText.mockResolvedValue({ output: X })`
- The mock also needs to handle the `streamText` and `generateText` being separate functions

#### 2. `src/engine/research/__tests__/orchestrator.test.ts`
Mock model updated to `MockLanguageModelV3` + `simulateReadableStream` but tsc reports overload errors (lines 148, 156).
The `doStream`/`doGenerate` return shapes may not exactly match `LanguageModelV3StreamResult`/`LanguageModelV3GenerateResult`.
Fix: check the exact type shapes from `@ai-sdk/provider@3.0.8` (the version from `ai@6`, not the old 1.1.3 from `@ai-sdk/ui-utils`).
There's a dual `@ai-sdk/provider` version issue — `@ai-sdk/ui-utils@1.2.11` pulls the old 1.1.3 which may cause type resolution confusion.

#### 3. `src/engine/research/__tests__/sse-route.test.ts` (5 errors)
Pre-existing `unknown` type issues — not caused by the migration. Lines 193, 251, 344, 354, 498.

#### 4. `src/engine/knowledge/__tests__/file-parser.test.ts` (10 errors)
Pre-existing `ArrayBufferLike` not assignable to `ArrayBuffer` — not caused by migration.

#### 5. `src/stores/research-store.ts` (1 error)
Pre-existing Zod v4 type mismatch — not caused by migration.

### Key API Changes Reference (v4 → v6)

| v4 | v6 | Notes |
|---|---|---|
| `CoreMessage` | `ModelMessage` | Renamed in v5, removed in v6 |
| `maxTokens` | `maxOutputTokens` | Renamed in v5 |
| `providerMetadata` (input) | `providerOptions` | Input param renamed in v5 |
| `generateObject()` | `generateText({ output: Output.object({ schema }) })` | Deprecated in v6 |
| `streamObject()` | `streamText({ output: Output.object({ schema }) })` | Deprecated in v6 |
| `usage.promptTokens` | `usage.inputTokens` | Changed in v6 |
| `usage.completionTokens` | `usage.outputTokens` | Changed in v6 |
| `part.textDelta` (fullStream) | `part.text` | fullStream TextStreamPart property |
| `part.type === "reasoning"` | `part.type === "reasoning-delta"` | Split into start/delta/end |
| `MockLanguageModelV1` | `MockLanguageModelV3` | From `ai/test` |
| `google(model, { useSearchGrounding: true })` | `google(model)` + `tools: { google_search: google.tools.googleSearch({}) }` | Search grounding is now a tool |
| `createProviderRegistry` | Still works | No change |
| `LanguageModel` type | Still works | Now `GlobalProviderModelId \| LanguageModelV3 \| LanguageModelV2` |
| `LanguageModelV1.StreamPart` | Use `simulateReadableStream` from `ai` | For test mocks |
| Mock `doGenerate` returns `{ text, usage: { promptTokens } }` | Returns `{ content: [{ type: "text", text }], usage: { inputTokens: { total } }, warnings: [] }` | New shape |
| Mock finish part `{ finishReason: "stop" }` | `{ finishReason: { unified: "stop", raw: undefined } }` | New shape |
| Mock usage `{ promptTokens: N, completionTokens: N }` | `{ inputTokens: { total, noCache, cacheRead, cacheWrite }, outputTokens: { total, text, reasoning } }` | New shape |

### ~~Dual `@ai-sdk/provider` Version Issue~~ — RESOLVED
Removed unused `@ai-sdk/ui-utils` dependency (zero imports in src/). Now only `@ai-sdk/provider@3.0.8` exists.
