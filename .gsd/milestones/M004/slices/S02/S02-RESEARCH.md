# S02: Hook + Store Review Integration

**Date:** 2026-04-14

## Summary

S02 is the UI integration slice that makes auto-review **visibly stateful** in the interface. S01 already implemented all the engine, API, store, and hook plumbing: `reviewOnly()` orchestrator method, review SSE route, `review-result` store event handler, `autoReviewRoundsRemaining` persisted counter, `requestMoreResearch()` sending `phase: "review"`, and the auto-review trigger `useEffect` loop. What's missing is the **visible UI feedback** during auto-review rounds — the user currently sees nothing distinguishable when auto-review fires versus normal research.

The core work is small and well-scoped: add auto-review round progress to the activity log, show a visible auto-review banner/indicator in the research workspace, and write tests for the new UI behavior. The plumbing is all done — this is purely a presentation + store messaging layer.

## Recommendation

Add auto-review round tracking to the store's activity log messages and render it in `ResearchActions` (or a new `AutoReviewBanner` inline component) when the store is in the auto-review loop. The trigger effect in `use-research.ts` already knows `currentRound` and `settings.autoReviewRounds` — the data just needs to surface through the store into the UI. Add an `autoReviewCurrentRound` field to the store so the UI can render "Auto-review round 1/2..." without recomputing from counters.

## Implementation Landscape

### Key Files

- `src/hooks/use-research.ts` — Auto-review trigger effect (lines 560-600). Already computes `currentRound` and decrements `autoReviewRoundsRemaining`. Needs to also write `autoReviewCurrentRound` to store state so UI can render round progress. This is the primary integration point. **Line count: 621 raw / ~537 code — at ESLint 500-line limit. Adding more than ~10 lines requires extracting the auto-review trigger to `src/hooks/use-auto-review.ts`.**
- `src/stores/research-store.ts` — Store state. Has `autoReviewRoundsRemaining` but no `autoReviewCurrentRound` field. Needs: (1) `autoReviewCurrentRound` field in state interface + initial state + persist schema, (2) optionally `autoReviewTotalRounds` to render "round N/M" without reading settings store.
- `src/stores/research-store-persist.ts` — Persist schema. Needs `autoReviewCurrentRound` added to `persistedStateSchema` with `z.number().int().min(0).optional().default(0)`. Same for `autoReviewTotalRounds` if added.
- `src/stores/research-store-events.ts` — Event handler. The `review-result` handler and `start` handler may need round-aware activity log messages. Currently logs generic "Review complete — N new learnings" without round context. The `start` event handler already logs "Starting review phase" — could be enhanced to "Starting auto-review round N/M" when `autoReviewCurrentRound > 0`.
- `src/components/research/ResearchActions.tsx` — The component shown during `awaiting_results_review`. Currently ~160 lines. Shows stats, manual query input, suggestion textarea, and More Research/Finalize buttons. Needs: (1) auto-review progress banner showing "Auto-review round N/M..." with spinner, (2) hide/disable action buttons while auto-review is running, (3) show "Auto-review complete" briefly when all rounds finish.
- `src/components/research/WorkflowProgress.tsx` — Step progress bar. Already has "review" step showing active during `reviewing` state and awaiting during `awaiting_results_review`. No changes needed — existing step highlighting is sufficient.
- `src/components/research/PhaseAccordion.tsx` — Accordion renders research workspace content. The `onRenderResearchActions` callback already shows `ResearchActions` during `awaiting_results_review`. No changes needed.
- `messages/en.json` + `messages/vi.json` — Need new i18n keys under `ResearchActions`: `autoReviewProgress` ("Auto-review round {current}/{total}..."), `autoReviewComplete` ("Auto-review complete"), `autoReviewAbort` ("Abort auto-review").

### Build Order

1. **Store changes** (unblocks everything): Add `autoReviewCurrentRound` and `autoReviewTotalRounds` to store state interface, `INITIAL_STATE`, persist schema (`research-store-persist.ts`), hydration (`hydrate()` in research-store.ts), and persist subscription. Both default to 0.

2. **Hook changes**: In the auto-review trigger effect (use-research.ts ~line 579), add `autoReviewCurrentRound: currentRound` and `autoReviewTotalRounds: settings.autoReviewRounds` to the existing `setState` call. Also reset `autoReviewCurrentRound` to 0 when all rounds are done (when `autoReviewRoundsRemaining - 1 === 0` after decrement, or in the `review-result` event handler when it detects all rounds are complete).

3. **UI component changes**: Add auto-review banner to `ResearchActions.tsx`. When `autoReviewCurrentRound > 0` and state is `reviewing`, show "Auto-review round N/M..." with spinner. When state transitions back to `awaiting_results_review` after all rounds, show brief "Auto-review complete" message. Hide More Research/Finalize buttons during auto-review. Add abort button during auto-review.

4. **i18n**: Add new keys to both `messages/en.json` and `messages/vi.json`.

5. **Tests**: Unit tests for store field persistence, hook round writing, and `ResearchActions` rendering.

### Verification Approach

- **Unit tests**: Store `autoReviewCurrentRound` is persisted and hydrated. Hook trigger sets `autoReviewCurrentRound` when firing. `ResearchActions` renders round progress when `autoReviewCurrentRound > 0` and hides action buttons.
- **Full test suite**: `pnpm test --run` — all 796+ tests pass
- **Build**: `pnpm build` — clean
- **Lint**: `pnpm lint` — clean
- **Manual verification**: Set `autoReviewRounds` to 2 in settings, run research. After research completes, should see "Auto-review round 1/2..." banner in ResearchActions panel, then "Auto-review round 2/2...", then back to normal review actions with More Research and Finalize buttons.

## Constraints

- **ESLint max 500 lines per file** (skipBlankLines + skipComments): `ResearchActions.tsx` is ~160 lines (plenty of room). `use-research.ts` is 621 raw lines, ~537 code lines — already at the limit. The changes to the auto-review trigger effect are minimal (adding one field to an existing `setState` call), so no extraction needed. But if the planner adds more than ~10 lines, extract the auto-review trigger to `src/hooks/use-auto-review.ts`.
- All i18n strings must be added to both `messages/en.json` and `messages/vi.json`.
- SSE event shapes must remain backward-compatible — `review-result` event already exists and accumulates correctly.
- `autoReviewCurrentRound` must persist to localforage (via the store persist subscription) so it survives page refresh during auto-review.

## Common Pitfalls

- **Auto-review vs manual review state collision**: When auto-review fires, it transitions to `reviewing` state. But the user could also click "More Research" simultaneously. The existing code clears suggestion before connecting, but the abort controller in use-research will abort the previous connection. The `ResearchActions` component should hide/disable the "More Research" button while auto-review is active to prevent this race.
- **Round counter on hydration**: If the page refreshes during auto-review, `autoReviewRoundsRemaining` is persisted, but `autoReviewCurrentRound` must also persist to show correct state. The current auto-review trigger effect fires on hydration when `state === "awaiting_results_review"` and rounds remain, so it will restart — but the UI should show the correct round number even during the brief moment before the effect fires.
- **Don't re-derive round from counters**: `autoReviewCurrentRound` should be an explicit store field, not derived from `autoReviewRoundsRemaining` and `autoReviewRounds` settings, because the settings can change between page loads.
