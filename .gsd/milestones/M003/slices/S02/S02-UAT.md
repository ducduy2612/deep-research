# S02: Phase Freeze UX — Accordion Layout — UAT

**Milestone:** M003
**Written:** 2026-04-03T15:58:06.010Z

# S02: Phase Freeze UX — Accordion Layout — UAT

**Milestone:** M003
**Written:** 2026-04-03

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is a UI layout component with no backend API changes. All behavior is verifiable through automated tests and build checks.

## Preconditions

- pnpm install completed
- All S01 store changes applied (checkpoints, workspace, freeze action)

## Smoke Test

```bash
pnpm vitest run src/components/research/__tests__/phase-accordion.test.tsx
```
All 9 tests pass.

## Test Cases

### 1. Idle state — all phases pending

1. Set store state to `idle`, checkpoints to `{}`
2. Render PhaseAccordion
3. **Expected:** 4 phase headings visible (Clarify, Plan, Research, Report). All show "Pending" label. No frozen badges. No expanded content.

### 2. Clarify phase active

1. Set state to `awaiting_feedback`, checkpoints to `{}`
2. Render with `onRenderClarify` returning a test div
3. **Expected:** Clarify shows "Active" label and renders ClarifyPanel content. Other 3 phases show "Pending". Active phase has primary-color styling.

### 3. Clarify frozen + Plan active

1. Set state to `awaiting_plan_review`, checkpoints to `{ clarify: { frozenAt, questions: "1. Q1\n2. Q2\n3. Q3" } }`
2. Render with `onRenderPlan` returning a test div
3. **Expected:** Clarify shows frozen badge "3 questions answered" with ✅ icon. Plan shows "Active" label and renders PlanPanel. Research and Report show "Pending".

### 4. Frozen clarify content is read-only

1. Set clarify checkpoint with questions text
2. Set state to `awaiting_plan_review` (clarify frozen, plan active)
3. Click clarify accordion trigger to expand
4. **Expected:** MarkdownRenderer shows questions text. No edit controls (textarea, input) inside frozen content. Content has opacity-60 muted styling.

### 5. Plan frozen + Research active

1. Set state to `searching`, checkpoints with clarify + plan
2. Render with `onRenderStreaming`
3. **Expected:** Clarify badge "1 questions answered", Plan badge showing query count, Research shows "Active" with streaming content.

### 6. All phases frozen (completed)

1. Set state to `completed`, all 4 checkpoints populated
2. Render with `onRenderReport`
3. **Expected:** All phases show frozen badges. Report workspace renders via onRenderReport.

### 7. Research summary from live store data

1. Set research checkpoint + state to `reporting`
2. Set searchResults to 3 items (2 with non-empty learning, 1 empty) with varying source counts
3. **Expected:** Research summary badge shows correct learning count (non-empty only) and source count from live store data.

### 8. Empty checkpoint data

1. Set clarify checkpoint with empty questions string
2. **Expected:** Badge shows "0 questions answered" — no crash.

### 9. Plan checkpoint with no searchTasks

1. Set plan checkpoint with empty searchTasks array
2. **Expected:** Badge shows "0 queries planned" — no crash.

### 10. Freeze wiring in ClarifyPanel

1. `grep -q 'freeze.*clarify' src/components/research/ClarifyPanel.tsx`
2. **Expected:** Exit code 0 — freeze('clarify') call present in handleSubmit.

### 11. Freeze wiring in PlanPanel

1. `grep -q 'freeze.*plan' src/components/research/PlanPanel.tsx`
2. **Expected:** Exit code 0 — freeze('plan') call present in handleApprove.

### 12. ActiveResearchCenter uses PhaseAccordion

1. `grep -q 'PhaseAccordion' src/components/research/ActiveResearchCenter.tsx`
2. `! grep -q 'renderCenterContent' src/components/research/ActiveResearchCenter.tsx`
3. **Expected:** PhaseAccordion imported and used; renderCenterContent switch removed.

### 13. Line count compliance

1. `wc -l src/components/research/PhaseAccordion.tsx src/components/research/ActiveResearchCenter.tsx src/components/research/ClarifyPanel.tsx src/components/research/PlanPanel.tsx`
2. **Expected:** All files under 300 lines.

### 14. i18n keys present

1. `grep -q 'PhaseAccordion' messages/en.json`
2. `grep -q 'PhaseAccordion' messages/vi.json`
3. **Expected:** Both files contain PhaseAccordion namespace.

## Edge Cases

### Partial checkpoints
Set only clarify checkpoint with state=idle — clarify shows frozen, all others pending. No crash.

### Missing checkpoint fields
Set clarify checkpoint with only `frozenAt` and no `questions` — badge shows "0 questions answered" without error.

## Failure Signals

- PhaseAccordion tests fail → rendering logic broken
- freeze() calls missing from ClarifyPanel/PlanPanel → phases won't freeze on user action
- renderCenterContent still in ActiveResearchCenter → old switch not replaced
- Files exceed 300 lines → ESLint max-lines violation

## Requirements Proved By This UAT

- R055 — Accordion layout with collapsed frozen phases and expanded active workspace
- R056 — Manual freeze buttons wired to store.freeze('clarify') and store.freeze('plan')
- R062 — Frozen badges (✅ icon, muted styling) and active glow (ring-1 ring-obsidian-primary-deep/20)

## Not Proven By This UAT

- Visual rendering in browser (color accuracy, glow effect, responsive layout)
- End-to-end freeze → accordion update flow with real SSE stream
- Accessibility (keyboard navigation, screen reader)

## Notes for Tester

- The 39 orchestrator.test.ts failures and streaming.ts build error are pre-existing (AI SDK v6 upgrade) — not related to S02.
- Browser visual testing deferred to S06 (Integration + Browser Verification).
