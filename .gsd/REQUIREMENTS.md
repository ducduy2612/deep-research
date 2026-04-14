# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R050 — Research store restructured with immutable `checkpoints` object (clarify, plan, research) and mutable `workspace` object scoped to the active phase. Frozen checkpoint data is never mutated after phase completion.
- Class: core-capability
- Status: active
- Description: Research store restructured with immutable `checkpoints` object (clarify, plan, research) and mutable `workspace` object scoped to the active phase. Frozen checkpoint data is never mutated after phase completion.
- Why it matters: Enables the frozen/active workspace model — the architectural foundation for all other M003 features.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Must preserve backward compatibility with existing SSE event handling and hydration.

### R051 — Active workspace state (edits, partial results, suggestion text, manual queries) persists to localforage and survives browser refresh. On rehydration, mid-stream states convert to nearest awaiting_* state as before, but workspace edits are restored.
- Class: continuity
- Status: active
- Description: Active workspace state (edits, partial results, suggestion text, manual queries) persists to localforage and survives browser refresh. On rehydration, mid-stream states convert to nearest awaiting_* state as before, but workspace edits are restored.
- Why it matters: Users shouldn't lose their in-progress work on refresh. Current persistence only saves checkpoint-level data.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: M003/S02
- Validation: unmapped
- Notes: Extends existing auto-persist subscription and Zod-validated schema.

### R052 — Each search result is an editable card. User can: delete a card (removes query + learning + sources from accumulated data), retry a failed/bad query (re-search only, single query), and add manual queries (queued for next "More Research" batch).
- Class: primary-user-loop
- Status: active
- Description: Each search result is an editable card. User can: delete a card (removes query + learning + sources from accumulated data), retry a failed/bad query (re-search only, single query), and add manual queries (queued for next "More Research" batch).
- Why it matters: The research phase is where users spend the most time. Without CRUD control, they're passive observers of whatever the AI decides to search.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Delete removes everything (query, learning, sources) from downstream data. Retry is search-only (not analyze). Manual queries queue for next batch.

### R053 — Suggestion input appears pre-fill when user is about to click "More Research". Included in review prompt so AI generates follow-up queries aligned with user's direction. One review round per click.
- Class: primary-user-loop
- Status: active
- Description: Suggestion input appears pre-fill when user is about to click "More Research". Included in review prompt so AI generates follow-up queries aligned with user's direction. One review round per click.
- Why it matters: Gives users steering control over research depth and direction without overwhelming them with options.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Suggestion is consumed only when "More Research" is clicked, not continuously.

### R054 — An explicit "Finalize Findings" button that freezes the research phase, converting workspace data (learnings, sources, images) into an immutable checkpoint before proceeding to report.
- Class: core-capability
- Status: active
- Description: An explicit "Finalize Findings" button that freezes the research phase, converting workspace data (learnings, sources, images) into an immutable checkpoint before proceeding to report.
- Why it matters: The user must be in control of when research is "done". Auto-freezing would cut short iterative deepening.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped

### R055 — Accordion layout where completed phases are collapsed (showing summary badge) and read-only, while the active phase is expanded and editable. Clear visual distinction between frozen and active states.
- Class: core-capability
- Status: active
- Description: Accordion layout where completed phases are collapsed (showing summary badge) and read-only, while the active phase is expanded and editable. Clear visual distinction between frozen and active states.
- Why it matters: Gives users a clear sense of progress — "I've locked in clarify, I've locked in plan, I'm working on research now."
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Frozen phases show summary (e.g. "3 questions answered"). Click to expand read-only. Active phase takes full workspace.

### R056 — User explicitly clicks a freeze/submit button to lock in the clarify and plan phases. No auto-freezing on stream end.
- Class: core-capability
- Status: active
- Description: User explicitly clicks a freeze/submit button to lock in the clarify and plan phases. No auto-freezing on stream end.
- Why it matters: User control over phase transitions. Current behavior (Submit Feedback & Plan) already does this for clarify — extend consistently.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped

### R057 — Report phase is a feedback workspace, not an editor. User sees the streamed report and can write comments/requirements. "Regenerate" sends frozen inputs + user feedback to AI for report rewrite. Multiple regeneration rounds possible.
- Class: primary-user-loop
- Status: active
- Description: Report phase is a feedback workspace, not an editor. User sees the streamed report and can write comments/requirements. "Regenerate" sends frozen inputs + user feedback to AI for report rewrite. Multiple regeneration rounds possible.
- Why it matters: Allows iterative refinement without the complexity of inline editing. Simpler and more predictable than freeform editing.
- Source: user
- Primary owning slice: M003/S04
- Supporting slices: none
- Validation: unmapped
- Notes: No inline report text editing. User writes feedback, AI regenerates entire report from frozen checkpoint data.

### R058 — User can download the final report as a .md file with proper filename (derived from report title or topic).
- Class: core-capability
- Status: active
- Description: User can download the final report as a .md file with proper filename (derived from report title or topic).
- Why it matters: Most basic export format — users need to get their report out of the app.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Trivial — Blob download from report markdown string.

### R059 — User can export the final report as PDF, generated entirely client-side using html2pdf.js (markdown → HTML via marked → render to DOM → html2pdf.js capture).
- Class: core-capability
- Status: active
- Description: User can export the final report as PDF, generated entirely client-side using html2pdf.js (markdown → HTML via marked → render to DOM → html2pdf.js capture).
- Why it matters: PDF is the most common sharing format. Client-side generation avoids server dependencies.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Uses html2pdf.js (already established pattern). marked already in deps for HTML conversion.

### R060 — User can export individual or all search results as Markdown or JSON from the research workspace.
- Class: core-capability
- Status: active
- Description: User can export individual or all search results as Markdown or JSON from the research workspace.
- Why it matters: Researchers often need raw data separate from the report for their own analysis.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: M003/S03
- Validation: unmapped

### R061 — User can add search result content (learning + sources) directly to the knowledge base from the research workspace.
- Class: integration
- Status: active
- Description: User can add search result content (learning + sources) directly to the knowledge base from the research workspace.
- Why it matters: Bridges research and knowledge base — useful findings get persisted for future research sessions.
- Source: inferred
- Primary owning slice: M003/S05
- Supporting slices: M003/S03
- Validation: unmapped

### R062 — Completed phases display a "frozen" badge (e.g. ✅ icon, muted styling) and their content is non-editable. Active phase has distinct visual treatment (glowing border, primary color accent).
- Class: core-capability
- Status: active
- Description: Completed phases display a "frozen" badge (e.g. ✅ icon, muted styling) and their content is non-editable. Active phase has distinct visual treatment (glowing border, primary color accent).
- Why it matters: Visual clarity about what's locked vs what's editable prevents user confusion.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped

### R067 — The review phase sends accumulated learnings, sources, and images to the AI so it can identify gaps rather than re-searching what was already found. This fixes the duplication problem in the current "More Research" implementation.
- Class: core-capability
- Status: active
- Description: The review phase sends accumulated learnings, sources, and images to the AI so it can identify gaps rather than re-searching what was already found. This fixes the duplication problem in the current "More Research" implementation.
- Why it matters: Without learnings context, the AI regenerates SERP queries from the plan alone, duplicating previous search work. Sending learnings produces targeted, gap-filling queries.
- Source: user
- Primary owning slice: M004/S02
- Validation: mapped

## Validated

### R063 — The research phase (search+analyze) runs at most 2 cycles per SSE connection invocation, then returns remainingQueries. Client auto-reconnects for the next batch. timeBudgetMs defaults to 180s as a safety net.
- Class: core-capability
- Status: validated
- Description: The research phase (search+analyze) runs at most 2 cycles per SSE connection invocation, then returns remainingQueries. Client auto-reconnects for the next batch. timeBudgetMs defaults to 180s as a safety net.
- Why it matters: Each SSE connection must finish well within Vercel Hobby's 300s serverless function limit. Without batching, research can loop for 780s — unrecoverable on Hobby.
- Source: user
- Primary owning slice: M004/S01
- Validation: Validated by T01 cycle cap tests (3 tests: cap hit returns remaining, default cap is 2, under-cap executes all), T04 full test suite (796 pass). timeBudgetMs default confirmed at 180s in orchestrator.ts line 533. maxCyclesPerInvocation default confirmed at 2 in types.ts.

### R064 — The full pipeline (phase=full, single SSE connection running clarify→plan→research→report) is completely removed from the API route, hook, and types. All entry points use the multi-phase flow.
- Class: core-capability
- Status: validated
- Description: The full pipeline (phase=full, single SSE connection running clarify→plan→research→report) is completely removed from the API route, hook, and types. All entry points use the multi-phase flow.
- Why it matters: The full pipeline is architecturally incompatible with serverless timeout constraints. Removing it eliminates dead code and forces the correct multi-phase pattern.
- Source: user
- Primary owning slice: M004/S01
- Validation: Validated by T02 (fullSchema/handleFullPhase/Phase 'full' all removed from route.ts, reviewSchema/handleReviewPhase added), T04 (start() removed from orchestrator, runPlan/runReviewLoop removed, all tests converted to phase methods). grep confirms zero references to start(), full phase, or fullSchema in source files.

### R065 — Auto-review and manual "More Research" use the same phase:review SSE endpoint. Both send existing learnings to the AI so it generates targeted follow-up queries. AI generates at most 1 follow-up query per review round. Auto-review triggers N rounds after research completes (configurable). Manual review includes user suggestion/manual queries as direction.
- Class: primary-user-loop
- Status: validated
- Description: Auto-review and manual "More Research" use the same phase:review SSE endpoint. Both send existing learnings to the AI so it generates targeted follow-up queries. AI generates at most 1 follow-up query per review round. Auto-review triggers N rounds after research completes (configurable). Manual review includes user suggestion/manual queries as direction.
- Why it matters: Eliminates blind duplication where "More Research" regenerated queries without seeing what was already found. Unified phase simplifies the API surface and gives both paths the same smart behavior.
- Source: user
- Primary owning slice: M004/S02
- Validation: S02 implemented auto-review using the same phase:review SSE endpoint as manual "More Research". The auto-review trigger in use-research.ts fires after research completes with state=awaiting_results_review and autoReviewRoundsRemaining > 0. Both paths go through reviewOnly() which sends accumulated learnings. Verified by store auto-review trigger tests and build/tests passing (823 tests).

### R066 — When auto-review triggers after research completes, the UI shows a visible state ("Auto-review round 1/N...") with a progress indicator. User can abort at any time. Auto-review does not happen silently.
- Class: primary-user-loop
- Status: validated
- Description: When auto-review triggers after research completes, the UI shows a visible state ("Auto-review round 1/N...") with a progress indicator. User can abort at any time. Auto-review does not happen silently.
- Why it matters: Users need to know what the system is doing and maintain control. Silent auto-review would feel like the app is stuck or doing something unexpected.
- Source: user
- Primary owning slice: M004/S02
- Validation: S02 added autoReviewCurrentRound/TotalRounds to store, rendered in ResearchActions as "Auto-review round N/M..." banner with Loader2 spinner during auto-review (state=reviewing, autoReviewCurrentRound > 0). Abort button resets autoReviewRoundsRemaining to 0 and calls SSE abort. Verified by ResearchActions.test.tsx (12 tests for banner visibility, button hiding, abort click) and build passing.

### R068 — Every SSE connection (research, review, clarify, plan, report) must complete within 300s, the Vercel Hobby serverless function hard limit. Research batches at ~160s, review at ~70s, all others well under 60s.
- Class: constraint
- Status: validated
- Description: Every SSE connection (research, review, clarify, plan, report) must complete within 300s, the Vercel Hobby serverless function hard limit. Research batches at ~160s, review at ~70s, all others well under 60s.
- Why it matters: This is the hard constraint driving the entire milestone. Hitting the 300s wall causes hard-kill with no graceful exit, losing partial work.
- Source: user
- Primary owning slice: M004/S01
- Validation: Validated by T01 (timeBudgetMs=180s default), T02 (maxDuration=300 in route.ts line 19), T01 (cycle cap 2×80s≈160s per connection), T02 (review phase ~70s). All SSE connections now respect 300s limit through cycle cap + time budget + maxDuration triple constraint.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R050 | core-capability | active | M003/S01 | none | unmapped |
| R051 | continuity | active | M003/S01 | M003/S02 | unmapped |
| R052 | primary-user-loop | active | M003/S03 | none | unmapped |
| R053 | primary-user-loop | active | M003/S03 | none | unmapped |
| R054 | core-capability | active | M003/S03 | none | unmapped |
| R055 | core-capability | active | M003/S02 | none | unmapped |
| R056 | core-capability | active | M003/S02 | none | unmapped |
| R057 | primary-user-loop | active | M003/S04 | none | unmapped |
| R058 | core-capability | active | M003/S05 | none | unmapped |
| R059 | core-capability | active | M003/S05 | none | unmapped |
| R060 | core-capability | active | M003/S05 | M003/S03 | unmapped |
| R061 | integration | active | M003/S05 | M003/S03 | unmapped |
| R062 | core-capability | active | M003/S02 | none | unmapped |
| R063 | core-capability | validated | M004/S01 | none | Validated by T01 cycle cap tests (3 tests: cap hit returns remaining, default cap is 2, under-cap executes all), T04 full test suite (796 pass). timeBudgetMs default confirmed at 180s in orchestrator.ts line 533. maxCyclesPerInvocation default confirmed at 2 in types.ts. |
| R064 | core-capability | validated | M004/S01 | none | Validated by T02 (fullSchema/handleFullPhase/Phase 'full' all removed from route.ts, reviewSchema/handleReviewPhase added), T04 (start() removed from orchestrator, runPlan/runReviewLoop removed, all tests converted to phase methods). grep confirms zero references to start(), full phase, or fullSchema in source files. |
| R065 | primary-user-loop | validated | M004/S02 | none | S02 implemented auto-review using the same phase:review SSE endpoint as manual "More Research". The auto-review trigger in use-research.ts fires after research completes with state=awaiting_results_review and autoReviewRoundsRemaining > 0. Both paths go through reviewOnly() which sends accumulated learnings. Verified by store auto-review trigger tests and build/tests passing (823 tests). |
| R066 | primary-user-loop | validated | M004/S02 | none | S02 added autoReviewCurrentRound/TotalRounds to store, rendered in ResearchActions as "Auto-review round N/M..." banner with Loader2 spinner during auto-review (state=reviewing, autoReviewCurrentRound > 0). Abort button resets autoReviewRoundsRemaining to 0 and calls SSE abort. Verified by ResearchActions.test.tsx (12 tests for banner visibility, button hiding, abort click) and build passing. |
| R067 | core-capability | active | M004/S02 | none | mapped |
| R068 | constraint | validated | M004/S01 | none | Validated by T01 (timeBudgetMs=180s default), T02 (maxDuration=300 in route.ts line 19), T01 (cycle cap 2×80s≈160s per connection), T02 (review phase ~70s). All SSE connections now respect 300s limit through cycle cap + time budget + maxDuration triple constraint. |

## Coverage Summary

- Active requirements: 14
- Mapped to slices: 14
- Validated: 5 (R063, R064, R065, R066, R068)
- Unmapped active requirements: 0
