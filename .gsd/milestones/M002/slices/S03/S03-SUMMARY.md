---
id: S03
parent: M002
milestone: M002
provides:
  - Interactive multi-phase research UI with checkpoint panels for clarification, plan review, and results review
  - Phase-specific actions wired from UI through hook to SSE API
  - State-routed center panel that switches content based on research phase
requires:
  - slice: S01
    provides: Multi-phase orchestrator phases and SSE routes
  - slice: S02
    provides: Research store multi-phase state machine with checkpoint states
affects:
  - S04
key_files:
  - src/hooks/use-research.ts
  - src/hooks/__tests__/use-research-multi-phase.test.ts
  - src/components/research/ClarifyPanel.tsx
  - src/components/research/PlanPanel.tsx
  - src/components/research/ResearchActions.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/WorkflowProgress.tsx
  - src/components/research/ActiveResearch.tsx
  - src/app/page.tsx
  - src/stores/research-store.ts
  - src/stores/__tests__/research-store-multi-phase.test.ts
  - src/stores/__tests__/research-store-checkpoints.test.ts
  - messages/en.json
  - messages/vi.json
key_decisions:
  - Store done handler skips completed transition for awaiting_* states to preserve multi-phase checkpoints
  - connectSSE accepts generic body + isReportPhase flag instead of per-phase connectors
  - Prop-threaded callbacks from page.tsx through ActiveResearch to center panel (no shared context)
  - Editable markdown uses toggle between MarkdownRenderer preview and raw textarea (not contentEditable)
  - WorkflowProgress uses Pause/amber for awaiting-user states vs Loader2/primary for streaming states
patterns_established:
  - Phase-specific SSE actions with shared connectSSE() connector
  - State-routed center panel content in ActiveResearch
  - Editable markdown toggle pattern (preview ↔ textarea)
  - Store handler phase-awareness (start/done/result respect multi-phase state machine)
observability_surfaces:
  - WorkflowProgress state-aware icons visually distinguish streaming from awaiting-user-input states
drill_down_paths:
  - milestones/M002/slices/S03/tasks/T08-SUMMARY.md
  - milestones/M002/slices/S03/tasks/T09-SUMMARY.md
  - milestones/M002/slices/S03/tasks/T10-SUMMARY.md
  - milestones/M002/slices/S03/tasks/T11-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-02T11:21:27.538Z
blocker_discovered: false
---

# S03: Hook + UI: Interactive Research Flow Components

**Wired multi-phase SSE actions into useResearch hook and built ClarifyPanel, PlanPanel, and ResearchActions checkpoint UI components, integrated into ActiveResearch with state-routed center content.**

## What Happened

S03 built the interactive research flow UI layer on top of the S01 engine and S02 state machine. Four tasks executed sequentially:

**T08 — Phase-specific SSE actions:** Updated useResearch hook with five new actions (clarify, submitFeedbackAndPlan, approvePlanAndResearch, requestMoreResearch, generateReport). The shared connectSSE() was generalized to accept a phase-specific request body and an isReportPhase flag. Research store handlers were made phase-aware: start only resets for full/clarify phases; done skips completed transition for awaiting_* states; result transitions to reporting state so done knows to finalize. Tests split into two files (332 + 394 lines) for ESLint compliance. 34 tests pass.

**T09 — Checkpoint UI components:** Built ClarifyPanel (188 lines), PlanPanel (178 lines), and ResearchActions (188 lines). Each uses store selectors for data, action callbacks via props, editable markdown toggle (preview ↔ textarea), and Obsidian Deep design tokens. i18n keys added to en.json and vi.json.

**T10 — Integration wiring:** Updated ActiveResearchCenter to route center content by research state (clarifying → streaming text, awaiting_feedback → ClarifyPanel, etc.). TopicInput switched from start() to clarify(). WorkflowProgress updated with state-aware icons (Pause/amber for awaiting, Loader2/primary for streaming). Callbacks prop-threaded from page.tsx through ActiveResearch to center panel. Split oversized research-store.test.ts into 3 files. Lint and build pass clean.

**T11 — i18n cleanup:** Added "preview" i18n key to both ClarifyPanel and PlanPanel namespaces, replacing the last two hardcoded English strings. Lint and build pass clean.

## Verification

T08: 34 hook tests + 62 store tests all passing. T09: ESLint clean, tsc --noEmit clean, JSON validation passed. T10: pnpm lint + pnpm build both clean, 73 research store tests pass. T11: pnpm lint + pnpm build both clean.

## Requirements Advanced

- R032 — Multi-phase SSE actions (clarify, plan, research, report) wired through useResearch hook
- R033 — ClarifyPanel, PlanPanel, ResearchActions checkpoint components provide interactive review/edit at each stage
- R034 — State-routed ActiveResearchCenter switches between streaming views and checkpoint panels based on research state

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

S04 covers persistence, edge cases, and browser verification of the full interactive flow.

## Files Created/Modified

- `src/hooks/use-research.ts` — Added phase-specific SSE actions (clarify, submitFeedbackAndPlan, approvePlanAndResearch, requestMoreResearch, generateReport) with generalized connectSSE
- `src/hooks/__tests__/use-research-multi-phase.test.ts` — New test file for multi-phase hook actions
- `src/components/research/ClarifyPanel.tsx` — New checkpoint panel for clarification questions with editable markdown and feedback input
- `src/components/research/PlanPanel.tsx` — New checkpoint panel for plan review with edit/approve/rewrite actions
- `src/components/research/ResearchActions.tsx` — New checkpoint panel for results review with continue/generate report actions
- `src/components/research/ActiveResearchCenter.tsx` — State-routed center content switching between checkpoint panels based on research phase
- `src/components/research/WorkflowProgress.tsx` — Added state-aware icons (Pause/amber for awaiting, Loader2/primary for streaming)
- `src/components/research/ActiveResearch.tsx` — Prop-threaded action callbacks from parent to center panel
- `src/app/page.tsx` — Destructured and threaded multi-phase action callbacks to ActiveResearch
- `src/stores/research-store.ts` — Phase-aware start/done/result handlers for multi-state transitions
- `src/stores/__tests__/research-store-multi-phase.test.ts` — New test file for multi-phase store transitions
- `src/stores/__tests__/research-store-checkpoints.test.ts` — New test file for checkpoint state transitions
- `messages/en.json` — Added i18n keys for ClarifyPanel, PlanPanel, ResearchActions, WorkflowProgress
- `messages/vi.json` — Added Vietnamese translations for new UI strings
