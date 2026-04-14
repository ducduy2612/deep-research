# S03: UI cleanup + start() removal

**Goal:** Remove all dead code and stale references to the deleted start() method and full phase from the codebase. The codebase should have zero references to start() (beyond test utilities), zero references to phase "full" in production logic, and StartOptions renamed to ClarifyOptions for clarity.
**Demo:** No start() anywhere in the codebase, all entry points use clarify(), dead code removed

## Must-Haves

- No `d.phase === "full"` anywhere in src/stores/research-store-events.ts
- No `start()` references in production code (only test utilities)
- No `StartOptions` anywhere — all renamed to `ClarifyOptions`
- All 823+ tests pass
- Clean build with no type errors

## Proof Level

- This slice proves: contract

## Integration Closure

none — pure cleanup, no integration boundaries changed

## Verification

- none

## Tasks

- [x] **T01: Remove dead code, stale references, and rename StartOptions → ClarifyOptions** `est:20m`
  Remove the dead `d.phase === "full"` condition from research-store-events.ts, update stale test name and comment in orchestrator.test.ts, and rename StartOptions to ClarifyOptions across use-research.ts, TopicInput.tsx, and page.tsx.
  - Files: `src/stores/research-store-events.ts`, `src/engine/research/__tests__/orchestrator.test.ts`, `src/hooks/use-research.ts`, `src/components/research/TopicInput.tsx`, `src/app/page.tsx`
  - Verify: pnpm test --run && pnpm build

## Files Likely Touched

- src/stores/research-store-events.ts
- src/engine/research/__tests__/orchestrator.test.ts
- src/hooks/use-research.ts
- src/components/research/TopicInput.tsx
- src/app/page.tsx
