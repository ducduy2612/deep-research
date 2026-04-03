# S02: Phase Freeze UX — Accordion Layout

**Goal:** Transform ActiveResearchCenter from a state-routed switch into a Radix accordion where frozen phases are collapsed read-only sections with summary badges (e.g. "3 questions answered"), and the active phase is an expanded editable workspace with primary-color glow. Wire freeze() calls into ClarifyPanel (Submit button) and PlanPanel (Approve button) so phases become immutable on user action.
**Demo:** After this: Accordion with collapsed frozen phases (badge: '3 questions answered') and expanded active workspace. Click frozen phase to expand read-only. Manual freeze buttons for clarify (Submit) and plan (Approve). Frozen badge with checkmark icon. Active phase has primary-color glow.

## Tasks
- [x] **T01: PhaseAccordion component already implemented with all must-haves: 4-phase Radix accordion, frozen/active/pending rendering, summary badges, read-only MarkdownRenderer, primary-color glow, and i18n strings** — Build the PhaseAccordion component that replaces ActiveResearchCenter's state-routed switch. Uses Radix Accordion (type=multiple, defaultValue=[activePhaseId]) to show collapsed frozen phases with summary badges and expanded active phase with glow. Frozen content rendered read-only via MarkdownRenderer. Add i18n keys to en.json and vi.json.

Steps:
1. Add PhaseAccordion i18n namespace to `messages/en.json` with keys for: phase headers (clarifyTitle, planTitle, researchTitle, reportTitle), summary badges (clarifySummary with {count}, planSummary with {count}, researchSummary with {learnings} and {sources}, reportSummary), frozen badge text, and active phase label
2. Add matching translations to `messages/vi.json`
3. Create `src/components/research/PhaseAccordion.tsx` (~180-200 lines):
   - Import Accordion/AccordionItem/AccordionTrigger/AccordionContent from ui/accordion
   - Import useResearchStore for state, checkpoints, steps, searchResults, questions, plan, result
   - Import MarkdownRenderer for read-only frozen content
   - Import Check, Loader2, ChevronDown icons from lucide-react
   - Define PHASE_CONFIG array mapping each phase to: { id, label, activeStates[], getSummary(checkpoint), renderFrozenContent(checkpoint) }
   - Phase detection: frozen = checkpoints[phase] !== undefined, active = state is in phase's activeStates list
   - Use type=multiple with defaultValue=[activePhaseId] so active phase starts expanded
   - Frozen accordion items: show ✅ Check icon + summary badge (e.g. '3 questions answered') in header, collapsed by default. Content area renders checkpoint data via MarkdownRenderer with muted opacity-60 styling
   - Active accordion item: show primary-color header + ring-1 ring-obsidian-primary-deep/20 glow. Content area renders the appropriate live panel (ClarifyPanel, PlanPanel, streaming view, etc.) via render prop or callback
   - Future phases (no checkpoint, not active): render as disabled/muted AccordionItem with no content
   - Override default shadcn accordion styling: remove border-b from AccordionItem, apply Obsidian Deep tonal layering
   - Frozen header: font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var/60
   - Active header: text-obsidian-primary-deep font-semibold
   - Strip the border-b className from AccordionItem usage (pass className override)
4. The component accepts render props for active phase content: onRenderClarify, onRenderPlan, onRenderStreaming, onRenderResearchActions, onRenderReport callbacks
5. Export PhaseAccordion from the file

Must-Haves:
- [ ] PhaseAccordion renders 4 accordion items (clarify, plan, research, report)
- [ ] Frozen detection via checkpoints[phase] !== undefined works correctly
- [ ] Active detection via state membership in phase's activeStates[] works correctly
- [ ] Summary badges show contextual info (question count, query count, learnings+sources, report status)
- [ ] Frozen content is read-only via MarkdownRenderer with opacity-60
- [ ] Active phase has ring-1 ring-obsidian-primary-deep/20 visual treatment
- [ ] AccordionItem has no border-b (Obsidian Deep = no borders)
- [ ] i18n keys added to both en.json and vi.json
- [ ] Component stays under 300 lines
  - Estimate: 1.5h
  - Files: src/components/research/PhaseAccordion.tsx, messages/en.json, messages/vi.json
  - Verify: pnpm build succeeds with no TypeScript errors. grep -q 'PhaseAccordion' src/components/research/PhaseAccordion.tsx. grep -q 'PhaseAccordion' messages/en.json. Component file is under 300 lines: test $(wc -l < src/components/research/PhaseAccordion.tsx) -le 300
- [x] **T02: Wire freeze() into ClarifyPanel/PlanPanel and replace ActiveResearchCenter switch with PhaseAccordion** — Add freeze() calls to ClarifyPanel's Submit button and PlanPanel's Approve button. Replace ActiveResearchCenter's renderCenterContent() switch with PhaseAccordion component. Verify all existing tests still pass.

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
  - Estimate: 1h
  - Files: src/components/research/ClarifyPanel.tsx, src/components/research/PlanPanel.tsx, src/components/research/ActiveResearchCenter.tsx
  - Verify: pnpm vitest run — all tests pass. pnpm build — production build succeeds. grep -q 'freeze.*clarify' src/components/research/ClarifyPanel.tsx. grep -q 'freeze.*plan' src/components/research/PlanPanel.tsx. ! grep -q 'renderCenterContent' src/components/research/ActiveResearchCenter.tsx. grep -q 'PhaseAccordion' src/components/research/ActiveResearchCenter.tsx
- [x] **T03: Add PhaseAccordion unit tests (9 cases) covering frozen/active/pending rendering with vi.hoisted mock pattern** — Create a test file that verifies PhaseAccordion correctly renders frozen vs active phases based on store state. Tests cover: frozen detection, active detection, summary badges, read-only content rendering, and freeze→accordion flow.

Steps:
1. Create `src/components/research/__tests__/phase-accordion.test.tsx`
2. Use Vitest + React Testing Library (already installed)
3. Mock the Zustand store state for each test scenario
4. Test cases:
   - **Default state (no checkpoints, state=idle)**: No accordion items are expanded, no frozen badges visible
   - **Clarify phase active (state=awaiting_feedback)**: Clarify accordion item is expanded with active glow, no frozen badge, ClarifyPanel renders in content area
   - **Clarify frozen + Plan active (checkpoints.clarify exists, state=awaiting_plan_review)**: Clarify item shows frozen badge with question count, Plan item is expanded and active
   - **Frozen clarify content**: Expand frozen clarify item, verify MarkdownRenderer shows checkpoint.questions text, no edit controls
   - **Plan frozen + Research active (checkpoints.clarify + plan exist, state=searching)**: Both clarify and plan show frozen badges, research is active
   - **All phases frozen (state=completed, all checkpoints exist)**: All 4 items show frozen badges, report is expanded with content
   - **Summary badge text**: Verify correct badge text for each phase (question count, query count, learnings+sources count, report generated)
5. Run tests and verify all pass

Must-Haves:
- [ ] Test file created at src/components/research/__tests__/phase-accordion.test.tsx
- [ ] Tests verify frozen detection via checkpoints
- [ ] Tests verify active detection via state matching
- [ ] Tests verify summary badge text content
- [ ] Tests verify frozen content is read-only (no edit controls)
- [ ] All tests pass

Failure Modes:
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Zustand store mock | Test fails with clear mock error | N/A (sync store) | N/A |

Negative Tests:
- **Empty state**: No checkpoints, state=idle — no frozen badges, no expanded items
- **Missing checkpoint fields**: Checkpoint with partial data still renders correctly
  - Estimate: 1h
  - Files: src/components/research/__tests__/phase-accordion.test.tsx
  - Verify: pnpm vitest run src/components/research/__tests__/phase-accordion.test.tsx — all tests pass. pnpm vitest run — all tests pass (no regressions)
