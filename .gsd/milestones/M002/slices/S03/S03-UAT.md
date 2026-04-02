# S03: Hook + UI: Interactive Research Flow Components — UAT

**Milestone:** M002
**Written:** 2026-04-02T11:21:27.538Z

# S03 UAT: Interactive Research Flow Components

## Pre-conditions
- Dev server running (`pnpm dev`)
- `.env.local` configured with at least one AI provider API key

## Test 1: Clarification Phase
1. Navigate to http://localhost:3000
2. Enter a research topic in TopicInput
3. Click submit
4. **Verify:** Center panel shows streamed clarification questions
5. **Verify:** Questions appear incrementally (streaming)
6. **Verify:** WorkflowProgress shows clarifying step with Loader2 icon

## Test 2: Feedback and Plan Generation
1. After questions stream in, click "Preview" toggle to verify raw markdown editing
2. Toggle back to preview
3. Type feedback in the feedback textarea
4. Click "Write Report Plan"
5. **Verify:** Center panel transitions to streamed plan content
6. **Verify:** WorkflowProgress shows planning step

## Test 3: Plan Review and Research
1. After plan streams in, click "Preview" toggle to verify editable textarea
2. Click "Start Research"
3. **Verify:** Center panel transitions to search/analysis progress
4. **Verify:** Sources appear in right panel as they're found

## Test 4: Results Review and Report Generation
1. After research completes, verify ResearchActions panel appears
2. **Verify:** Learnings count and sources count badges display correctly
3. Click "Generate Report"
4. **Verify:** Center panel shows streamed report
5. **Verify:** Final report renders with markdown formatting

## Test 5: State Indicators
1. During streaming phases, verify WorkflowProgress shows Loader2 icon in primary color
2. During awaiting-user states, verify WorkflowProgress shows Pause icon in amber color
3. **Verify:** Timer displays and persists across phase transitions

## Test 6: Backward Compatibility
1. If `start()` is called (single full pipeline), verify it still works end-to-end without checkpoint panels
