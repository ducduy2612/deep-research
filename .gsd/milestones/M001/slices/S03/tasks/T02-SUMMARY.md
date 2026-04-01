---
id: T02
parent: S03
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/engine/research/prompts.ts", "src/engine/research/__tests__/prompts.test.ts"]
key_decisions: ["Ported old template string constants into explicit pure functions with typed parameters instead of simple string interpolation with placeholders", "Used Parameters<typeof DEFAULT_PROMPTS[key]> for resolvePrompt args type to preserve function signatures"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 45 new prompt tests pass. Full suite of 126 tests passes with no regressions. grep confirms 0 matches for AI SDK, React, or provider imports. Only import is type-only from ./types."
completed_at: 2026-03-31T17:59:17.351Z
blocker_discovered: false
---

# T02: Created 9 pure prompt template functions with typed parameters, DEFAULT_PROMPTS map, and resolvePrompt override resolver

> Created 9 pure prompt template functions with typed parameters, DEFAULT_PROMPTS map, and resolvePrompt override resolver

## What Happened
---
id: T02
parent: S03
milestone: M001
key_files:
  - src/engine/research/prompts.ts
  - src/engine/research/__tests__/prompts.test.ts
key_decisions:
  - Ported old template string constants into explicit pure functions with typed parameters instead of simple string interpolation with placeholders
  - Used Parameters<typeof DEFAULT_PROMPTS[key]> for resolvePrompt args type to preserve function signatures
duration: ""
verification_result: passed
completed_at: 2026-03-31T17:59:17.352Z
blocker_discovered: false
---

# T02: Created 9 pure prompt template functions with typed parameters, DEFAULT_PROMPTS map, and resolvePrompt override resolver

**Created 9 pure prompt template functions with typed parameters, DEFAULT_PROMPTS map, and resolvePrompt override resolver**

## What Happened

Created `src/engine/research/prompts.ts` with 9 pure prompt functions ported from the old codebase, modernized into explicit typed functions: `getSystemPrompt(language?)`, `getClarifyPrompt(topic)`, `getPlanPrompt(topic)`, `getSerpQueriesPrompt(plan, maxQueries)`, `getAnalyzePrompt(query, researchGoal)`, `getSearchResultPrompt(query, researchGoal, context)`, `getReviewPrompt(plan, learnings, suggestion?)`, `getReportPrompt(plan, learnings, sources, images, requirements?)`, and `getOutputGuidelinesPrompt()`. Also created `DEFAULT_PROMPTS` record mapping all PromptOverrideKey values to their functions and `resolvePrompt(key, overrides, ...args)` that returns the override string or calls the default function. The only import is a type-only import from `./types` — no AI SDK, React, or provider dependencies. Created 45 comprehensive tests covering all functions, parameter variations, and the override resolver.

## Verification

All 45 new prompt tests pass. Full suite of 126 tests passes with no regressions. grep confirms 0 matches for AI SDK, React, or provider imports. Only import is type-only from ./types.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/engine/research/__tests__/prompts.test.ts` | 0 | ✅ pass | 109ms |
| 2 | `pnpm vitest run (full suite)` | 0 | ✅ pass | 208ms |
| 3 | `grep -c 'import.*from.*ai' src/engine/research/prompts.ts` | 0 | ✅ pass (0 AI imports) | 1ms |
| 4 | `grep -c 'import.*from.*react' src/engine/research/prompts.ts` | 0 | ✅ pass (0 React imports) | 1ms |
| 5 | `grep -c 'import.*from.*provider' src/engine/research/prompts.ts` | 0 | ✅ pass (0 provider imports) | 1ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/engine/research/prompts.ts`
- `src/engine/research/__tests__/prompts.test.ts`


## Deviations
None.

## Known Issues
None.
