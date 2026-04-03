# S04: Report Workspace — Feedback + Regeneration

**Goal:** Report phase shows streamed report with feedback textarea in the PhaseAccordion. User writes comments, clicks 'Regenerate' to send frozen checkpoints (plan + learnings + sources) + feedback to AI for a new report. Multiple regeneration rounds supported. 'Done' button freezes report and navigates to standalone FinalReport view. All workspace state persists across refresh.
**Demo:** After this: Report phase shows streamed report with feedback textarea. User writes comments on current report. 'Regenerate' sends frozen checkpoints (plan + learnings + sources) + user feedback to AI. AI regenerates entire report. Multiple regeneration rounds. 'Done' freezes report.

## Tasks
- [x] **T01: Thread user feedback through report generation: orchestrator accepts feedback param, SSE route schema updated, store adds reportFeedback with persistence, hook adds regenerateReport() using frozen checkpoints** — Add optional `feedback` parameter to orchestrator's reportFromLearnings() and runReport(), thread it through the SSE route's reportSchema, add reportFeedback field to the store with persistence, and add regenerateReport() action to use-research hook. Tests verify feedback flows through orchestrator to prompt and store persistence round-trip.
  - Estimate: 1h
  - Files: src/engine/research/orchestrator.ts, src/app/api/research/stream/route.ts, src/stores/research-store.ts, src/stores/research-store-persist.ts, src/hooks/use-research.ts, src/stores/__tests__/research-store-report.test.ts, src/engine/research/__tests__/orchestrator-report-feedback.test.ts
  - Verify: pnpm vitest run src/stores/__tests__/research-store-report.test.ts src/engine/research/__tests__/orchestrator-report-feedback.test.ts
- [ ] **T02: ReportWorkspace UI component + navigation guard + i18n** — Create ReportWorkspace component (~180 lines) with MarkdownRenderer for streamed report, feedback textarea, Regenerate button (calls regenerateReport), Done button (calls freeze('report') then navigates). Wire into PhaseAccordion via onRenderReport in ActiveResearchCenter. Guard auto-navigation in page.tsx to only navigate when report checkpoint exists. Add all i18n strings.
  - Estimate: 1.5h
  - Files: src/components/research/ReportWorkspace.tsx, src/components/research/ActiveResearchCenter.tsx, src/app/page.tsx, messages/en.json, messages/vi.json, src/components/research/__tests__/report-workspace.test.tsx
  - Verify: pnpm vitest run src/components/research/__tests__/report-workspace.test.tsx
