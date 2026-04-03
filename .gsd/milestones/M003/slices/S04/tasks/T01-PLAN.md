---
estimated_steps: 7
estimated_files: 7
skills_used: []
---

# T01: Engine + Store + Hook: Thread feedback through report generation

**Slice:** S04 — Report Workspace — Feedback + Regeneration
**Milestone:** M003

## Description

Thread user feedback through the report generation pipeline: orchestrator accepts optional `feedback` param, SSE route schema adds `feedback` field, store adds `reportFeedback` with persistence, and use-research hook gets a `regenerateReport()` action that reads frozen research checkpoint + feedback to request a regenerated report.

## Steps

1. **Orchestrator — Add feedback to reportFromLearnings() and runReport():**
   - In `src/engine/research/orchestrator.ts`, add optional `feedback?: string` as 5th param to `reportFromLearnings(plan, learnings, sources, images, feedback?)`.
   - Pass `feedback` to `runReport(plan, learnings, sources, images, feedback?)`.
   - In `runReport()`, add `feedback?: string` as 5th param, then pass it as the 6th argument to `resolvePrompt("report", overrides, plan, learnings, sources, images, feedback)`.
   - IMPORTANT: `resolvePrompt` for "report" already calls `getReportPrompt(..., requirements?)` — the feedback is threaded as `requirements`. No prompt changes needed.

2. **SSE route — Add feedback to reportSchema and handleReportPhase:**
   - In `src/app/api/research/stream/route.ts`, add `feedback: z.string().optional()` to `reportSchema`.
   - In `handleReportPhase()`, pass `req.feedback` as 5th arg to `orchestrator.reportFromLearnings(req.plan, req.learnings, req.sources, req.images, req.feedback)`.

3. **Store — Add reportFeedback field:**
   - In `src/stores/research-store.ts`, add `readonly reportFeedback: string;` to the state interface (near `suggestion` field at ~line 59).
   - Add `reportFeedback: "",` to the initial state (~line 110).
   - Add `setReportFeedback: (text: string) => set({ reportFeedback: text }),` setter (~line 184 near setSuggestion).
   - Add `reportFeedback: state.reportFeedback,` to the auto-persist subscription object (~line 365).

4. **Persist schema — Add reportFeedback:**
   - In `src/stores/research-store-persist.ts`, add `reportFeedback: z.string().optional().default(""),` to `persistedStateSchema` (near `suggestion` field).
   - Add `reportFeedback: saved.reportFeedback,` to the hydrate action in the store (~line 328 near suggestion hydrate).

5. **Hook — Add regenerateReport():**
   - In `src/hooks/use-research.ts`, add a `regenerateReport` callback after `generateReport` (~line 520).
   - It reads from store: `useResearchStore.getState()` to get `reportFeedback` and `checkpoints.research`.
   - Gets plan from `checkpoints.research?.result` or falls back to `plan` field. Gets learnings/sources/images from research checkpoint result.
   - Calls `connectSSE({ phase: "report", plan, learnings, sources, images, feedback: reportFeedback, ...baseFields }, true)`.
   - **Line count warning:** use-research.ts is at 494 non-blank/non-comment lines. Keep regenerateReport compact (~15 lines). If it pushes over 500, extract a `buildReportBody()` helper shared with `generateReport` to save lines. Both functions build similar request bodies — extracting the common parts saves ~10 lines net.

6. **Add regenerateReport to the hook's return object** (~line 631).

7. **Tests — Orchestrator feedback threading:**
   - Create `src/engine/research/__tests__/orchestrator-report-feedback.test.ts`.
   - Test that `reportFromLearnings(plan, learnings, sources, images, "focus on cost analysis")` passes feedback through to the prompt.
   - Use the mockContainer pattern from S03 knowledge — MockLanguageModelV1 with vi.hoisted().
   - Assert the streamed text / prompt contains the feedback string.
   - Test without feedback (backwards compat) — existing behavior unchanged.

8. **Tests — Store reportFeedback persistence:**
   - Create `src/stores/__tests__/research-store-report.test.ts`.
   - Test: setReportFeedback updates state.
   - Test: reportFeedback persists and hydrates correctly (round-trip).
   - Test: backward compat — old state without reportFeedback defaults to "".
   - Test: reset() clears reportFeedback.

## Must-Haves

- [ ] orchestrator.reportFromLearnings() accepts optional feedback and threads to resolvePrompt
- [ ] SSE route reportSchema includes optional feedback field
- [ ] Store has reportFeedback field + setReportFeedback setter
- [ ] reportFeedback persists to localforage (in persist schema + auto-persist subscription + hydrate)
- [ ] regenerateReport() reads frozen research checkpoint + feedback, calls SSE
- [ ] 2 new test files with passing tests
- [ ] All existing tests still pass

## Verification

- `pnpm vitest run src/stores/__tests__/research-store-report.test.ts src/engine/research/__tests__/orchestrator-report-feedback.test.ts` — new tests pass
- `pnpm vitest run` — all existing tests still pass
- `pnpm build` — no TypeScript errors

## Observability Impact

- Signals added/changed: Store activity log captures report regeneration via step-start/step-delta events (existing SSE stream). No new log format needed.
- How a future agent inspects this: Check store.reportFeedback for current feedback text, store.checkpoints.report for frozen report state.
- Failure state exposed: SSE error events already surface regeneration failures via sonner toast in page.tsx.

## Inputs

- `src/engine/research/orchestrator.ts` — Current reportFromLearnings() and runReport() signatures to extend
- `src/app/api/research/stream/route.ts` — Current reportSchema and handleReportPhase() to extend
- `src/stores/research-store.ts` — Current store state, setters, auto-persist subscription to extend
- `src/stores/research-store-persist.ts` — Current persistedStateSchema to extend
- `src/hooks/use-research.ts` — Current generateReport() to model regenerateReport() after

## Expected Output

- `src/engine/research/orchestrator.ts` — feedback param added to reportFromLearnings() and runReport()
- `src/app/api/research/stream/route.ts` — feedback field in reportSchema, passed to orchestrator
- `src/stores/research-store.ts` — reportFeedback field + setter + auto-persist
- `src/stores/research-store-persist.ts` — reportFeedback in persist schema
- `src/hooks/use-research.ts` — regenerateReport() action added
- `src/stores/__tests__/research-store-report.test.ts` — Store persistence tests for reportFeedback
- `src/engine/research/__tests__/orchestrator-report-feedback.test.ts` — Orchestrator feedback threading tests
