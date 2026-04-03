# S04: Polish: Persistence, Edge Cases, and Browser Verification — UAT

**Milestone:** M002
**Written:** 2026-04-03T11:08:41.511Z

# UAT: S04 — Polish: Persistence, Edge Cases, and Browser Verification

## Pre-conditions
- Dev server running on localhost:3000
- API keys configured in .env.local (proxy mode)

## Test Cases

### TC1: Full interactive flow
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

### TC2: Persistence across refresh
1. Start research, complete clarify phase → state = awaiting_feedback
2. Refresh page
3. Verify store restores to awaiting_feedback with questions visible
4. Complete flow → refresh during plan phase
5. Verify last completed checkpoint preserved

### TC3: Abort and reset
1. Start new research topic
2. During clarifying phase → abort → verify clean stop
3. Start again → during searching phase → abort → verify clean stop
4. Reset → verify return to idle state

### TC4: Cross-cutting concerns
- Timer tracks total elapsed across phases
- Sources panel populates correctly
- Activity log shows all steps
- No console errors
- Dark mode renders correctly

## Result: PASS (user-confirmed)
