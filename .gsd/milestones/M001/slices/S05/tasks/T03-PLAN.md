---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T03: Build useResearch hook with SSE client and abort lifecycle

Create the useResearch hook that connects the SSE API route to the research Zustand store. Uses fetch() with ReadableStream to consume SSE events (POST with ResearchConfig body), dispatches events to the store (step-start, step-delta, step-complete, step-error, progress), manages AbortController lifecycle (start/abort/destroy on unmount), tracks elapsed time via setInterval, and handles connection errors with retry capability.

## Inputs

- `src/stores/research-store.ts`
- `src/stores/settings-store.ts`
- `src/stores/ui-store.ts`
- `src/engine/research/types.ts`
- `src/app/api/research/stream/route.ts`

## Expected Output

- `src/hooks/use-research.ts`
- `src/hooks/__tests__/use-research.test.ts`

## Verification

pnpm vitest run src/hooks/ && pnpm build

## Observability Impact

Hook logs: SSE connection opened, event received (type + step), abort triggered, unmount cleanup. Timer starts on research start, stops on complete/abort/error.
