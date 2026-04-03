---
estimated_steps: 31
estimated_files: 3
skills_used: []
---

# T02: Wire freeze() into ClarifyPanel/PlanPanel and integrate PhaseAccordion into ActiveResearchCenter

Add freeze() calls to ClarifyPanel's Submit button and PlanPanel's Approve button. Replace ActiveResearchCenter's renderCenterContent() switch with PhaseAccordion component. Verify all existing tests still pass.

Steps:
1. In `src/components/research/ClarifyPanel.tsx`, modify handleSubmit callback:
   - Import useResearchStore if not already imported (it is)
   - Add `const freeze = useResearchStore((s) => s.freeze)` selector
   - In handleSubmit, call `freeze('clarify')` before `onSubmitFeedbackAndPlan()`
   - This ensures the clarify phase checkpoint is created before transitioning to plan

2. In `src/components/research/PlanPanel.tsx`, modify handleApprove callback:
   - Import useResearchStore if not already imported (it is)
   - Add `const freeze = useResearchStore((s) => s.freeze)` selector
   - In handleApprove, call `freeze('plan')` before `onApprovePlanAndResearch()`
   - This ensures the plan phase checkpoint is created before transitioning to research

3. In `src/components/research/ActiveResearchCenter.tsx`, replace the switch-based routing:
   - Import PhaseAccordion from './PhaseAccordion'
   - Remove renderCenterContent() function entirely
   - Remove renderStreamingView() function (move its logic into PhaseAccordion or keep as helper)
   - Remove STEP_ORDER and STREAMING_STATES constants (moved to PhaseAccordion)
   - In the JSX, replace `{renderCenterContent()}` with `<PhaseAccordion>` component
   - Pass render callbacks: onRenderStreaming (the streaming view), onRenderResearchActions (ResearchActions), and action callbacks (onSubmitFeedbackAndPlan, onApprovePlanAndResearch, etc.)
   - Keep error display, connection-interrupted banner, and idle state at the top level
   - Keep the streaming header (currentLabel) if still needed, or move into PhaseAccordion

4. The PhaseAccordion should handle all content routing. ActiveResearchCenter becomes a thin wrapper: error banner + connection banner + PhaseAccordion + idle state.

5. Run all tests to ensure nothing broke.

Must-Haves:
- [ ] ClarifyPanel handleSubmit calls store.freeze('clarify') before parent callback
- [ ] PlanPanel handleApprove calls store.freeze('plan') before parent callback
- [ ] ActiveResearchCenter no longer has renderCenterContent() switch
- [ ] ActiveResearchCenter renders PhaseAccordion for content routing
- [ ] Error display, connection-interrupted banner, and idle state preserved
- [ ] All existing tests pass
- [ ] No component exceeds 300 lines

## Inputs

- `src/components/research/PhaseAccordion.tsx — new accordion component from T01`
- `src/components/research/ClarifyPanel.tsx — needs freeze() call in handleSubmit`
- `src/components/research/PlanPanel.tsx — needs freeze() call in handleApprove`
- `src/components/research/ActiveResearchCenter.tsx — needs PhaseAccordion integration`
- `src/stores/research-store.ts — store with freeze() action`

## Expected Output

- `src/components/research/ClarifyPanel.tsx — freeze('clarify') call added to handleSubmit`
- `src/components/research/PlanPanel.tsx — freeze('plan') call added to handleApprove`
- `src/components/research/ActiveResearchCenter.tsx — PhaseAccordion replaces renderCenterContent switch`

## Verification

pnpm vitest run — all tests pass. pnpm build — production build succeeds. grep -q 'freeze.*clarify' src/components/research/ClarifyPanel.tsx. grep -q 'freeze.*plan' src/components/research/PlanPanel.tsx. ! grep -q 'renderCenterContent' src/components/research/ActiveResearchCenter.tsx. grep -q 'PhaseAccordion' src/components/research/ActiveResearchCenter.tsx
