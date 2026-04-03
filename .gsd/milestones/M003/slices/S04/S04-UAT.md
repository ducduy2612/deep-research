# S04: Report Workspace — Feedback + Regeneration — UAT

**Milestone:** M003
**Written:** 2026-04-03T17:48:08.056Z

# S04 UAT: Report Workspace — Feedback + Regeneration

## Preconditions
- App running at http://localhost:3000 with valid AI provider API key in `.env.local`
- Fresh browser session (no persisted state)
- Knowledge base has at least 1 document (optional, for richer results)

---

## Test 1: Report workspace appears after research finalization

**Steps:**
1. Start a research topic (e.g., "Benefits of intermittent fasting")
2. Complete clarify phase: answer 3 questions, click Submit
3. Complete plan phase: click Approve
4. Complete research phase: wait for search results, click "Finalize Findings"
5. Observe the report phase accordion panel expand

**Expected:**
- Report phase is the active (expanded) accordion panel
- Report workspace shows the streamed report content in MarkdownRenderer
- Feedback textarea is visible below the report
- "Regenerate" button is visible and enabled
- "Done" button is NOT visible (no result yet — report still streaming)

## Test 2: Feedback textarea persists user input

**Steps:**
1. After Test 1, type feedback in the textarea: "Add more quantitative data and cost analysis"
2. Refresh the browser page (F5)
3. Wait for state rehydration

**Expected:**
- The feedback textarea still contains "Add more quantitative data and cost analysis"
- Report content is still visible (from persisted result)

## Test 3: Regenerate sends feedback and produces new report

**Steps:**
1. With feedback in the textarea, click "Regenerate"
2. Observe the Regenerate button changes to "Regenerating..." with spinner
3. Wait for new report to stream

**Expected:**
- Button shows "Regenerating..." with spinning Loader2 icon and is disabled
- New report streams in, replacing the old content
- After completion, button returns to "Regenerate" and is enabled again
- Feedback textarea is still visible (not cleared)

## Test 4: Multiple regeneration rounds

**Steps:**
1. After first regeneration, change feedback to "Now focus on long-term effects"
2. Click "Regenerate" again
3. Wait for new report to stream

**Expected:**
- Second regeneration works without errors
- Report content updates again
- No state corruption after multiple rounds

## Test 5: Regenerate with empty feedback (backward compat)

**Steps:**
1. Clear the feedback textarea (make it empty)
2. Click "Regenerate"

**Expected:**
- Regeneration proceeds normally (empty feedback treated as no feedback)
- New report streams in without errors

## Test 6: Done button freezes report and navigates

**Steps:**
1. Wait for report streaming to complete (result exists)
2. Verify "Done" button is now visible
3. Click "Done"

**Expected:**
- `freeze('report')` is called — report checkpoint becomes immutable
- Navigation to FinalReport view occurs
- FinalReport shows the full report with TOC sidebar

## Test 7: Frozen report phase shows in accordion

**Steps:**
1. After Test 6, navigate back to the research view
2. Observe the report phase in the accordion

**Expected:**
- Report phase shows as frozen (collapsed, summary badge)
- Badge indicates report is complete (e.g., ✅ with "Report generated")
- Expanding the frozen phase shows read-only report content

## Test 8: No auto-navigation without report checkpoint

**Steps:**
1. Start a new research session
2. Complete clarify → plan → research phases
3. When report starts streaming, do NOT click Done
4. Observe browser URL

**Expected:**
- URL stays on the research/accordion page (does NOT auto-navigate to /report)
- User remains in the accordion workspace until explicitly clicking Done
- Only after Done (which freezes report checkpoint) does navigation occur

## Test 9: Vietnamese i18n

**Steps:**
1. Switch UI language to Vietnamese (if language toggle available)
2. Navigate to report workspace

**Expected:**
- Feedback label, placeholder, Regenerate, Regenerating, Done, and empty report text all display in Vietnamese

## Test 10: Empty report state

**Steps:**
1. Start a new research session and fast-forward to report phase
2. Observe the report workspace before any content streams

**Expected:**
- Empty state shows centered text "Report will appear here as it is generated..."
- Feedback textarea is visible
- "Regenerate" button is enabled
- "Done" button is NOT visible (no result yet)
