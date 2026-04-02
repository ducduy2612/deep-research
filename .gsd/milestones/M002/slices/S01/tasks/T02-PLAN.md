---
estimated_steps: 23
estimated_files: 1
skills_used: []
---

# T02: Update SSE route for multi-phase streaming

Refactor /api/research/stream to accept a `phase` parameter:

```
phase: 'clarify' | 'plan' | 'research' | 'report' | 'full'
```

Phase-specific request schemas:
- **clarify**: `{ phase: 'clarify', topic, providers?, search? }`
- **plan**: `{ phase: 'plan', topic, questions, feedback, providers? }`
- **research**: `{ phase: 'research', plan, providers?, search? }`
- **report**: `{ phase: 'report', plan, learnings, sources, images, providers?, reportStyle?, reportLength? }`
- **full**: existing behavior (backward compat)

Each phase:
1. Creates orchestrator with correct config
2. Calls the appropriate phase method
3. Subscribes to events and streams as SSE
4. Emits phase-specific result event before `done`
5. Closes connection

The `full` phase preserves current behavior for backward compatibility.

SSE event additions:
- `clarify-result`: `{ questions: string }`
- `plan-result`: `{ plan: string }`
- `research-result`: `{ learnings: string[], sources: Source[], images: ImageSource[] }`
- `result`: existing (final report result)

Move shared code (buildClientProviderConfigs, buildSearchProvider, etc.) into helper functions to reduce duplication across phase handlers.

## Inputs

- `src/app/api/research/stream/route.ts`
- `src/engine/research/orchestrator.ts`

## Expected Output

- `Updated SSE route with phase parameter support`

## Verification

pnpm vitest run src/engine/research/__tests__/sse-route.test.ts
