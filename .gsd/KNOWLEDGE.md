# Knowledge Base

Lessons learned, patterns, and gotchas discovered during development.

## S01 — Foundation And Design System

### react-resizable-panels v4 API change
- shadcn CLI generates `resizable.tsx` using v3 imports (`PanelGroup`, `Panel`, `PanelResizeHandle`)
- v4 uses `Group`, `Panel`, `Separator` with `orientation` prop instead of `direction`
- Always check the installed package version after shadcn CLI scaffolding — generated code may lag behind the actual package API

### 500-line ESLint max-lines rule encourages component splits
- `eslint.config.mjs` sets `max-lines: ["error", { max: 500, skipBlankLines: true, skipComments: true }]`
- The design showcase page originally exceeded 500 lines and was split into `components-demo.tsx` and `data-components-demo.tsx`
- This is a pattern that will recur in settings and other complex UIs — plan component boundaries early

### Tailwind CSS variable strategy with Obsidian Deep
- All design tokens are raw hex values (not HSL channels) in CSS custom properties
- shadcn/ui expects `var(--background)` style CSS variables — both systems coexist through Tailwind's `extend.colors` mapping
- The `obsidian-*` namespace is for design-system-aware usage; the `background/foreground/card/popover` namespace is for shadcn/ui primitives

### localforage config is import-time side effect
- `storage.ts` calls `localforage.config()` at module level
- Any file importing from `storage.ts` triggers the config — this is intentional for simplicity but be aware if testing in environments without IndexedDB (SSR, Node)

## S02 — Provider Factory and AI Integration

### Zod v4 record() vs object() for partial maps
- `z.record(z.enum([...]), schema)` in Zod v4 requires ALL enum keys present — it does NOT model `Partial<Record<K, V>>`
- Use `z.object({ key1: schema.optional(), key2: schema.optional(), ... }).catchall(z.never())` instead
- The `.catchall(z.never())` ensures unknown keys are rejected, matching the typed partial behavior

### AI SDK v4 abort handling — no onAbort callback
- `streamText()` in AI SDK v4 has no dedicated `onAbort` callback
- Aborts surface through `onError` as a `DOMException` with `name === 'AbortError'`
- Route aborts in `onError`: check `error instanceof DOMException && error.name === 'AbortError'`, then call the user's `onAbort` handler instead of treating it as a real error

### AI SDK languageModel() template literal type constraint
- `registry.languageModel()` uses a template literal type that TypeScript can't satisfy with a runtime string variable
- Fix: use `registry.languageModel(modelString as \`${string}:${string}\`)` type assertion
- This is safe because `resolveModel` validates the format before calling

### Provider factory returns raw provider instance
- `createGoogleProvider` and `createOpenAICompatibleProvider` return the raw AI SDK provider instance (not a LanguageModel)
- Consumers call `.chat(modelId)` or `.languageModel(modelId)` to get a `LanguageModelV1`
- The registry handles this indirection — callers use `"provider:model"` strings

### API route env config at request time
- Provider configs (API keys from env) must be constructed inside the request handler, not at module level
- Module-level config crashes server startup when keys are missing; request-level config returns a proper 500 error
- The route in `/api/research/route.ts` builds a fresh registry per request from current env vars

## S03 — Research Engine Core

### Zod v4 record() with superRefine for partial enum maps
- `z.record(z.enum([...]), schema)` requires ALL enum keys present — use `z.record(z.string().superRefine(...), schema)` for partial maps
- This pattern is useful whenever you need `Partial<Record<K, V>>` behavior with runtime validation

### Mocking modules that create real registries in tests
- When code creates a provider registry internally (requiring real API keys), MockLanguageModelV1 can't be injected through the constructor
- Use `vi.mock()` at module level with a mutable `mockContainer` object referenced by hoisted factories
- The mockContainer pattern: define `{ current: {} }` outside `vi.hoisted()`, then set `.current` in `beforeEach()` — hoisted factories reference the container but read `.current` at call time

### Prompt template pure functions vs string interpolation
- Ported old template string constants into explicit pure functions with typed parameters
- Each function takes explicit inputs (no global state) — this makes prompts testable and composable
- `DEFAULT_PROMPTS` map + `resolvePrompt()` provides override resolution for SET-03 support

## S04 — Search Provider Integration

### Model-native search requires fresh provider instances
- Google grounding uses `useSearchGrounding: true` passed at model creation time, not at call time
- OpenAI's `webSearchPreview` is a tool created from an `openai` provider instance, not from the registry model
- You can't reuse the registry's pre-built model — you must create a new provider instance with the search-specific options
- This means ModelNativeSearchProvider needs the raw API key and base URL, not just a model string

### Brave provider dual-request pattern
- Brave has separate web search and image search endpoints — both GET requests
- Using `Promise.all` means if either request fails, both fail — consider `Promise.allSettled` for resilience in a future iteration
- The image endpoint returns `{ url, title }` (the image URL is in the `url` field, not a separate field)

### SearXNG scope-to-category mapping
- Self-hosted SearXNG maps search scope to specific categories and engines
- Academic scope → science category + scholarly engines (arxiv, google scholar)
- General scope → general category + mainstream engines (google, bing)
- Results include a `score` field from SearXNG — filtering at >= 0.0 removes the worst results; the plan used >= 0.5 for quality

### Domain filtering as post-processing, not inside providers
- Domain filtering and citation images are pure utility functions applied AFTER search results return
- Providers are single-responsibility: they normalize API responses to `SearchProviderResult`
- The caller (orchestrator or UI layer) applies domain filters and citation image toggle
- This keeps providers simpler and makes filtering behavior composable

## S05 — Core Research UI

### SSE over fetch+ReadableStream (not EventSource)
- EventSource only supports GET requests — cannot send a POST body with research config
- Use `fetch()` + `ReadableStream.getReader()` with a custom buffered SSE parser instead
- Split the parser into pure functions (`parseSSEChunk`, `createSSEBuffer`) for unit testing without network

### Settings store fire-and-forget persistence
- Use manual `localforage.setItem()` calls in store actions instead of Zustand's `persist` middleware
- Zustand persist middleware couples store lifecycle to async storage initialization, causing hydration mismatches in SSR
- Fire-and-forget writes are simpler and avoid the coupling — the `hydrate()` action is called explicitly on app startup

### Research store handleEvent() dispatcher pattern
- SSE streams produce a flat sequence of typed events — a single `handleEvent(event)` method is cleaner than 9+ individual action methods
- Each event type maps to focused internal state updates: step-start, step-delta, step-complete, step-error, progress, done, error, search-result, search-image
- The hook calls `store.handleEvent()` for each parsed SSE event, keeping the store as the single source of truth

### FilteringSearchProvider decorator for SSE route
- The SSE route wraps search providers with a `FilteringSearchProvider` that applies domain filters and citation-image filtering post-search
- This keeps the orchestrator decoupled from UI-specific filtering concerns
- The decorator pattern allows composing multiple filters without modifying provider internals

### Component line-count discipline with complex layouts
- 3-panel resizable ActiveResearch is split into 4 files: container (48 lines) + Left (185) + Center (208) + Right (108)
- The container only handles panel layout; each panel owns its data subscriptions and rendering
- The 500-line ESLint max-lines rule encourages splits for complex UIs

## S06 — Settings and History

### Test mocks should mirror real validation behavior
- When testing stores with Zod validation, the `storage.get` mock should accept a schema parameter and use `safeParse` to validate stored data
- This catches corruption-fallback bugs that simple `return storedData` mocks would miss
- Pattern: `mockStorage.get = vi.fn((key, schema) => schema.safeParse(storedData))`

### Inline sub-components for line-count control
- HistoryDialog uses inline sub-component functions (StatsRow, SessionCard, StatusBadge) defined in the same file
- This avoids creating separate files for small presentational pieces while staying under the 500-line ESLint limit
- Trade-off: these are not exported/reusable, but they keep related UI logic co-located

### Blur-save pattern for prompt overrides
- AdvancedTab's 8 prompt override textareas save on blur (not on keystroke) to avoid excessive persistence writes
- Each keystroke would trigger a store update → localforage write; blur-save batches edits into one write
- Empty string values delete the override key from the store, falling back to defaults

### History auto-save must not block research flow
- The auto-save in useResearch is wrapped in try/catch so any localforage failure is logged but never interrupts the SSE stream
- Empty promptOverrides are sent as undefined (not {}) in the SSE request body to avoid sending unnecessary JSON
- Session IDs use `topic + startedAt` for uniqueness without introducing UUID dependency

## S07 — Knowledge Base

### serverExternalPackages for native ESM packages
- `officeparser` and `pdfjs-dist` have ESM/CJS interop issues when bundled by Next.js Turbopack
- Adding them to `serverExternalPackages` in `next.config.ts` tells Next.js to resolve them at runtime instead of bundling
- This pattern will apply to any Node-native or ESM-heavy package used in API routes

### officeparser v6 API breaking change from older docs
- v6 uses `OfficeParser.parseOffice(buffer)` returning an AST object with `.toText()` method
- Older docs/examples show `parseOfficeAsync(buffer, callback)` — this no longer exists
- Always check the installed version's actual exports before implementing integration code

### Lazy dynamic import for heavy store dependencies
- knowledge-store imports fuse.js which can cause dual-React issues in jsdom test environments
- Solution: lazy `await import()` in the consumer (use-research.ts) instead of static import
- This keeps fuse.js out of the hot module path and avoids test environment conflicts

### pnpm strict hoisting breaks jsdom tests
- pnpm strict mode doesn't hoist react/react-dom to the root, causing dual-React errors in jsdom
- Fix: `.npmrc` with `public-hoist-pattern[]=react`, `public-hoist-pattern[]=react-dom`, `public-hoist-pattern[]=use-sync-external-store`
- Also add `resolve.alias` in vitest.config.ts to force single React instance resolution

### Sequential file processing for multi-file uploads
- FileUpload processes dropped files one at a time instead of parallel to avoid server overload
- Parallel uploads to the parse API route could exhaust server resources on large PDFs
- Sequential is slightly slower for small files but much safer for production use

### Fuse.js index per-search vs cached
- Rebuilding the Fuse.js index on every search call is simpler and avoids stale-index bugs
- With 200 max items and 10K char chunks, the rebuild cost is negligible (< 1ms)
- Cached indexes need invalidation logic on every add/remove/update — not worth the complexity

## S08 — CORS Proxy Mode

### Factory pattern with DI for middleware handlers
- Each handler uses `createXxxHandler(deps)` factory for testability + a default export reading from process.env
- Tests inject mock env vars through the factory; production code uses the default export
- This pattern avoids module-level env coupling and enables pure unit tests without process.env mocking

### compose() chains right-to-left like Redux middleware
- Handlers execute left-to-right in usage order, but compose() builds the chain right-to-left
- The terminal `next()` callback returns `NextResponse.next()` — handlers that don't return a Response continue the chain
- Returning `undefined` from the top-level middleware function is the Next.js passthrough signal

### store.getState() vs hooks inside async callbacks
- FileUpload and UrlCrawler use `useSettingsStore.getState()` inside async fetch callbacks (not React hooks)
- React hooks can't be called inside async callbacks — they must be called at component top level
- use-research.ts reads via hooks at component level, then passes values into the connectSSE closure
- Rule: use hooks at component level, pass values into async code; use getState() only when hooks are unavailable

### ts-md5 for signature compatibility with v0
- The v0 codebase uses `Md5.hashStr(password + "::" + timestamp.toString().substring(0, 8))` for HMAC-style auth
- ts-md5's `Md5.hashStr()` returns `string | Int32Array` — cast with `as string` for the hex digest
- Timestamp is truncated to first 8 digits for centisecond precision — this is intentional, not a bug
- Both client and server must use the exact same algorithm or signatures won't match

### Middleware must not consume request body
- Next.js Edge middleware reading `request.json()` prevents route handlers from reading the body
- Use URL-based routing only (pathname, query params, headers) for middleware decisions
- This is a hard constraint of the Next.js middleware architecture

## S09 — PWA, i18n, and Polish

### Serwist + next-intl plugin composition order matters
- Wrap order must be `withSerwist(withNextIntl(nextConfig))` — Serwist outer, next-intl inner
- Reversing the order causes build failures because Serwist needs to see the final webpack config
- Both plugins mutate the config, so composition order is critical

### Serwist requires explicit `serwist` dependency alongside `@serwist/next`
- `@serwist/next` does not re-export the types needed by `sw.ts` (e.g., `defaultCache`)
- Install `serwist` as a separate dependency to get the worker types
- Without it, TypeScript compilation of the service worker entry fails

### Next.js 15 moves themeColor from metadata to viewport export
- Next.js 15 emits a build warning if `themeColor` is in `metadata` instead of `viewport`
- Move it to the `viewport` export to silence the warning and follow the new convention

### Cookie-based i18n avoids route restructuring
- next-intl supports cookie-based locale detection via `getRequestConfig()` reading `NEXT_LOCALE` cookie
- This avoids the need to restructure routes under `[locale]` segments
- The settings store syncs locale changes to the cookie; layout reads locale server-side via `getLocale()`

### Ghost border token naming gap in Tailwind config
- Components using `border-obsidian-border/50` were silently not resolving because the token didn't exist
- Always verify that Tailwind class names used in components have corresponding entries in the config
- Added `border` alias under `obsidian` colors in tailwind.config.ts for backward compatibility

## M001 Cross-Cutting Lessons

### State machine pattern pays dividends
- The 10-state ResearchOrchestrator with strict transition enforcement caught several bugs during development where code tried invalid transitions
- Framework-agnostic design meant the orchestrator could be fully tested in Node.js without React — tests run fast and don't need jsdom
- The typed event emitter (ResearchEventMap) with discriminated unions ensured consumers couldn't subscribe to wrong event types

### Barrel exports scale well across 4 engine modules
- Each engine module (provider, research, search, knowledge) has index.ts barrel exports defining its public API
- This pattern made cross-module imports clean: `import { createProvider } from '@/engine/provider'`
- Internal implementation files are never imported directly by consumers

### 500-line ESLint max-lines encourages good architecture
- The ESLint rule against files over 500 lines (skipBlankLines, skipComments) prevents monolithic components from forming
- ActiveResearch split into 4 files (container + 3 panels) naturally; same with settings (6 focused components)
- The limit is a forcing function for single-responsibility — embrace it rather than fight it

### Test count as progress indicator
- Each slice added tests monotonically: S01(0) → S02(63) → S03(82) → S04(115) → S05(345) → S06(378) → S07(439) → S08(498) → S09(498)
- Total of 498 tests across 24 files provides strong regression protection
- Tests caught breaking changes during S08-S09 polish passes that would have been hard to find manually

### Design system tokens must be verified visually
- Automated tests confirm tokens exist, but browser screenshots catch visual regressions (wrong surface levels, missing borders)
- The /design showcase page was invaluable as a visual reference during development
- Keep it in the codebase even though it's not a production route

## M002 — Interactive Multi-Phase Research

### S01 — Engine + API

#### z.union over z.discriminatedUnion for multi-variant SSE request schemas
- Zod v4's `z.discriminatedUnion()` requires a shared discriminator field but validates ALL variant schemas for non-matching values, which can cause unexpected field leakage
- Use `z.union([schemaA, schemaB, ...]).or(schemaC)` instead — each variant validates independently and the fallback behavior is predictable
- In the SSE route, this prevented phase-specific fields (like `questions`, `feedback`) from leaking through as valid `full`-phase requests

#### Phase methods create their own AbortController
- Each orchestrator phase method (`clarifyOnly`, `planWithContext`, `researchFromPlan`, `reportFromLearnings`) creates its own AbortController
- This means phases execute independently — aborting one doesn't affect another
- The `start()` convenience method still uses a single shared controller for backward compat

#### SSE route shared helpers reduce phase handler duplication
- Extract `resolveProviderConfigs`, `buildSearchProvider`, `createSSEStream`, `subscribeOrchestrator`, `cleanup` as shared helpers
- Each phase handler is ~40 lines (down from duplicated 60+ line blocks)
- The pattern: parse request → build config → create orchestrator → subscribe events → return stream

### S03 — Hook + UI: Interactive Research Flow Components

#### Store done handler must skip completed transition for awaiting_* states
- The research store's done handler transitions to `completed` by default, but for multi-phase flow, `awaiting_feedback`, `awaiting_plan_review`, and `awaiting_results_review` states need to stay at those states when the SSE stream ends
- Without this guard, the done event from clarify phase would jump straight to `completed` instead of staying at `awaiting_feedback`

#### connectSSE generic body + isReportPhase flag over per-phase connectors
- Instead of duplicating SSE connection logic per phase, connectSSE accepts a generic request body and a boolean flag for report-phase auto-save
- Each phase action (clarify, submitFeedbackAndPlan, etc.) builds its own body then calls connectSSE

#### Prop-threaded callbacks over shared context for multi-phase actions
- Phase action callbacks (clarify, submitFeedbackAndPlan, etc.) are destructured from useResearch in page.tsx and threaded through ActiveResearch → ActiveResearchCenter via props
- Avoids dual hook instances and keeps the data flow explicit — no hidden context subscription

#### Editable markdown toggle (preview ↔ raw textarea) over contentEditable
- ClarifyPanel and PlanPanel use a toggle between MarkdownRenderer preview and a raw textarea for editing
- contentEditable was considered but rejected — it's inconsistent across browsers and hard to control layout for streaming markdown content

#### WorkflowProgress state-aware icons (Pause for awaiting, Loader2 for streaming)
- Multi-phase states get visual differentiation: Pause icon in amber for awaiting-user-input states, Loader2 in primary for streaming/active states
- Makes it immediately clear when the user needs to take action vs when the system is working

## M003 — Checkpointed Workspace Model

### AI SDK v6 breaking changes from v4

The following API changes were encountered when upgrading beyond AI SDK v4:
- `ModelMessage` → `CoreMessage` in streaming and orchestrator code
- `usage.inputTokens/outputTokens` → `usage.promptTokens/completionTokens`
- `generateText({ output: ... })` → `generateText({ experimental_output: ... })`
- `result.output` → `result.experimental_output`
- Stream chunk `part.text` → `part.textDelta`
- `"reasoning-delta"` → `"reasoning"` stream part type
- Google search grounding: no longer a `google.tools.googleSearch({})` tool — use `useSearchGrounding: true` model option, with sources from `providerMetadata.google.groundingChunks`

### Freeze test activity log search specificity

When testing freeze() by checking the activity log for frozen events, use the specific prefix `"Checkpoint frozen: {phase}"` rather than just the phase name. Searching for `"clarify"` matches "Starting clarify step" before the freeze entry, causing false positives.

### Persist schema extracted to separate file

The research store's persistence schemas (Zod schemas for saved state) were extracted to `research-store-persist.ts` to keep the main store file under 500 lines (ESLint max-lines rule). This is a pattern worth repeating for other stores that grow large.
