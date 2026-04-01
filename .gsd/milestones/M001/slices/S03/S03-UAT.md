# S03: Research Engine Core — UAT

**Milestone:** M001
**Written:** 2026-03-31T18:40:05.170Z

# S03 UAT — Research Engine Core

## Preconditions
- Project dependencies installed (`pnpm install`)
- Test environment configured (no API keys needed — all tests use mocks)

---

## Test Case 1: Type System Validation

**Purpose:** Verify all Zod schemas validate correct input and reject invalid input.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Run `pnpm vitest run src/engine/research/__tests__/types.test.ts` | All 18 tests pass |
| 2 | Verify ResearchState enum has exactly 10 states | idle, clarifying, planning, searching, analyzing, reviewing, reporting, completed, failed, aborted |
| 3 | Verify ResearchConfig schema validates correct config | Accepts {query, stepModelMap, searchProvider} with valid values |
| 4 | Verify sourceSchema rejects missing required fields | Throws ZodError for objects missing url or title |
| 5 | Verify searchTaskSchema validates queries array | Accepts non-empty string arrays, rejects empty |
| 6 | Verify NoOpSearchProvider.search() returns empty results | Returns {results: [], images: []} for any query |

---

## Test Case 2: Prompt Template Functions

**Purpose:** Verify all 9 prompt functions produce correct output and resolvePrompt handles overrides.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Run `pnpm vitest run src/engine/research/__tests__/prompts.test.ts` | All 45 tests pass |
| 2 | Verify DEFAULT_PROMPTS has 9 entries | system, clarify, plan, serpQueries, analyze, review, report, outputGuidelines, rewrite |
| 3 | Call clarifyPrompt({query: "test"}) | Returns string containing "test" |
| 4 | Call resolvePrompt with override for 'clarify' | Returns overridden function for 'clarify', defaults for others |
| 5 | Verify prompts have zero runtime dependencies | grep confirms no AI SDK, React, or provider imports |

---

## Test Case 3: Full Pipeline State Transitions

**Purpose:** Verify orchestrator transitions through all states during a successful run.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Run `pnpm vitest run src/engine/research/__tests__/orchestrator.test.ts` | All 19 tests pass |
| 2 | Create orchestrator with mock models and run `orchestrator.run(config)` | State transitions: idle → clarifying → planning → searching → analyzing → reporting → completed |
| 3 | Collect state transition events | Each transition logged with `from` and `to` states |
| 4 | Verify ResearchResult is assembled | Contains title (from first markdown heading), report (string), learnings (array), sources (array), images (array) |

---

## Test Case 4: Event Emission

**Purpose:** Verify orchestrator emits correct typed lifecycle events.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Subscribe to 'step-start' events | Receives event with {step: 'clarify', timestamp} |
| 2 | Subscribe to 'step-delta' events | Receives streaming text chunks with {step, content} |
| 3 | Subscribe to 'step-complete' events | Receives event with {step, duration} — duration ≥ 0 |
| 4 | Unsubscribe mid-run | No further events received after unsubscribe call |
| 5 | Call destroy() | All handlers cleared, abort triggered if running |

---

## Test Case 5: Abort Handling

**Purpose:** Verify cancellation works at any step.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Start research run | State transitions to 'clarifying' |
| 2 | Call `orchestrator.abort()` | State transitions to 'aborted' |
| 3 | Call `orchestrator.abort()` again | No error thrown (idempotent) |
| 4 | Start new run after abort | New AbortController created, runs normally |

---

## Test Case 6: Error Handling

**Purpose:** Verify orchestrator handles model errors gracefully.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Configure mock model to throw error | Model throws during clarify step |
| 2 | Run orchestrator | Emits 'step-error' with {step: 'clarify', error, code} |
| 3 | Check final state | State is 'failed' |
| 4 | Verify error logging | Structured error log with step context |

---

## Test Case 7: Review Loop

**Purpose:** Verify the review loop cycles correctly and respects autoReviewRounds cap.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Set autoReviewRounds=1, mock review returning follow-up queries | After analyze, transitions to reviewing → searching (with follow-up queries) → analyzing → reporting → completed |
| 2 | Set autoReviewRounds=1, mock review returning 2 follow-up queries | Review loop runs exactly 1 round regardless of follow-up count |
| 3 | Set autoReviewRounds=0 | No review step — transitions directly from analyzing to reporting |

---

## Test Case 8: SERP Query Generation

**Purpose:** Verify structured output generates search queries.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Configure mock generateStructured to return ['q1', 'q2'] | Searching phase generates queries via generateObject |
| 2 | Verify search provider is called for each query | NoOpSearchProvider.search() called with each query |
| 3 | Verify empty SERP queries are handled | If generateStructured returns empty array, skips to reporting |

---

## Test Case 9: Model Resolution

**Purpose:** Verify per-step model resolution with fallbacks.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Configure stepModelMap with specific models per step | Each step resolves to the configured model |
| 2 | Omit a step from stepModelMap | Falls back to 'thinking' for clarify/plan/review/report, 'networking' for search/analyze |

---

## Test Case 10: Production Build Integration

**Purpose:** Verify engine code integrates cleanly with the rest of the project.

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Run `pnpm build` | Build succeeds with no TypeScript errors |
| 2 | Run `pnpm vitest run` (full suite) | All tests pass (engine + provider + other suites) |
| 3 | Verify no circular imports in barrel export | `src/engine/research/index.ts` re-exports without cycles |

