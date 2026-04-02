---
estimated_steps: 12
estimated_files: 0
skills_used: []
---

# T13: Browser verification of complete interactive flow (proxy mode)

Start dev server (`pnpm dev`) and walk through the complete interactive research flow in the browser (`http://localhost:3000`) **using proxy mode** — API keys are read from `.env.local` server-side, not entered in the client settings UI.

## Pre-conditions

1. `.env.local` must contain at least one AI provider key (e.g., `GOOGLE_GENERATIVE_AI_API_KEY=...`)
2. Optionally `TAVILY_API_KEY` (or another search provider key) for the search phase
3. Dev server reads keys via `buildProviderConfigs()` in `src/lib/api-config.ts` → no client-side key entry needed
4. In proxy mode the client does **not** send API keys; the server injects them from `process.env`

## Step-by-step walkthrough:

1. **Launch browser** → navigate to `http://localhost:3000`
2. **Enter topic** in TopicInput → triggers `clarify()` (not `start()`)
3. **Verify** state transitions to `clarifying` → ClarifyPanel streams questions from server
4. **State → `awaiting_feedback`** — edit questions (markdown toggle), add feedback, click "Write Report Plan" → calls `submitFeedbackAndPlan()`
5. **Verify** state transitions to `planning` → PlanPanel streams plan
6. **State → `awaiting_plan_review`** — edit plan (markdown toggle), click "Start Research" → calls `approvePlanAndResearch()`
7. **Verify** state transitions through `searching` → `analyzing` → `reviewing` with streaming cards
8. **State → `awaiting_results_review`** — ResearchActions shows suggestion textarea + "Continue Research" + "Generate Report"
9. **Add suggestion**, click "Continue Research" → calls `requestMoreResearch()` → returns to `searching`
10. **Click "Generate Report"** → calls `generateReport()` → state transitions to `reporting`
11. **Verify** final report streams in → state transitions to `completed`
12. **Verify cross-cutting concerns** (see below)

## Cross-cutting verifications

- WorkflowProgress shows multi-phase states (Pause icon + amber for awaiting-user, Loader2 + primary for streaming)
- Elapsed timer tracks total time across all phases (doesn't reset between phases)
- ActiveResearchRight panel populates with search results
- Abort at each active phase (clarifying, planning, searching, reporting) works cleanly
- Reset returns to idle state
- **No console errors** throughout
- Dark mode renders correctly (Obsidian Deep tokens)
- i18n strings render in both en and vi locales

## Abort & reset sub-test

After completing the full flow once, verify abort behavior:
1. Start a new research topic
2. During `clarifying` phase → click abort → verify clean stop
3. Start again → during `searching` phase → click abort → verify clean stop
4. Click reset → verify return to idle state

## Inputs

- `Working application with dev server running`
- `API keys configured in .env.local (proxy mode)`

## Expected Output

- `Browser verification of complete interactive flow with all steps passing — proxy mode confirmed working`

## Verification

Manual walkthrough in browser using browser automation tools — no console errors, all state transitions correct, API keys sourced from server-side env
