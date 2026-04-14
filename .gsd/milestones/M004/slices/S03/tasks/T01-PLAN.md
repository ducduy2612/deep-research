---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T01: Remove dead code, stale references, and rename StartOptions → ClarifyOptions

Remove the dead `d.phase === "full"` condition from research-store-events.ts, update stale test name and comment in orchestrator.test.ts, and rename StartOptions to ClarifyOptions across use-research.ts, TopicInput.tsx, and page.tsx.

## Inputs

- ``src/stores/research-store-events.ts` — dead `d.phase === "full"` condition at line 127`
- ``src/engine/research/__tests__/orchestrator.test.ts` — stale test name at line 786, stale comment at line 195`
- ``src/hooks/use-research.ts` — StartOptions interface at line 37, used at lines 46 and 281`
- ``src/components/research/TopicInput.tsx` — imports StartOptions at line 16, uses at line 24`
- ``src/app/page.tsx` — references StartOptions import at line 118`

## Expected Output

- ``src/stores/research-store-events.ts` — dead condition removed`
- ``src/engine/research/__tests__/orchestrator.test.ts` — test name and comment updated`
- ``src/hooks/use-research.ts` — StartOptions renamed to ClarifyOptions`
- ``src/components/research/TopicInput.tsx` — import and usage updated to ClarifyOptions`
- ``src/app/page.tsx` — import type updated to ClarifyOptions`

## Verification

pnpm test --run && pnpm build
