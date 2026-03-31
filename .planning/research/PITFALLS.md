# Domain Pitfalls

**Domain:** AI-powered research tool (Next.js 15 + React 19 + Vercel AI SDK 4.x + Zustand)
**Researched:** 2026-03-31
**Context:** Ground-up rewrite addressing known issues from existing codebase

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Static Export + API Routes + PWA Contradiction

**What goes wrong:** The existing codebase has three build modes (`export`, `standalone`, default) that fundamentally change how the app works. Static export strips API routes and middleware entirely (confirmed by the `ignore-loader` webpack rule in `next.config.ts`). PWA service workers cache at build time but Docker containers may serve from different paths. These three features fight each other.
**Why it happens:** Next.js `output: "export"` cannot run API routes or middleware. Period. The current codebase works around this with a "CORS proxy mode" where the browser calls AI/search providers directly -- which means API keys are exposed in the browser. Meanwhile, PWA offline support requires caching API responses that may not exist in export mode.
**Consequences:** Either you lose PWA offline for API-dependent features in static export mode, or you must maintain two fundamentally different architectures (server-side proxy vs client-side direct calls) that diverge in behavior, error handling, and security.
**Prevention:** Decide one primary deployment target. For Docker, use `standalone` mode with the server. For static hosting, accept that API calls go direct from the browser and secure keys accordingly (or accept the limitation). Do NOT try to make both paths identical -- test each mode independently with integration tests.
**Detection:** If you find yourself writing `if (BUILD_MODE === "export")` conditionals in application code (not just build config), the architecture is splitting.

### Pitfall 2: AI SDK streamText Without Consumption Causes Silent Failures

**What goes wrong:** `streamText()` uses backpressure -- it only generates tokens as they are requested. If you start a stream but do not consume it (e.g., the user navigates away, a React component unmounts, an error occurs before the stream loop starts), the stream silently hangs and the underlying HTTP connection stays open. The `onError` callback fires but errors are suppressed to prevent crashes.
**Why it happens:** The AI SDK design choice to suppress errors in `streamText` (documented behavior: "immediately starts streaming and suppresses errors to prevent server crashes") means abandoned streams do not throw. The existing `useDeepResearch.ts` hook (857 lines) does not clean up streams on unmount.
**Consequences:** Memory leaks on the server, unclosed HTTP connections to AI providers (costing money), and research tasks that appear to hang without error feedback. With multi-step research making 5-10 sequential stream calls per query, this multiplies.
**Prevention:** Always wrap stream consumption in try/finally with explicit cleanup. Use AbortController for every stream call and abort on component unmount. Use the `onError` callback for structured error logging. Test unmount-during-stream scenarios explicitly.
**Detection:** Unclosed connections to AI providers in server logs; research tasks showing no error but never completing.

### Pitfall 3: JSON.parse on AI Output Without Fallbacks

**What goes wrong:** The research orchestration flow in the existing codebase parses AI output as JSON in multiple places (e.g., `generateSERPQuery` at line 177 of `index.ts`: `JSON.parse(removeJsonMarkdown(content))`). If the AI returns malformed JSON -- which happens frequently with cheaper models, non-English prompts, or when the model decides to add commentary around the JSON -- the entire research pipeline crashes.
**Why it happens:** LLMs do not guarantee valid JSON output even with explicit instructions. The `removeJsonMarkdown` helper tries to extract JSON from markdown code blocks, but models can produce output that looks like valid JSON but has trailing commas, unescaped characters, or partial truncation due to token limits.
**Consequences:** Research fails at the SERP query generation step, which is step 2 of 4 in the pipeline. The user sees an opaque error. No partial results are saved.
**Prevention:** Use Zod's `safeParse` with detailed error messages (the existing code does use Zod but only after `JSON.parse` -- the parse itself is the failure point). Wrap all JSON parsing of AI output in try/catch with retry logic. Consider using AI SDK's structured output (`generateObject` with Zod schema) instead of parsing raw text as JSON.
**Detection:** Error logs showing "Unexpected token" or "JSON.parse" at the SERP query generation step.

### Pitfall 4: Zustand Persist Stores Growing Until localStorage Quota Exceeded

**What goes wrong:** The `task.ts` store persists the entire research state (report plan, search tasks with full content, sources, images, final report) to localStorage via Zustand's persist middleware. The `history.ts` store accumulates completed research sessions. There is no quota management, no size limits, no cleanup policy, no pagination. localStorage has a 5-10MB per-origin limit.
**Why it happens:** Zustand's `persist` middleware writes the entire store on every `set()` call. Research reports can be 50-100KB of markdown. With images and sources metadata, a single research session can be 200KB+. Five sessions = 1MB. Twenty sessions = quota exceeded.
**Consequences:** Zustand persist silently fails (or throws in some browsers), corrupting the store. The user loses all settings and history. The app may not load at all if the persisted state cannot be parsed.
**Prevention:** (1) Do not persist large data in localStorage -- use IndexedDB (via `localforage` or Zustand's `persist` with a custom storage engine) for history and task data. (2) Implement a size-aware cleanup policy: cap history entries, compress old entries, or archive to IndexedDB. (3) Add error handling around persist operations with a quota check. (4) Separate volatile task state (current research) from persistent history (completed research).
**Detection:** Browser console showing "Failed to execute 'setItem' on 'Storage'" or "QuotaExceededError". App loading with default settings after having been configured.

### Pitfall 5: API Keys in Client-Side Zustand Stores

**What goes wrong:** The `setting.ts` store persists all API keys (OpenAI, Anthropic, DeepSeek, xAI, Mistral, Azure, Tavily, Firecrawl, Exa, Brave, etc.) as plain text in browser localStorage. Any XSS vulnerability in any dependency exposes every API key the user has configured.
**Why it happens:** The app runs as a client-side tool. In static export mode, there is no server to hold keys. The current architecture stores keys in the Zustand persist middleware, which serializes to localStorage by default.
**Consequences:** An XSS in any third-party dependency (npm packages, analytics scripts, etc.) can exfiltrate all API keys. Browser extensions with broad permissions can read localStorage. This is the highest-severity security issue in the codebase.
**Prevention:** (1) For the server-full mode (`standalone`), store keys server-side in encrypted cookies or a session store. (2) For static export mode, use `crypto.subtle` to encrypt keys with a user-provided passphrase before storing. (3) Never log or include keys in error reports. (4) Consider using `sessionStorage` for ephemeral use cases where persistence is not needed. (5) At minimum, do not persist API keys by default -- require explicit opt-in.
**Detection:** DevTools > Application > Local Storage showing plaintext API keys.

### Pitfall 7: Provider Abstraction That Cannot Handle Provider-Specific Features

**What goes wrong:** The rewrite simplifies to "Gemini native + OpenAI-compatible layer" but the existing `provider.ts` shows 13 provider branches with provider-specific behavior scattered throughout: OpenAI uses `openai.responses()` for certain models, Gemini uses `useSearchGrounding`, OpenRouter requires special `providerOptions`, Ollama needs custom `fetch` with credential handling. A naive two-branch abstraction will miss these.
**Why it happens:** "OpenAI-compatible" is a spectrum, not a standard. Each provider has quirks: DeepSeek's reasoning models return `reasoning_content` in a non-standard field, OpenRouter requires `HTTP-Referer` headers and uses provider-prefixed model IDs, Groq has different streaming behavior. The AI SDK has a dedicated `@ai-sdk/deepseek` provider and community `@openrouter/ai-sdk-provider` precisely because `createOpenAI()` with a custom baseURL does not cover all cases.
**Consequences:** Users of "OpenAI-compatible" providers experience silent failures, missing features, or incorrect behavior. Debugging is hard because the error looks like a provider issue but is actually an abstraction gap.
**Prevention:** Use the AI SDK's dedicated provider packages where they exist (`@ai-sdk/deepseek`, `@openrouter/ai-sdk-provider`, `@ai-sdk/groq`). Reserve `createOpenAI()` with custom baseURL only for truly unknown OpenAI-compatible endpoints. Create a provider registry that maps provider ID to the correct SDK factory, not a single generic factory. Test each provider independently.
**Detection:** Provider-specific features (tool calling, structured output, reasoning content) not working for providers that claim OpenAI compatibility.

## Moderate Pitfalls

### Pitfall 8: Next.js 15 Async params/searchParams Breaking Change

**What goes wrong:** In Next.js 15, `params` and `searchParams` in page and layout components are now Promises that must be awaited. Copying patterns from Next.js 14 tutorials or the existing codebase will cause type errors and undefined values.
**Prevention:** Always `await params` and `await searchParams` in page/layout components. Configure TypeScript strictly to catch this. Review every page component in the rewrite.

### Pitfall 9: React 19 ref-as-prop Without forwardRef Migration

**What goes wrong:** React 19 passes `ref` as a regular prop. Components using `forwardRef` will still work but the pattern is deprecated. More critically, components that accidentally accept a `ref` prop in their type definition will now receive the actual ref object, causing unexpected behavior.
**Prevention:** Remove `forwardRef` wrappers. Accept `ref` directly in component props. Do not name any prop `ref` unless it is meant to be a React ref.

### Pitfall 10: Sequential Search Tasks Instead of Parallel Execution

**What goes wrong:** The existing `runSearchTask` method iterates tasks with `for await (const item of tasks)` -- sequential processing. With 5 search tasks at 10-30 seconds each, the user waits 50-150 seconds when parallel execution could cut it to 10-30 seconds.
**Prevention:** Use `Promise.all` (or `p-limit` for controlled concurrency, which the existing `useDeepResearch.ts` already imports). The server-side `DeepResearch` class should accept a concurrency parameter. Add rate-limit awareness per provider.

### Pitfall 11: No AbortController Integration for Research Cancellation

**What goes wrong:** The existing research flow has no cancellation mechanism. If the user wants to stop research mid-way, the only option is to reload the page. Running streams continue consuming tokens and money on the server.
**Prevention:** Pass an AbortController signal through the entire research pipeline. The AI SDK's `streamText` and `generateText` accept an `abortSignal` option. On component unmount or user cancel, abort the signal. Propagate the signal through search providers and stream consumers.

### Pitfall 12: Zustand Store State Shape Migration on Rewrite

**What goes wrong:** The rewrite changes store shapes (simplified provider structure, different field names). Existing users who have persisted Zustand stores in their browser will experience deserialization errors or silently corrupted state when the new code reads the old shape.
**Prevention:** Since the rewrite is explicitly "no migration" (fresh start), use different localStorage keys for the new stores (e.g., `setting_v2` instead of `setting`). Add a `version` field to Zustand persist config and a `migrate` function for future-proofing. On first load, detect old keys and offer to clear them.

### Pitfall 13: File Upload Processing Blocking Serverless Functions

**What goes wrong:** Parsing documents is CPU-intensive and memory-heavy. Office files are ZIP archives requiring decompression via `officeparser`. PDFs are sent to an LLM-based OCR service (e.g. GLM-OCR) which adds API latency per file — large multi-page PDFs can be slow. In serverless environments (Vercel), this hits the 4.5MB payload limit (Hobby) or 50MB (Pro) and can exceed function timeouts (10s Hobby, 60s Pro).
**Prevention:** Set explicit file size limits. Limit PDF page count. Run document parsing on the Node.js runtime (not Edge). Add progress indicators for large files. Consider processing files client-side with Web Workers for the static export mode. For LLM-based OCR, send the PDF file directly (models accept PDF natively) to minimize overhead.

### Pitfall 14: Environment Variable Validation at Runtime Not Build Time

**What goes wrong:** The existing codebase has 30+ environment variables read at build time in `next.config.ts` and at runtime in middleware and API routes, with no validation. Missing or malformed variables cause cryptic runtime errors deep in the call stack (e.g., `undefined.split is not a function` when `GOOGLE_VERTEX_LOCATION` is missing).
**Prevention:** Create a single Zod schema for all environment variables. Validate at app startup (server-side) with clear error messages listing which variables are missing/invalid. For client-side variables (`NEXT_PUBLIC_*`), validate on first use with fallback defaults. Never silently default to empty strings for required configuration.

### Pitfall 15: Middleware Authorization Bypass via Edge Cases

**What goes wrong:** The existing middleware (814 lines) has a complex chain of conditionals for request authorization. The rewrite needs middleware for API route protection, but complex authorization logic in Edge middleware is fragile. The current signature verification uses `Date.now()` timestamps without nonce or expiration validation, making replay attacks trivial.
**Prevention:** Simplify middleware to a composable pattern: one function per concern (auth check, provider routing, CORS). Use proper HMAC or JWT with short expiration (5 minutes). Add integration tests that probe authorization bypass attempts. Consider whether middleware authorization is even needed in standalone Docker mode (network-level access control may suffice).

### Pitfall 16: AI SDK Provider-Specific Model ID Format Confusion

**What goes wrong:** Different providers use different model ID formats. The AI SDK uses the provider's native model ID. DeepSeek uses `deepseek-chat`, OpenRouter uses `deepseek/deepseek-chat`, xAI uses `grok-3`. The setting store currently stores model IDs as plain strings per provider, but the rewrite's simplified "OpenAI-compatible" layer must handle model ID translation.
**Prevention:** Create a model ID registry that maps provider + display name to the correct model ID for that provider. Do not let users type raw model IDs -- offer a curated list per provider with an "advanced" option for custom IDs. Validate model IDs against provider documentation before making API calls.

## Minor Pitfalls

### Pitfall 17: ThinkTagStreamProcessor Custom Parsing vs AI SDK Native Reasoning

**What goes wrong:** The existing codebase has a custom `ThinkTagStreamProcessor` that strips `<think />` tags from model output. This is needed because some models (DeepSeek R1, etc.) output reasoning in `<think/>` tags that are not part of the AI SDK's native reasoning handling. The AI SDK 4.x has native `reasoning` events in `fullStream`, but these only work for models that use the provider's native reasoning API (not raw think tags).
**Prevention:** Check which models use native AI SDK reasoning vs. think-tag output. For models with native reasoning support (Anthropic, OpenAI), use the SDK's `reasoning` stream events. For models with think-tag output, keep the processor but make it a clearly documented adapter, not interleaved with main stream logic.

### Pitfall 18: PWA Service Worker Version Conflicts After Docker Redeployment

**What goes wrong:** When deploying via Docker, the service worker from the previous deployment may remain active in users' browsers. The old service worker caches assets with build-specific hashes that no longer exist on the new deployment, causing white screens or stale API behavior.
**Prevention:** Ensure the service worker's `PRECACHE_MANIFEST` is regenerated on every Docker build. Use Serwist's `skipWaiting` and `clientsClaim` for immediate activation. Add a version check endpoint that the service worker polls to detect stale versions.

### Pitfall 19: i18n Bundle Size Bloat

**What goes wrong:** Loading all translation files for all languages upfront increases the initial bundle size. With multiple languages and the existing partial coverage (some hardcoded strings, some translated), the rewrite may end up with a mix of approaches.
**Prevention:** Use lazy loading for translation files (load only the active language). Use a consistent approach: all user-facing strings go through the translation function, or use a build-time extraction tool to find untranslated strings. Do not mix `react-i18next` with hardcoded strings.

### Pitfall 20: Experimental React Compiler Instability

**What goes wrong:** The existing `next.config.ts` enables `experimental.reactCompiler: true`. React Compiler is still experimental and can cause subtle bugs: incorrect memoization, missed re-renders, or crashes with complex patterns (especially with Zustand's `useSyncExternalStore` integration).
**Prevention:** Do not enable React Compiler in the rewrite from day one. Get the app working first, then benchmark with and without the compiler. If enabled, add it as an opt-in config, not the default. Have a build flag to disable it immediately if issues arise.

### Pitfall 21: Google Gemini-Specific Grounding Metadata Handling

**What goes wrong:** The existing code has Gemini-specific logic for processing grounding metadata (source citations from Gemini's search grounding). This logic mutates content with `content = content.replaceAll(...)` inside the stream loop, which is fragile and provider-specific. If the grounding metadata format changes or is used with a different model, citations break silently.
**Prevention:** Extract grounding metadata processing into a dedicated post-processing step, not inline during streaming. Make it a plugin that activates only for Gemini providers. Do not mutate the accumulated content string during stream processing -- collect metadata and apply transformations after the stream completes.

### Pitfall 22: Knowledge Base Resource ID Collision via Date.now()

**What goes wrong:** The existing knowledge store uses `Date.now()` for resource IDs. If two resources are added within the same millisecond (possible with batch uploads or fast operations), IDs collide and one resource overwrites the other.
**Prevention:** Use `crypto.randomUUID()` (available in all modern browsers and Node.js) for resource IDs. This is a one-line fix that eliminates the entire class of collision bugs.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project scaffolding + build config | Pitfall 1: Static export + API routes + PWA contradiction | Decide primary deployment target first; test build modes independently |
| Zustand store design | Pitfall 4: localStorage quota exceeded | Design storage architecture (localStorage vs IndexedDB) before writing stores |
| API key management | Pitfall 5: Plaintext keys in localStorage | Design encryption or server-side storage strategy before implementing settings |
| Provider factory | Pitfall 7: Provider-specific feature gaps | Use AI SDK dedicated provider packages; test each provider independently |
| Research orchestration | Pitfall 2: Stream cleanup on unmount; Pitfall 3: JSON parse failures | Design AbortController integration from the start; use `generateObject` for structured output |
| Middleware/authorization | Pitfall 15: Complex auth logic in middleware | Design composable middleware with proper HMAC/JWT before implementation |
| File upload/knowledge base | Pitfall 13: Serverless payload limits | Set explicit size limits; use Node.js runtime; test with real files |
| Search provider integration | Pitfall 10: Sequential vs parallel execution | Design concurrency from the start; rate-limit per provider |
| PWA/service worker | Pitfall 18: Stale cache after redeployment | Design versioning and cache-busting strategy with Serwist |

## Rewrite-Specific Pitfalls (Unique to Starting Over)

### Pitfall R1: Reimplementing Existing Subtle Fixes

**What goes wrong:** The existing codebase has accumulated subtle fixes for edge cases: OpenAI's Chinese context markdown reference bracket issue (the `replaceAll("【", "[")` in `index.ts`), Gemini grounding metadata processing, Ollama's credential stripping. The rewrite will lose these fixes if they are not explicitly catalogued.
**Prevention:** Before deleting the old codebase, extract and document every provider-specific workaround. Create a test suite that verifies these edge cases against the new implementation. The CONCERNS.md file is a start but does not capture all workarounds.

### Pitfall R2: Rewriting Without a Working Reference

**What goes wrong:** Starting the rewrite before having a fully documented feature set means features are forgotten or reimplemented incorrectly. The existing codebase is the only reference for behavior that users expect.
**Prevention:** The existing codebase should remain accessible (on a branch) during the rewrite. Create a feature checklist from the existing implementation BEFORE writing new code. Test new code against the old behavior for critical paths (research orchestration, search, report generation).

### Pitfall R3: Over-Engineering the Rewrite

**What goes wrong:** In response to the technical debt, the rewrite goes too far: 15-layer abstraction, plugin systems, event buses, over-generic provider interfaces. The result is code that is harder to understand than the original 3000-line component.
**Prevention:** Apply the 300-line limit pragmatically. Extract components and modules when there is a clear reason (reuse, testability, independent state changes), not just to hit a number. Prefer composition over abstraction. A 200-line file with clear logic is better than 5 files with an abstract factory pattern.

## Sources

- Vercel AI SDK generating-text documentation (verified 2026-03-31): https://sdk.vercel.ai/docs/ai-sdk-core/generating-text -- MEDIUM confidence (official docs, page live but URL structure may change)
- Vercel AI SDK providers and models documentation (verified 2026-03-31): https://sdk.vercel.ai/docs/foundations/providers-and-models -- HIGH confidence (official docs, lists all provider packages including `@ai-sdk/deepseek`, `@openrouter/ai-sdk-provider`)
- Existing codebase analysis: `.planning/codebase/CONCERNS.md` -- HIGH confidence (direct code review)
- AI SDK provider-specific behavior (DeepSeek, OpenRouter, Groq): LOW confidence (training data only, not verified against current SDK versions)
- Next.js 15 breaking changes (async params, caching defaults): MEDIUM confidence (well-documented change, consistent across multiple sources)
- React 19 ref-as-prop change: MEDIUM confidence (official React 19 release notes)

---

*Pitfalls research: 2026-03-31*
