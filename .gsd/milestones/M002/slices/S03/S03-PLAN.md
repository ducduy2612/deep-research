# S03: Hook + UI: Interactive Research Flow Components

**Goal:** Wire up useResearch hook for multi-request SSE flow and build UI panels for each checkpoint.
**Demo:** After this: After this: user can enter topic → see streamed questions → edit and submit → see streamed plan → approve → see search results → add suggestion → generate final report

## Tasks
- [ ] **T08: Update useResearch hook for multi-phase flow** — Update useResearch hook to support multi-phase SSE flow:

1. Replace single `start()` with phase-specific actions:
   - `clarify(options)` — POST with phase=clarify, streams questions
   - `submitFeedbackAndPlan()` — reads questions+feedback from store, POST with phase=plan
   - `approvePlanAndResearch()` — reads plan from store, POST with phase=research
   - `requestMoreResearch()` — reads suggestion+plan+learnings from store, POST with phase=research again
   - `generateReport()` — reads plan+learnings+sources+images from store, POST with phase=report

2. Shared SSE connection logic stays in `connectSSE()` but accepts a phase parameter and builds phase-specific request bodies.

3. Timer management:
   - Start timer on first phase (clarify)
   - Don't stop timer between phases
   - Stop timer on completion or abort

4. History auto-save:
   - Save on completion (after report phase done event)
   - Don't save partial results yet (that's S04)

5. Keep backward compat: `start()` still works as single-request full pipeline

6. Update use-research tests for multi-phase flow
  - Estimate: 2 hours
  - Files: src/hooks/use-research.ts, src/hooks/__tests__/use-research.test.ts
  - Verify: pnpm vitest run src/hooks/__tests__/use-research.test.ts
- [ ] **T09: Create ClarifyPanel, PlanPanel, ResearchActions components** — Create three new UI components for the checkpoint panels:

1. **ClarifyPanel** (src/components/research/ClarifyPanel.tsx):
   - Shows streamed questions from store (step text for clarify step)
   - Editable markdown renderer (can edit the questions)
   - Feedback textarea
   - "Write Report Plan" button → calls submitFeedbackAndPlan()
   - Loading state while clarifying

2. **PlanPanel** (src/components/research/PlanPanel.tsx):
   - Shows streamed plan from store (step text for plan step)
   - Editable markdown renderer
   - "Start Research" button → calls approvePlanAndResearch()
   - "Rewrite Plan" button (resubmit with modified plan)
   - Loading state while planning

3. **ResearchActions** (src/components/research/ResearchActions.tsx):
   - Shows after search/analyze/review phase completes
   - Shows search result summaries (learnings count, sources count)
   - Suggestion textarea + "Continue Research" button → calls requestMoreResearch()
   - "Generate Report" button → calls generateReport()
   - Loading state while researching

All components:
- Use existing Obsidian Deep design tokens
- Stay under 300 lines each
- Use store selectors, not props
- Use next-intl for strings
  - Estimate: 2.5 hours
  - Files: src/components/research/ClarifyPanel.tsx, src/components/research/PlanPanel.tsx, src/components/research/ResearchActions.tsx
  - Verify: pnpm lint && pnpm build
- [ ] **T10: Wire panels into ActiveResearch layout** — Update the research page and ActiveResearch components to integrate the new checkpoint panels:

1. Update TopicInput to call `clarify()` instead of `start()`
2. Update ActiveResearch layout to show panels based on store state:
   - `clarifying` → show clarify streaming in center panel
   - `awaiting_feedback` → show ClarifyPanel
   - `planning` → show plan streaming in center panel
   - `awaiting_plan_review` → show PlanPanel
   - `searching/analyzing/reviewing` → show search progress (existing)
   - `awaiting_results_review` → show ResearchActions + existing results
   - `reporting` → show report streaming (existing)
   - `completed` → show final report (existing)
3. Update WorkflowProgress to reflect multi-phase states
4. Wire up timer to track total elapsed across all phases

The left panel (config) and right panel (sources) stay the same.
The center panel switches content based on the current state.
  - Estimate: 2 hours
  - Files: src/components/research/ActiveResearch.tsx, src/components/research/ActiveResearchCenter.tsx, src/components/research/TopicInput.tsx, src/components/research/WorkflowProgress.tsx
  - Verify: pnpm lint && pnpm build
- [ ] **T11: Add i18n strings and final lint/typecheck** — Add/update i18n messages for all new UI strings:

- ClarifyPanel labels, buttons, placeholders
- PlanPanel labels, buttons
- ResearchActions labels, buttons, placeholders
- Updated workflow progress step names
- Timer display for multi-phase flow

Run lint and type check to verify everything compiles.
  - Estimate: 1 hour
  - Files: src/messages/en.json, src/components/research/ClarifyPanel.tsx, src/components/research/PlanPanel.tsx, src/components/research/ResearchActions.tsx
  - Verify: pnpm lint && pnpm build
