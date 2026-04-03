---
estimated_steps: 12
estimated_files: 2
skills_used: []
---

# T01: Browser verify: full multi-phase research flow (clarify→plan→research→report)

Start dev server in proxy mode (keys from .env.local). Use browser automation to:
1. Navigate to the app
2. Submit a research query
3. Wait for clarify phase to produce questions
4. Submit answers to questions
5. Wait for plan phase to produce a plan
6. Approve the plan
7. Wait for research phase to search and accumulate findings
8. Finalize findings
9. Wait for report phase to stream the final report
10. Verify report content renders

Take screenshots at each phase transition. Verify accordion collapses frozen phases with badges.

## Inputs

- `.env.local`
- `src/app/page.tsx`
- `src/components/research/ActiveResearch.tsx`

## Expected Output

- `Screenshots of each phase transition`
- `Browser automation log showing successful flow completion`

## Verification

Browser automation completes all 10 steps without errors. Screenshots show correct phase states.
