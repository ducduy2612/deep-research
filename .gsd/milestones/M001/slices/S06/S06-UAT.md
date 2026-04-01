# S06: Settings and History — UAT

**Milestone:** M001
**Written:** 2026-03-31T20:53:36.547Z

# S06 UAT — Settings and History

## Preconditions
- App running at http://localhost:3000
- No previous history sessions (fresh IndexedDB)
- At least one AI provider configured with a valid API key (for auto-save test)

---

## Test Case 1: Settings Dialog Opens and Displays Tabs

1. Click the Settings button in the app header
2. **Expected:** Settings dialog opens with 4 tabs visible: AI Models, Search, General, Advanced
3. **Expected:** Dialog has glassmorphism styling (semi-transparent backdrop with blur)
4. Click each tab in sequence (AI Models → Search → General → Advanced)
5. **Expected:** Each tab renders its content without errors

## Test Case 2: AI Models Tab — Provider Configuration

1. Open Settings → AI Models tab
2. **Expected:** 6 provider cards visible: Google, OpenAI, DeepSeek, OpenRouter, Groq, xAI
3. Enter an API key in the Google provider card (e.g., `test-key-123`)
4. Click Save on that provider card
5. **Expected:** API key appears masked (••••••••) after save
6. Toggle the enable switch on a provider
7. **Expected:** Toggle state changes visually
8. Close and reopen Settings → AI Models
9. **Expected:** Previously entered API key still present (persisted)

## Test Case 3: Search Tab — Provider Selection and Filters

1. Open Settings → Search tab
2. **Expected:** 6 search providers listed: Tavily, Firecrawl, Exa, Brave, SearXNG, Model Native
3. Select "Tavily" as the search provider
4. **Expected:** API key input appears for Tavily
5. Select "SearXNG"
6. **Expected:** Base URL input appears (required for self-hosted)
7. Enter domains in include filter (one per line): `wikipedia.org`, `github.com`
8. Enter domains in exclude filter: `reddit.com`
9. Toggle "Citation Images" on/off
10. **Expected:** Toggle state changes
11. Close and reopen Settings → Search
12. **Expected:** Previously entered values persist

## Test Case 4: General Tab — Report Config and Sliders

1. Open Settings → General tab
2. **Expected:** Language text input visible
3. Click different report style buttons: Balanced, Executive, Technical, Concise
4. **Expected:** Selected style is highlighted
5. Click different report length buttons: Brief, Standard, Comprehensive
6. **Expected:** Selected length is highlighted
7. Move the "Auto Review Rounds" slider from 0 to 3
8. **Expected:** Label updates to show current value (3)
9. Move the "Max Search Queries" slider from 8 to 15
10. **Expected:** Label updates to show current value (15)
11. Close and reopen Settings → General
12. **Expected:** All values persist

## Test Case 5: Advanced Tab — Prompt Overrides and Reset

1. Open Settings → Advanced tab
2. **Expected:** 8 labeled textareas visible (System, Clarify, Plan, SERP Queries, Analyze, Review, Report, Output Guidelines)
3. Type a custom prompt in the "System" textarea: "You are a helpful research assistant."
4. Click outside the textarea (blur)
5. **Expected:** Override is saved (no visual feedback needed, persists silently)
6. Close and reopen Settings → Advanced
7. **Expected:** Custom system prompt text still present
8. Click "Reset All Settings" button
9. **Expected:** All settings reset to defaults (API keys cleared, overrides emptied, sliders at defaults)

## Test Case 6: History Dialog — Empty State

1. Click the History button in the app header (or navigate via UI)
2. **Expected:** History dialog opens
3. **Expected:** Empty state message shown (no past sessions)
4. **Expected:** Stats row shows: 0 sessions, 0 this week, 0 sources

## Test Case 7: History Auto-Save on Research Completion

1. Enter a research topic and start a research session
2. Wait for the research to complete successfully (done event)
3. Open the History dialog
4. **Expected:** New session card appears with the research topic as title
5. **Expected:** Status badge shows "Completed" in green
6. **Expected:** Relative timestamp shown (e.g., "just now")
7. **Expected:** Source count is accurate

## Test Case 8: History — Filter and Search

1. Open History dialog with multiple sessions present
2. Click "Completed" filter chip
3. **Expected:** Only completed sessions shown
3. Click "Failed" filter chip
4. **Expected:** Only failed sessions shown (or empty if none)
5. Click "All" filter chip
6. **Expected:** All sessions shown
7. Type a search term in the search input matching a session title
8. **Expected:** Only matching sessions shown

## Test Case 9: History — View Report and Delete

1. Open History dialog
2. Click "View Report" on a completed session card
3. **Expected:** Dialog closes, research store loads session data, report view displays the past report
4. Reopen History dialog
5. Click "Delete" on a session card
6. **Expected:** Confirmation prompt appears
7. Confirm deletion
8. **Expected:** Session removed from list, total count decreases

## Test Case 10: FIFO Quota (Boundary)

1. This test requires programmatic setup — create 100 sessions via the store
2. Save a 101st session
3. **Expected:** Oldest session is automatically removed
4. **Expected:** Total session count remains at 100
5. Verify via console that a warning was logged about eviction

## Test Case 11: Aborted Research Does Not Auto-Save

1. Start a research session
2. Abort the research before completion
3. Open History dialog
4. **Expected:** No new session saved for the aborted research (auto-save only triggers on done event with result)

## Test Case 12: Corrupted Storage Graceful Fallback

1. This test requires programmatic setup — inject malformed data into localforage "history" key
2. Refresh the app
3. **Expected:** History dialog shows empty state (Zod validation rejects corrupted data, falls back to empty)
4. **Expected:** No crash or error dialog shown to user
