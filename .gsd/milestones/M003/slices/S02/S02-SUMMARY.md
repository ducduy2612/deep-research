---
id: S02
parent: M003
milestone: M003
provides:
  - PhaseAccordion component: Radix accordion with frozen/active/pending rendering, summary badges, read-only frozen content, active glow
  - freeze() wiring: ClarifyPanel Submit → freeze('clarify'), PlanPanel Approve → freeze('plan')
  - ActiveResearchCenter as thin wrapper around PhaseAccordion (error banner + accordion + idle state)
  - 9 unit tests covering all PhaseAccordion rendering states
requires:
  - slice: S01
    provides: Store checkpoints{} + workspace{} separation, freeze() action, checkpoint types
affects:
  - S03
  - S04
key_files:
  - src/components/research/PhaseAccordion.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/ClarifyPanel.tsx
  - src/components/research/PlanPanel.tsx
  - src/components/research/__tests__/phase-accordion.test.tsx
  - messages/en.json
  - messages/vi.json
  - vitest.config.ts
key_decisions:
  - Render props pattern for PhaseAccordion (onRenderClarify, onRenderPlan, etc.) keeps it as a layout shell — no direct imports of phase panels
  - PHASE_CONFIG array as single source of truth for phase metadata (activeStates, summary getters, frozen content getters)
  - Kept renderStreamingView() as local helper in ActiveResearchCenter, passed via onRenderStreaming render prop
  - vi.hoisted() for mutable mock store state referenced by hoisted vi.mock() factories — necessary for Zustand store mocking in component tests
patterns_established:
  - PHASE_CONFIG array pattern for declarative phase-to-state mapping — reusable for any component that needs phase metadata
  - Render props for accordion content injection — PhaseAccordion owns layout/visual state, parent owns workspace content
  - vi.hoisted() + mutable container for Zustand mock state in component tests
observability_surfaces:
  - none
drill_down_paths:
  - milestones/M003/slices/S02/tasks/T01-SUMMARY.md
  - milestones/M003/slices/S02/tasks/T02-SUMMARY.md
  - milestones/M003/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T15:58:06.010Z
blocker_discovered: false
---

# S02: Phase Freeze UX — Accordion Layout

**Radix accordion layout with collapsed frozen phases (summary badges, read-only MarkdownRenderer) and expanded active workspace (primary-color glow), plus freeze() wiring in ClarifyPanel/PlanPanel.**

## What Happened

Three tasks delivered the accordion-based phase freeze UX:

**T01 — PhaseAccordion component**: A 296-line Radix Accordion (type=multiple) that renders 4 phase items (clarify, plan, research, report). Each phase has 3 visual states: frozen (✅ Check icon + contextual summary badge + read-only MarkdownRenderer at opacity-60), active (primary-color header + ring-1 ring-obsidian-primary-deep/20 glow + live workspace content), and pending (muted disabled styling). A PHASE_CONFIG array maps each phase to its activeStates[], summary getter, and frozen content getter — single source of truth for phase metadata. i18n keys added to en.json and vi.json.

**T02 — Wiring freeze() and replacing ActiveResearchCenter**: ClarifyPanel's handleSubmit now calls store.freeze('clarify') before the parent callback. PlanPanel's handleApprove calls store.freeze('plan') before navigation. ActiveResearchCenter was rewritten from a 200+ line switch-based router into a 178-line thin wrapper: error banner + connection-interrupted banner + PhaseAccordion + idle state. The renderCenterContent() switch and STREAMING_STATES constant were removed. PhaseAccordion receives render props (onRenderClarify, onRenderPlan, onRenderStreaming, etc.) for each phase's active workspace content.

**T03 — PhaseAccordion unit tests**: 9 tests covering idle state (pending badges), clarify active, clarify frozen + plan active, frozen read-only content expansion, plan frozen + research active, all phases frozen (completed), research summary from live store data, empty checkpoint data, and missing searchTasks. Required vitest infrastructure additions: @vitejs/plugin-react for JSX transform, @testing-library/jest-dom for DOM matchers, and vitest.config.ts update for .test.tsx files. Uses vi.hoisted() pattern for mutable mock store state referenced by hoisted vi.mock() factories.

## Verification

PhaseAccordion tests: 9/9 pass. Full suite (excluding pre-existing orchestrator failures): 639/639 pass. Build: TypeScript compilation clean for all S02 files. Line counts: PhaseAccordion 296, ActiveResearchCenter 178, ClarifyPanel 192, PlanPanel 182 — all under 300-line ESLint limit. grep confirms freeze('clarify') in ClarifyPanel, freeze('plan') in PlanPanel, PhaseAccordion in ActiveResearchCenter, renderCenterContent removed. Pre-existing orchestrator.test.ts failures (39 tests) confirmed identical on main branch — MockLanguageModelV1 constructor issue from AI SDK v6 upgrade, not a regression.

## Requirements Advanced

- R055 — Accordion layout with collapsed frozen phases (summary badges) and expanded active workspace (primary glow) implemented in PhaseAccordion
- R056 — ClarifyPanel Submit calls freeze('clarify'), PlanPanel Approve calls freeze('plan') — explicit user-driven freeze
- R062 — Frozen phases show ✅ Check icon + muted opacity-60 styling; active phase shows ring-1 ring-obsidian-primary-deep/20 glow

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T03 added @vitejs/plugin-react and @testing-library/jest-dom devDependencies plus vitest.config.ts changes — infrastructure needed for React component testing not anticipated in the plan.

## Known Limitations

None for S02 scope. Pre-existing build failure in streaming.ts (CoreMessage import) and 39 orchestrator test failures are from AI SDK v6 upgrade in S01, outside S02 scope.

## Follow-ups

None.

## Files Created/Modified

- `src/components/research/PhaseAccordion.tsx` — New 296-line Radix Accordion with frozen/active/pending rendering, summary badges, read-only MarkdownRenderer, active glow
- `src/components/research/ActiveResearchCenter.tsx` — Rewritten from switch-based router to 178-line thin wrapper with PhaseAccordion
- `src/components/research/ClarifyPanel.tsx` — Added freeze('clarify') call in handleSubmit before parent callback
- `src/components/research/PlanPanel.tsx` — Added freeze('plan') call in handleApprove before parent callback
- `src/components/research/__tests__/phase-accordion.test.tsx` — New 9-test suite covering all PhaseAccordion rendering states
- `messages/en.json` — Added PhaseAccordion i18n namespace with phase headers, summary badges, status labels
- `messages/vi.json` — Added matching Vietnamese translations
- `vitest.config.ts` — Added .test.tsx include pattern and @vitejs/plugin-react for JSX transform
