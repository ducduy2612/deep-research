---
estimated_steps: 4
estimated_files: 2
skills_used: []
---

# T02: Create prompt templates with override support

Port prompt templates from the old codebase into pure functions that return prompt strings. Each function takes explicit inputs (no global state). Include PromptOverrides type and resolvePrompts() that merges overrides onto defaults. Prompts needed: system, clarify, plan, serpQueries, analyze, review, report, outputGuidelines. No external dependencies — just string templates.

## Steps

1. Create `src/engine/research/prompts.ts` with these pure functions. Port templates from `_archive/src-v0/constants/prompts.ts` but modernize them:

   **`getSystemPrompt(language?: string)`** — Returns system instruction with `{now}` replaced by `new Date().toLocaleDateString()`. Include the expert researcher persona. If `language` is set, append "Respond in {language}" instruction.

   **`getClarifyPrompt(topic: string)`** — Generate 5+ follow-up questions to clarify research direction.

   **`getPlanPrompt(topic: string)`** — Generate report section plan with tight, focused structure. Include integration guidelines (no overlapping sections, every section relevant to main topic).

   **`getSerpQueriesPrompt(plan: string, maxQueries: number)`** — Generate SERP search queries from the report plan. Tell the model to return a JSON array of `{ query, researchGoal }` objects. Note: the actual Zod schema enforcement happens in `generateStructured()` — the prompt just describes the expected format.

   **`getAnalyzePrompt(query: string, researchGoal: string)`** — Analyze search results for a query against a research goal. Generate learnings as a human researcher.

   **`getSearchResultPrompt(query: string, researchGoal: string, context: string)`** — Analyze pre-fetched search context against a research goal. Used when search provider returns raw results.

   **`getReviewPrompt(plan: string, learnings: string, suggestion?: string)`** — Determine if more research needed. Output follow-up queries or empty array.

   **`getReportPrompt(plan: string, learnings: string[], sources: Source[], images: ImageSource[], requirements?: string)`** — Write the final report. Include output guidelines, citation rules, reference rules. Aim for detailed report including ALL learnings.

   **`getOutputGuidelinesPrompt()`** — Typographical and formatting rules for the final report (headings, bold, links, lists, code, tables, LaTeX, Mermaid).

   Also create:
   - `DEFAULT_PROMPTS` — const record mapping all PromptOverrideKey values to their default functions
   - `resolvePrompt(key, overrides)` — returns override if provided, else default
   - Export all prompt functions + resolvePrompt + DEFAULT_PROMPTS

2. Create `src/engine/research/__tests__/prompts.test.ts` with tests for:
   - Each prompt function returns a non-empty string
   - `getSystemPrompt()` includes today's date
   - `getSystemPrompt('Vietnamese')` includes language instruction
   - `getSerpQueriesPrompt(plan, 3)` mentions "3" or the max count
   - `getPlanPrompt(topic)` includes the topic
   - `getReportPrompt(...)` includes plan, learnings, sources
   - `resolvePrompt('system', { system: 'custom' })` returns 'custom'
   - `resolvePrompt('system', {})` returns default
   - Output guidelines include LaTeX and Mermaid instructions

3. Run tests: `pnpm vitest run src/engine/research/__tests__/prompts.test.ts`

4. Verify no external dependencies (no imports from provider, no AI SDK, no React)

## Must-Haves

- [ ] All 9 prompt functions return non-empty strings
- [ ] `getSystemPrompt` includes current date
- [ ] `getSystemPrompt` supports language parameter
- [ ] `resolvePrompt` returns override when provided, default otherwise
- [ ] No imports from AI SDK, React, or provider modules — pure string functions
- [ ] All tests pass

## Verification

- `pnpm vitest run src/engine/research/__tests__/prompts.test.ts` — all tests pass
- `grep -c 'import.*from.*ai' src/engine/research/prompts.ts` returns 0 (no AI SDK imports)

## Inputs

- `src/engine/research/types.ts` — PromptOverrideKey, PromptOverrides, Source, ImageSource types
- `_archive/src-v0/constants/prompts.ts` — Old prompt templates to port (reference only, do not import)

## Expected Output

- `src/engine/research/prompts.ts` — Pure prompt functions with override support
- `src/engine/research/__tests__/prompts.test.ts` — Prompt function tests
