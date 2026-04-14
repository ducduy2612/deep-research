# S01: Engine + API timeout overhaul — UAT

**Milestone:** M004
**Written:** 2026-04-14T17:47:52.673Z

# UAT: S01 — Engine + API Timeout Overhaul

## Preconditions

1. Application running at `http://localhost:3000` (`pnpm dev`)
2. Valid Google Gemini API key configured in `.env.local`
3. Browser DevTools open with Network tab filtered to SSE requests

---

## Test Case 1: Research respects 2-cycle cap

**Purpose:** Verify research stops after 2 search-analyze cycles per SSE connection.

1. Start a new research session with topic "Quantum computing advances 2024-2026"
2. Submit clarification answers → approve plan → research starts
3. In DevTools Network tab, observe the SSE connection for the research phase
4. **Expected:** Connection closes after 2 search-analyze cycles (step-start → step-complete counts)
5. **Expected:** If more queries remain, client auto-reconnects with next batch
6. **Expected:** Each connection stays under ~160s (well within 300s limit)

## Test Case 2: Full pipeline is removed

**Purpose:** Verify no code path supports phase=full.

1. Open browser DevTools Console
2. Attempt to send SSE request with `phase: "full"`:
   ```js
   fetch('/api/research/stream', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ phase: 'full', topic: 'test' })
   }).then(r => r.text()).then(console.log)
   ```
3. **Expected:** Response returns 400 error with "Unknown phase" message
4. **Expected:** No `phase: "full"` option appears in any TypeScript type hint

## Test Case 3: Review phase works via "More Research"

**Purpose:** Verify requestMoreResearch sends phase:review with structured data.

1. Complete a research session through to the report phase
2. On the research workspace, type a suggestion in the suggestion textarea (e.g., "Focus on error correction")
3. Click "More Research" button
4. In DevTools Network tab, inspect the SSE request payload
5. **Expected:** Request body contains `phase: "review"`, `plan`, `learnings`, `sources`, `images`, and `suggestion` fields
6. **Expected:** SSE stream emits `review-result` events with merged learnings/sources/images
7. **Expected:** Store accumulates new data into existing result (not replacing)

## Test Case 4: Auto-review trigger fires when configured

**Purpose:** Verify auto-review loop triggers based on autoReviewRoundsRemaining.

1. Open Settings → Advanced tab
2. Set autoReviewRounds to 1 (if the setting exists)
3. Start a new research session and complete through research phase
4. When research completes and state transitions to `awaiting_results_review`
5. **Expected:** Auto-review SSE connection fires automatically (without user action)
6. **Expected:** `autoReviewRoundsRemaining` decrements from 1 to 0
7. **Expected:** No further auto-review rounds fire after counter reaches 0

## Test Case 5: start() method is removed from hook

**Purpose:** Verify the backward-compat start() method no longer exists.

1. Open browser DevTools Console on the research page
2. Inspect the useResearch hook return value
3. **Expected:** `start` property is undefined or absent
4. **Expected:** `clarify` method is the only entry point for initiating research
5. **Expected:** No TypeScript errors in use-research.ts

## Test Case 6: maxDuration=300 on SSE route

**Purpose:** Verify the route exports correct maxDuration.

1. Check source: `src/app/api/research/stream/route.ts` line 19
2. **Expected:** `export const maxDuration = 300;`
3. When deployed to Vercel, verify serverless function timeout is 300s in Vercel dashboard

## Test Case 7: timeBudgetMs default is 180s

**Purpose:** Verify the safety-net time budget is 180 seconds.

1. Check source: `src/engine/research/orchestrator.ts` line 533
2. **Expected:** `const timeBudgetMs = this.config.timeBudgetMs ?? 180_000;`
3. If a research cycle somehow runs >180s, verify it stops gracefully with partial results

## Test Case 8: Review handles abort gracefully

**Purpose:** Verify review phase handles user cancellation.

1. Trigger a "More Research" action (review phase)
2. Immediately click abort/cancel
3. **Expected:** SSE connection closes cleanly
4. **Expected:** Store remains in `awaiting_results_review` state (not failed)
5. **Expected:** User can trigger another "More Research" after abort

---

## Edge Cases

- **EC1**: Research with only 1 query should complete in 1 cycle (under the cap) without reconnect
- **EC2**: Research with 0 queries after plan should skip research phase entirely
- **EC3**: Review with no suggestion should still generate follow-up queries from learnings alone
- **EC4**: Auto-review with autoReviewRounds=0 should never fire automatically
- **EC5**: Multiple rapid "More Research" clicks should queue (not overlap) — verify abort handling
