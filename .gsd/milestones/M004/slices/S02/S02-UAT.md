# S02: Hook + store review integration — UAT

**Milestone:** M004
**Written:** 2026-04-14T18:15:29.090Z

# UAT: S02 — Hook + Store Review Integration

## Preconditions
1. App running at http://localhost:3000
2. Valid Google Gemini API key configured in Settings
3. Auto-review rounds setting > 0 (Settings → Advanced → Auto Review Rounds, default is 2)

## Test Cases

### TC-01: Auto-review progress banner appears after research completes
1. Enter a research query and submit
2. Wait for research phase to complete (state transitions to reviewing)
3. **Expected**: Auto-review banner appears showing "AUTO-REVIEW" label with "Auto-review round 1/2..." and a spinning loader
4. **Expected**: "More Research" and "Finalize Findings" buttons are NOT visible
5. **Expected**: Suggestion textarea and ManualQueryInput are NOT visible
6. **Expected**: An "Abort" button is visible in the banner

### TC-02: Auto-review round counter increments
1. Start research with auto-review rounds set to 2
2. Wait for round 1 to complete
3. **Expected**: Progress text updates from "round 1/2" to "round 2/2"
4. Wait for round 2 to complete
5. **Expected**: Banner disappears, normal review UI returns (More Research + Finalize buttons visible)

### TC-03: Abort auto-review mid-cycle
1. Start research and wait for auto-review to trigger
2. Click the "Abort" button during auto-review
3. **Expected**: SSE connection is terminated
4. **Expected**: Auto-review banner disappears immediately
5. **Expected**: Normal review UI appears (More Research + Finalize buttons visible)
6. **Expected**: store state has autoReviewRoundsRemaining=0, autoReviewCurrentRound=0, autoReviewTotalRounds=0

### TC-04: Auto-review round fields persist across page refresh
1. Start research and wait for auto-review to begin
2. Note the current round number shown in the banner
3. Refresh the page (F5)
4. **Expected**: Store rehydrates with persisted autoReviewCurrentRound and autoReviewTotalRounds values

### TC-05: Manual "More Research" works normally (no auto-review banner)
1. Complete a research query with auto-review rounds set to 0
2. After review phase appears, type a suggestion and click "More Research"
3. **Expected**: No auto-review banner appears (manual review, not auto)
4. **Expected**: Review proceeds normally with learnings sent to AI

### TC-06: i18n — Vietnamese locale
1. Switch language to Vietnamese in Settings
2. Start research and wait for auto-review to trigger
3. **Expected**: Banner shows Vietnamese text: "TỰ ĐỘNG XEM XÉT" and "Tự động xem xét vòng 1/2..."
4. **Expected**: Abort button shows "Hủy tự động xem xét"

### TC-07: Store fields reset after auto-review completes
1. Start research with 2 auto-review rounds
2. Wait for both rounds to complete
3. Open React DevTools, inspect research store
4. **Expected**: autoReviewCurrentRound = 0, autoReviewTotalRounds = 0, autoReviewRoundsRemaining = 0
