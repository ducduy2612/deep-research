---
estimated_steps: 28
estimated_files: 1
skills_used: []
---

# T03: Write PhaseAccordion unit tests verifying frozen/active rendering and state mapping

Create a test file that verifies PhaseAccordion correctly renders frozen vs active phases based on store state. Tests cover: frozen detection, active detection, summary badges, read-only content rendering, and freeze→accordion flow.

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

## Inputs

- `src/components/research/PhaseAccordion.tsx — component under test`
- `src/stores/research-store.ts — store to mock in tests`
- `src/engine/research/types.ts — type definitions for checkpoints`

## Expected Output

- `src/components/research/__tests__/phase-accordion.test.tsx — test file with 6+ test cases covering frozen/active rendering`

## Verification

pnpm vitest run src/components/research/__tests__/phase-accordion.test.tsx — all tests pass. pnpm vitest run — all tests pass (no regressions)
