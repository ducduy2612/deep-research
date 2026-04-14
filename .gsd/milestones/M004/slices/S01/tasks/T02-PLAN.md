---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Remove full pipeline from SSE route, add review phase, change maxDuration to 300

In route.ts: change maxDuration from 800 to 300, remove fullSchema/handleFullPhase/Phase 'full' case, add reviewSchema (fields: phase='review', plan, learnings, sources, images, optional suggestion), add handleReviewPhase that calls orchestrator.reviewOnly(), update requestSchema union to include reviewSchema, update Phase type to remove 'full' and add 'review', update default case to return error instead of falling through to full.

## Inputs

- ``src/app/api/research/stream/route.ts` — fullSchema, handleFullPhase, maxDuration, requestSchema, Phase type`
- ``src/engine/research/orchestrator.ts` — reviewOnly() from T01`

## Expected Output

- ``src/app/api/research/stream/route.ts` — maxDuration=300, no fullSchema/handleFullPhase, reviewSchema/handleReviewPhase added`

## Verification

pnpm test -- --run src/engine/research/__tests__/sse-route.test.ts 2>&1 | tail -5

## Observability Impact

Review phase handler logs review stream start/completion. No full pipeline fallback logging.
