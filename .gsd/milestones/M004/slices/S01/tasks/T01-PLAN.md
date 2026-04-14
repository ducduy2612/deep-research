---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Add cycle cap config, change timeBudgetMs default, add reviewOnly() to orchestrator

Update ResearchConfig with maxCyclesPerInvocation field, change timeBudgetMs default from 780s to 180s, add cycle cap to runSearchPhase, add reviewOnly() public method that generates follow-up queries from plan + learnings + optional suggestion and executes 1 search+analyze cycle, remove runReviewLoop() call from researchFromPlan(). Do NOT remove start() yet — that happens in T04.

## Inputs

- ``src/engine/research/types.ts` — ResearchConfig, researchConfigSchema, ResearchPhaseResult`
- ``src/engine/research/orchestrator.ts` — runSearchPhase, runReviewLoop, researchFromPlan, resolvePrompt`

## Expected Output

- ``src/engine/research/types.ts` — updated ResearchConfig with maxCyclesPerInvocation, updated timeBudgetMs doc/default`
- ``src/engine/research/orchestrator.ts` — cycle cap in runSearchPhase, reviewOnly() method, researchFromPlan without runReviewLoop call`

## Verification

pnpm test -- --run src/engine/research/__tests__/orchestrator.test.ts 2>&1 | tail -5

## Observability Impact

Cycle cap enforcement logged via logger.info with completedQueries/remainingQueries. reviewOnly() logs follow-up query count and duration.
