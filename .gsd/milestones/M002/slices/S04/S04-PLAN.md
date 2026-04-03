# S04: Polish: Persistence, Edge Cases, and Browser Verification

**Goal:** Handle edge cases, persistence across refresh, and verify the complete flow in the browser.
**Demo:** After this: After this: full interactive flow works in browser. Refresh mid-research preserves state. Abort at any phase works cleanly.

## Tasks
- [x] **T12: Add localforage persistence to research store with interrupted-connection recovery** — Implement persistence for multi-phase research state so page refresh doesn't lose progress:

1. The research store already accumulates questions, feedback, plan, learnings, sources across phases
2. Ensure localforage persistence works for the new fields (questions, feedback, plan, suggestion)
3. On page load, if store state is one of the 'awaiting_*' states, restore and show the appropriate panel
4. If the page refreshes during an active SSE connection (clarifying, planning, searching, etc.), the connection is lost — that's expected. The user sees the last completed checkpoint's data and can re-trigger the current phase.

This may involve:
- Checking if research store has non-idle state on mount
- Restoring the correct UI panel based on stored state
- Handling the case where SSE was interrupted mid-stream (show 'connection lost, retry' option)
  - Estimate: 1.5 hours
  - Files: src/stores/research-store.ts, src/hooks/use-research.ts, src/components/research/ActiveResearch.tsx
  - Verify: pnpm vitest run
- [x] **T13: Browser verification of complete interactive research flow confirmed by user** — Start dev server and walk through the complete interactive research flow in the browser:

1. Enter topic → click Start
2. Verify clarification questions stream and appear
3. Edit questions, add feedback, click Write Report Plan
4. Verify plan streams and appears
5. Edit plan, click Start Research
6. Verify search results stream in
7. Add suggestion, click Continue Research
8. Verify additional search runs
9. Click Generate Report
10. Verify final report streams in

Also verify:
- Timer tracks total elapsed
- Sources panel populates correctly
- Activity log shows all steps
- Abort at different phases works
- Reset works
- No console errors
- Dark mode renders correctly
  - Estimate: 1 hour
  - Verify: Manual walkthrough in browser — no console errors
