---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Create SSE API route for research streaming

Build the /api/research/stream POST route that instantiates ResearchOrchestrator server-side with real SearchProvider from env, subscribes to all orchestrator events, and streams them as SSE to the client. Handle abort via request.signal, build provider configs + registry from env vars at request time, and apply domain filters + citation images post-search.

## Inputs

- `src/engine/research/orchestrator.ts`
- `src/engine/research/types.ts`
- `src/engine/search/factory.ts`
- `src/engine/search/types.ts`
- `src/engine/provider/registry.ts`
- `src/engine/provider/types.ts`
- `src/engine/search/domain-filter.ts`
- `src/engine/search/citation-images.ts`
- `src/lib/env.ts`
- `src/app/api/research/route.ts`

## Expected Output

- `src/app/api/research/stream/route.ts`
- `src/engine/research/__tests__/sse-route.test.ts`

## Verification

pnpm vitest run src/engine/research/__tests__/sse-route.test.ts && pnpm build

## Observability Impact

SSE route logs: provider creation, orchestrator start, each event forwarded, abort signal received. Structured logger used throughout. Failure returns SSE error event with code + message.
