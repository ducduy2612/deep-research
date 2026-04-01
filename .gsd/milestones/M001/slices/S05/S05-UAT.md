# S05: Core Research UI — UAT

**Milestone:** M001
**Written:** 2026-03-31T20:22:28.505Z

# S05 UAT — Core Research UI

## Preconditions
- App running at `http://localhost:3000` via `pnpm dev`
- At least one AI provider API key configured in `.env.local` (e.g., `GOOGLE_GENERATIVE_AI_API_KEY`)
- At least one search provider API key configured (e.g., `TAVILY_API_KEY`)

---

## Test 1: Research Hub Screen Renders

**Steps:**
1. Navigate to `http://localhost:3000`
2. Verify the page loads with Obsidian Deep dark theme (dark background, no light mode)

**Expected:**
- Header visible with Deep Research logo and navigation buttons
- Central glassmorphism card with textarea visible
- "Start Research" button visible and enabled
- ReportConfig panel visible with style selector (Balanced, Executive, Technical, Concise) and length selector (Brief, Standard, Comprehensive)

---

## Test 2: Topic Input and Configuration

**Steps:**
1. Click the topic textarea
2. Type "What are the latest advances in quantum computing?"
3. Verify text appears in textarea
4. Click each style option (Balanced, Executive, Technical, Concise)
5. Click each length option (Brief, Standard, Comprehensive)

**Expected:**
- Textarea accepts input and displays typed text
- Style selector highlights the selected option
- Length selector highlights the selected option
- Only one option selected per category at a time

---

## Test 3: Research Start and Active Research View

**Steps:**
1. With a topic entered, click "Start Research"
2. Observe view transition from Hub to Active Research

**Expected:**
- View switches to Active Research screen
- WorkflowProgress bar appears at top showing research steps
- 3-panel resizable layout appears:
  - Left panel: questions/sources section
  - Center panel: streaming research content cards
  - Right panel: activity log with timestamped entries
- Panels are resizable via drag handles
- Elapsed timer starts counting

---

## Test 4: Streaming Progress Display

**Steps:**
1. While research is active, observe the center panel
2. Wait for content to stream in

**Expected:**
- Streaming text appears incrementally in center panel cards
- Activity log in right panel updates with step transitions
- WorkflowProgress shows current step highlighted
- No console errors in browser DevTools

---

## Test 5: Abort Research

**Steps:**
1. While research is in progress, click the abort/stop button in the header or active research
2. Observe the UI response

**Expected:**
- Research stops processing
- Partial results remain visible in the UI
- Activity log shows abort event
- Timer stops

---

## Test 6: Final Report Display

**Steps:**
1. Start a new research session and let it complete (or use a short topic like "What is 2+2?")
2. Wait for research to finish
3. Observe view transition to Final Report

**Expected:**
- View auto-navigates to report view on completion
- Markdown report renders with Obsidian Deep styling
- Right sidebar shows Table of Contents (if headers present) and Sources list
- Source references are clickable
- Report content includes citations where applicable

---

## Test 7: Return to Hub

**Steps:**
1. From the Final Report view, click "New Research" or the logo/home button in the header
2. Observe navigation back to Hub

**Expected:**
- View switches back to Hub screen
- TopicInput is cleared and ready for new input
- Previous report configuration (style/length) persists from settings store

---

## Test 8: Error Handling — No API Key

**Steps:**
1. Remove all API keys from `.env.local`
2. Restart dev server
3. Enter a topic and click "Start Research"

**Expected:**
- Error toast notification appears via sonner
- Error message is descriptive (e.g., "No API key configured")
- UI does not crash or freeze
- User remains on active view with error state visible

---

## Test 9: Settings Persistence Across Reload

**Steps:**
1. Navigate to Hub, select "Technical" style and "Comprehensive" length
2. Reload the page (F5)
3. Verify settings are restored

**Expected:**
- After reload, Hub view renders
- ReportConfig shows "Technical" style selected
- ReportConfig shows "Comprehensive" length selected
- Settings hydrated from localforage on app startup

---

## Test 10: Responsive Layout

**Steps:**
1. Open browser DevTools, toggle to mobile viewport (375×812)
2. Verify Hub layout adapts
3. Start research, verify Active Research adapts

**Expected:**
- Hub stacks vertically on mobile
- TopicInput and ReportConfig remain usable
- Active Research panels may stack or collapse on small screens
- No horizontal overflow
- All text remains readable
