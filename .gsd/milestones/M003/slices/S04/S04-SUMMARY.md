---
id: S04
parent: M003
milestone: M003
provides:
  - ReportWorkspace UI component for report phase accordion panel
  - regenerateReport() hook action that reads frozen checkpoints + feedback
  - reportFeedback store field with persistence and hydration
  - Navigation guard that prevents auto-redirect until report is frozen
requires:
  - slice: S01
    provides: Frozen checkpoint model (checkpoints object, freeze() action, persist schema)
  - slice: S02
    provides: PhaseAccordion with onRenderReport render prop slot, frozen/active visual distinction
affects:
  - S05
  - S06
key_files:
  - src/components/research/ReportWorkspace.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/app/page.tsx
  - src/engine/research/orchestrator.ts
  - src/app/api/research/stream/route.ts
  - src/stores/research-store.ts
  - src/stores/research-store-persist.ts
  - src/hooks/use-research.ts
  - src/engine/research/__tests__/orchestrator-report-feedback.test.ts
  - src/stores/__tests__/research-store-report.test.ts
  - src/components/research/__tests__/report-workspace.test.tsx
  - messages/en.json
  - messages/vi.json
key_decisions:
  - Extracted buildReportBody() helper for 500-line compliance in use-research.ts
  - Feedback maps to existing requirements parameter in getReportPrompt — no prompt changes needed
  - Regenerate reads frozen checkpoints (not live state) for determinism across refresh
  - ReportWorkspace reads all state from stores/hooks directly — no prop threading from ActiveResearchCenter
  - Navigation guard uses optional chaining (checkpoints?.report) to handle undefined checkpoints
patterns_established:
  - Feedback→requirements prompt mapping: user feedback on reports maps to existing prompt parameters, avoiding prompt proliferation
  - Self-contained workspace components: accordion render props that read state directly from stores, no prop threading
  - Frozen-checkpoint-based regeneration: regeneration flows read from immutable checkpoints rather than ephemeral workspace state
  - Navigation guard pattern: optional chaining on checkpoints for safe auto-navigation decisions
observability_surfaces:
  - none
drill_down_paths:
  - milestones/M003/slices/S04/tasks/T01-SUMMARY.md
  - milestones/M003/slices/S04/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T17:48:08.056Z
blocker_discovered: false
---

# S04: Report Workspace — Feedback + Regeneration

**Report workspace with feedback textarea, AI regeneration from frozen checkpoints, and Done-to-freeze navigation — 17 new tests, all 711 pass.**

## What Happened

S04 delivers the report phase workspace, completing the 4-phase accordion's final interactive panel. The slice threads user feedback through the entire report generation pipeline (orchestrator → SSE route → store → hook → UI) and provides a polished ReportWorkspace component.

**T01 (Backend threading):** Added optional `feedback` parameter to orchestrator's `reportFromLearnings()` and `runReport()`, threading it through `resolvePrompt` to `getReportPrompt`'s existing `requirements` parameter — no new prompt code needed. SSE route's `reportSchema` includes optional `feedback` field. Store gains `reportFeedback` field with `setReportFeedback` setter, auto-persist subscription, and hydrate support. Hook gets `regenerateReport()` that reads frozen research + plan checkpoints + reportFeedback to request a regenerated report via SSE. Extracted `buildReportBody()` helper to keep use-research.ts under 500-line ESLint limit. 10 new tests (4 orchestrator + 6 store) — all pass.

**T02 (UI + wiring):** Created `ReportWorkspace` component (134 lines) with MarkdownRenderer for streamed report, feedback textarea bound to `store.reportFeedback`, Regenerate button (calls `regenerateReport`, disabled during reporting state with spinner), and Done button (calls `freeze('report')` then `navigate('report')`, only visible when result exists). Follows Obsidian Deep design system with tonal surface layering. Wired into PhaseAccordion via `onRenderReport` render prop in ActiveResearchCenter. Added navigation guard in page.tsx: auto-nav to FinalReport requires `checkpoints?.report` — users stay in accordion until they explicitly click Done. Added 6 i18n keys in en.json and vi.json. 7 component tests — all pass.

Full suite: 711/711 pass across 35 test files. Build succeeds with no TypeScript errors.

## Verification

1. All 17 new tests pass: `pnpm vitest run src/engine/research/__tests__/orchestrator-report-feedback.test.ts src/stores/__tests__/research-store-report.test.ts src/components/research/__tests__/report-workspace.test.tsx` — 3 files, 17 tests, all pass.
2. Full suite: `pnpm vitest run` — 711/711 pass across 35 files.
3. Build: `pnpm build` — succeeds, no TypeScript errors.
4. Wiring verified: `rg "onRenderReport"` confirms ReportWorkspace wired into ActiveResearchCenter, `rg "checkpoints?.report"` confirms navigation guard in page.tsx.
5. i18n: `messages/en.json` and `messages/vi.json` both have `ReportWorkspace` namespace with 6 keys.
6. Component under 500-line limit: ReportWorkspace.tsx is 134 lines.

## Requirements Advanced

- R057 — Report workspace with feedback textarea + regeneration from frozen checkpoints fully implemented. 17 tests verify end-to-end flow from UI → hook → store → orchestrator.

## Requirements Validated

- R057 — ReportWorkspace shows streamed report, feedback textarea persists across refresh, Regenerate sends frozen checkpoints + feedback to AI, Done freezes report. 17 tests pass (4 orchestrator + 6 store + 7 component). Build succeeds.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All planned steps implemented exactly as specified.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/components/research/ReportWorkspace.tsx` — New component: feedback textarea, Regenerate/Done buttons, streamed report display via MarkdownRenderer
- `src/components/research/ActiveResearchCenter.tsx` — Added onRenderReport render prop wiring for ReportWorkspace
- `src/app/page.tsx` — Navigation guard: auto-nav to FinalReport requires checkpoints?.report
- `src/engine/research/orchestrator.ts` — reportFromLearnings() and runReport() accept optional feedback parameter
- `src/app/api/research/stream/route.ts` — reportSchema includes optional feedback field
- `src/stores/research-store.ts` — Added reportFeedback field with setReportFeedback setter
- `src/stores/research-store-persist.ts` — Added reportFeedback to persist schema for hydration
- `src/hooks/use-research.ts` — Added regenerateReport() using frozen checkpoints + buildReportBody() helper
- `src/engine/research/__tests__/orchestrator-report-feedback.test.ts` — New test file: 4 tests for feedback threading through orchestrator
- `src/stores/__tests__/research-store-report.test.ts` — New test file: 6 tests for reportFeedback persistence and hydration
- `src/components/research/__tests__/report-workspace.test.tsx` — New test file: 7 component tests for ReportWorkspace
- `messages/en.json` — Added ReportWorkspace namespace with 6 i18n keys
- `messages/vi.json` — Added ReportWorkspace namespace with 6 Vietnamese translations
