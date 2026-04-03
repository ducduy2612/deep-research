# M002: 

## Vision
Replace the current fire-and-forget research pipeline with an interactive, checkpointed flow modeled after the original v0 app. Users should be able to review and provide input at key stages: after clarification questions, after report plan generation, and after search/analysis results before the final report. The research process becomes a multi-request conversation between client and server rather than a single continuous SSE stream.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Engine + API: Multi-Phase Orchestrator & SSE Routes | high | — | ✅ | After this: can POST to /api/research/stream with phase=clarify, get streamed questions, then POST with phase=plan to get plan, etc. Unit tests pass. |
| S02 | State: Research Store Multi-Phase State Machine | medium | S01 | ✅ | After this: research store correctly tracks idle→clarifying→awaiting_feedback→planning→awaiting_plan_review→researching→awaiting_results_review→reporting→completed |
| S03 | Hook + UI: Interactive Research Flow Components | medium | S01, S02 | ✅ | After this: user can enter topic → see streamed questions → edit and submit → see streamed plan → approve → see search results → add suggestion → generate final report |
| S04 | Polish: Persistence, Edge Cases, and Browser Verification | low | S03 | ✅ | After this: full interactive flow works in browser. Refresh mid-research preserves state. Abort at any phase works cleanly. |
