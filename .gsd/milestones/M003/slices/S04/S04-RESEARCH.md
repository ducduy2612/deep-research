# S04 Research: Report Workspace — Feedback + Regeneration

## Summary

S04 adds a feedback+regeneration workflow to the report phase. After the AI streams a report, the user stays in the accordion layout and can write comments, click "Regenerate" to get a new report from frozen inputs + feedback, repeat multiple rounds, then click "Done" to freeze the report and navigate to the standalone view. The implementation requires changes across 5 layers: prompt template, orchestrator, SSE route, store/hook, and UI components.

**Complexity: Medium.** The pattern is well-established (similar to clarify feedback and plan review flows). The main risk is the auto-navigation guard in page.tsx and correctly threading feedback through the orchestrator's prompt system.

## Recommendation

3 tasks in dependency order:

1. **Engine + Store + Hook**: Add `reportFeedback` to store, `regenerateReport()` to use-research, pass `feedback` through SSE route → orchestrator → prompt. Add `feedback` to report schema.
2. **ReportWorkspace component**: New component (~180 lines) with MarkdownRenderer for streamed report, feedback textarea, Regenerate button, Done button. Wire into PhaseAccordion via `onRenderReport` render prop.
3. **Page navigation guard + Done flow**: Change auto-navigation in page.tsx to NOT navigate on report completion (stay in accordion). Done button calls `freeze('report')` then navigates to standalone FinalReport view. i18n strings. Tests.

## Implementation Landscape

### Files that change

| File | Change | Lines now |
|------|--------|-----------|
| `src/engine/research/types.ts` | No change needed — `ResearchCheckpoints.report` already stores `ResearchResult` | 321 |
| `src/engine/research/prompts.ts` | No change — `getReportPrompt` already has optional `requirements` param (5th arg) | 406 |
| `src/engine/research/orchestrator.ts` | Add optional `feedback?: string` to `reportFromLearnings()` and `runReport()`, thread as `requirements` to `resolvePrompt` | 904 |
| `src/app/api/research/stream/route.ts` | Add optional `feedback` to `reportSchema`, pass to `orchestrator.reportFromLearnings()` | 626 |
| `src/stores/research-store.ts` | Add `reportFeedback: string` field + `setReportFeedback` setter + add to persist | 395 |
| `src/stores/research-store-persist.ts` | Add `reportFeedback` to persist schema with backward-compatible default | 135 |
| `src/stores/research-store-events.ts` | No change — `done` handler already correct for report phase | 326 |
| `src/hooks/use-research.ts` | Add `regenerateReport()` action: reads frozen checkpoints + feedback, sends to SSE route. Modify `generateReport` to also support feedback param. | 644 |
| `src/components/research/ReportWorkspace.tsx` | **NEW** — Report workspace with feedback textarea + Regenerate/Done buttons | ~180 |
| `src/components/research/ActiveResearchCenter.tsx` | Pass `onRenderReport` to PhaseAccordion with ReportWorkspace | 172 |
| `src/app/page.tsx` | Guard auto-navigation: don't navigate to "report" view if report checkpoint isn't frozen yet | 109 |
| `messages/en.json` | Add ReportWorkspace i18n keys | — |
| `messages/vi.json` | Add matching Vietnamese translations | — |

### New files

- `src/components/research/ReportWorkspace.tsx` — The report workspace component
- `src/stores/__tests__/research-store-report.test.ts` — Tests for reportFeedback persistence and regeneration flow
- `src/engine/research/__tests__/orchestrator-report-feedback.test.ts` — Tests for feedback threading through orchestrator

### Existing patterns to follow

- **Feedback textarea pattern**: Reuse the blur-save pattern from S06 AdvancedTab — save on blur, not keystroke. Actually for report feedback, it's simpler: just read from store when Regenerate is clicked (like suggestion in ResearchActions).
- **Render prop pattern**: PhaseAccordion already has `onRenderReport` render prop — just pass ReportWorkspace through it in ActiveResearchCenter.
- **SSE reconnection pattern**: `regenerateReport()` follows same pattern as `generateReport()` — builds body from frozen checkpoints, calls `connectSSE()`.
- **freeze() pattern**: Done button calls `store.freeze('report')` then navigates, exactly like finalizeFindings calls `store.freeze('research')` then generates report.

## Key Findings

### 1. Auto-navigation must be guarded

`page.tsx` has an effect that auto-navigates to the standalone FinalReport view when `state === "completed"`. For the feedback workflow, the user must stay in the accordion after report completion so they can write feedback and regenerate. The guard: only navigate to standalone view if `checkpoints.report` exists (meaning user explicitly clicked Done).

**Current code** (page.tsx lines ~46-55):
```ts
if ((state === "completed" || ...) && result && activeView === "active") {
  navigate("report");
}
```

**Change to**:
```ts
if ((state === "completed" || ...) && result && activeView === "active" && store.checkpoints.report) {
  navigate("report");
}
```

### 2. `getReportPrompt` already has `requirements` parameter

The report prompt function signature is:
```ts
getReportPrompt(plan, learnings, sources, images, requirements?: string)
```

The `requirements` parameter is already embedded in the prompt as:
```
Please write according to the user's writing requirements:
<REQUIREMENT>
${requirements}
</REQUIREMENT>
```

This is exactly what we need for feedback. No prompt changes required — just thread `feedback` as `requirements` through the call chain.

### 3. Orchestrator needs feedback threading

`reportFromLearnings(plan, learnings, sources, images)` → `runReport(plan, learnings, sources, images)` → `resolvePrompt("report", overrides, plan, learnings, sources, images)`. 

The `resolvePrompt` call is missing the 6th argument (requirements). Add `feedback?: string` to both `reportFromLearnings` and `runReport`, then pass it as the 6th arg to `resolvePrompt`.

### 4. SSE route reportSchema needs `feedback` field

Add `feedback: z.string().optional()` to `reportSchema` in route.ts. Pass to `orchestrator.reportFromLearnings()` as 5th argument.

### 5. State machine works as-is

PhaseAccordion already maps `completed` to report's active states (`activeStates: ["reporting", "completed"]`). So when report is done, state = `completed`, accordion shows report as active — user can interact with the workspace. When they click Regenerate, we go back to `reporting`. No new state needed.

### 6. Done flow: freeze → navigate → auto-save

The "Done" button should:
1. `store.freeze('report')` — creates immutable report checkpoint
2. Auto-save to history (if not already saved — currently auto-save happens in connectSSE on `done` event for report phase)
3. Navigate to standalone FinalReport view

The auto-save already happens in use-research.ts's connectSSE when `isReportPhase=true` and `done` fires. The navigation is the only new piece — it happens when user explicitly clicks Done (freeze sets checkpoint, which enables the auto-navigation guard).

### 7. Store `reportFeedback` needs persistence

Add `reportFeedback: string` to store state (default ""), add setter, add to persist schema with `optional().default("")`, add to auto-persist subscription. Same pattern as `suggestion` field.

### 8. Component size considerations

- ReportWorkspace: ~180 lines (feedback textarea + streamed report rendering + action buttons). Under 300-line limit.
- ActiveResearchCenter: Currently 172 lines. Adding onRenderReport prop adds ~5 lines. Under 300-line limit.
- FinalReport: 224 lines, unchanged — stays as standalone view.
- use-research.ts: 644 lines — already at risk. Adding `regenerateReport` adds ~25 lines. May need to check ESLint compliance.

## Don't Hand-Roll

- PDF generation: S05 scope, not this slice
- Export buttons: S05 scope
- Rich text editing: Explicitly out of scope (feedback+regeneration model only)

## Constraints

- Store file is 395 lines — adding `reportFeedback` + setter keeps it under 500
- use-research.ts is 644 lines — may need careful management or extraction
- All UI strings via i18n (en.json + vi.json)
- Component files must stay under 300 lines
