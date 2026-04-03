---
estimated_steps: 6
estimated_files: 6
skills_used:
  - frontend-design
---

# T02: ReportWorkspace UI component + navigation guard + i18n

**Slice:** S04 — Report Workspace — Feedback + Regeneration
**Milestone:** M003

## Description

Create the ReportWorkspace component that renders the streamed report with a feedback textarea, Regenerate button, and Done button. Wire it into PhaseAccordion via the `onRenderReport` render prop in ActiveResearchCenter. Guard the auto-navigation in page.tsx to only navigate to the FinalReport view when the report checkpoint is frozen. Add i18n strings for en and vi.

## Steps

1. **Create ReportWorkspace component** (`src/components/research/ReportWorkspace.tsx`, ~180 lines):
   - Import: useResearchStore, useUIStore, useTranslations, useResearch hook, MarkdownRenderer, lucide icons (RefreshCw, Check, MessageSquare).
   - Read from store: `result` (for streamed report), `reportFeedback`, `state`, `checkpoints`.
   - Read from useResearch: `regenerateReport`, `abort`.
   - Layout:
     - Top: MarkdownRenderer rendering `result?.report ?? ""` (the streamed report content). Show empty state if no report yet ("Report will appear here...").
     - Bottom section: feedback textarea with label + placeholder. Use `store.setReportFeedback` on change (direct store setter, no debouncing needed — it's fire-and-forget persist).
     - Action buttons row:
       - "Regenerate" button (RefreshCw icon): calls `regenerateReport()`. Disabled when `state === "reporting"` (already generating). Shows spinner during generation.
       - "Done" button (Check icon): calls `store.freeze('report')` then `navigate('report')`. Only visible when result exists (report has been generated at least once).
   - Style: Use obsidian-deep tokens. Feedback textarea uses `bg-obsidian-surface-deck border-obsidian-border rounded-lg` pattern. Buttons follow existing ResearchActions button patterns.

2. **Wire ReportWorkspace into ActiveResearchCenter** (`src/components/research/ActiveResearchCenter.tsx`):
   - Import `ReportWorkspace` from `./ReportWorkspace`.
   - Import `regenerateReport` from useResearch hook (add to destructured imports).
   - Pass `onRenderReport` to PhaseAccordion:
     ```tsx
     onRenderReport={() => <ReportWorkspace />}
     ```
   - ReportWorkspace gets everything it needs from stores/hooks directly — no prop threading needed.

3. **Guard auto-navigation in page.tsx** (`src/app/page.tsx`):
   - Import `useResearchStore` is already imported.
   - Read checkpoints: `const checkpoints = useResearchStore((s) => s.checkpoints);` (add near existing store reads).
   - Change the auto-nav effect (~line 56):
     ```ts
     // Before:
     if ((state === "completed" || ...) && result && activeView === "active") {
       navigate("report");
     }
     // After:
     if ((state === "completed" || ...) && result && activeView === "active" && checkpoints?.report) {
       navigate("report");
     }
     ```
   - This ensures the user stays in the accordion after report streaming completes, and only navigates out when they click Done (which freezes the report checkpoint).

4. **Add i18n strings** (`messages/en.json`):
   - Add `ReportWorkspace` namespace:
     ```json
     "ReportWorkspace": {
       "feedbackLabel": "FEEDBACK",
       "feedbackPlaceholder": "Write comments on the current report. Your feedback will be used to regenerate an improved version...",
       "regenerate": "Regenerate",
       "regenerating": "Regenerating...",
       "done": "Done",
       "emptyReport": "Report will appear here as it is generated..."
     }
     ```

5. **Add Vietnamese translations** (`messages/vi.json`):
   - Add matching `ReportWorkspace` namespace with Vietnamese translations.

6. **Write component tests** (`src/components/research/__tests__/report-workspace.test.tsx`):
   - Use the vi.hoisted() + mutable container pattern from S02's phase-accordion tests.
   - Tests:
     - Renders empty state when no report
     - Renders MarkdownRenderer with report content
     - Feedback textarea updates store on change
     - Regenerate button calls regenerateReport
     - Regenerate button disabled during reporting state
     - Done button calls freeze('report') then navigate('report')
     - Done button hidden when no result

## Must-Haves

- [ ] ReportWorkspace component renders streamed report + feedback textarea + Regenerate + Done buttons
- [ ] ActiveResearchCenter passes onRenderReport to PhaseAccordion
- [ ] Page.tsx auto-navigation only fires when checkpoints.report exists
- [ ] i18n strings added for en.json and vi.json
- [ ] Component tests pass
- [ ] All existing tests pass
- [ ] use-research.ts stays under 500 effective lines (or extraction is done)

## Verification

- `pnpm vitest run src/components/research/__tests__/report-workspace.test.tsx` — new tests pass
- `pnpm vitest run` — all tests pass
- `pnpm build` — no TypeScript errors
- `rg "onRenderReport" src/components/research/ActiveResearchCenter.tsx` — confirms wiring
- `rg "checkpoints?.report" src/app/page.tsx` — confirms navigation guard

## Inputs

- `src/components/research/ActiveResearchCenter.tsx` — PhaseAccordion usage to add onRenderReport prop
- `src/components/research/PhaseAccordion.tsx` — onRenderReport render prop interface (already exists)
- `src/app/page.tsx` — Auto-navigation effect to guard
- `messages/en.json` — Existing i18n structure to extend
- `messages/vi.json` — Existing Vietnamese translations to extend

## Expected Output

- `src/components/research/ReportWorkspace.tsx` — New ~180-line component with report display, feedback textarea, action buttons
- `src/components/research/ActiveResearchCenter.tsx` — Modified to pass onRenderReport to PhaseAccordion
- `src/app/page.tsx` — Navigation guard added to auto-nav effect
- `messages/en.json` — ReportWorkspace i18n namespace added
- `messages/vi.json` — Matching Vietnamese translations added
- `src/components/research/__tests__/report-workspace.test.tsx` — Component test suite (~7 tests)
