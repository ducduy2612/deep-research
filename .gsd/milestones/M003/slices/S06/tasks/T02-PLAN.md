---
estimated_steps: 14
estimated_files: 2
skills_used: []
---

# T02: Browser verify: refresh persistence and abort handling

Using the running dev server from T01:

Refresh persistence:
1. Start a research query, let clarify phase begin streaming
2. Refresh the page (browser_reload)
3. Verify state is preserved (query text, phase indicator)
4. Complete to research phase, refresh again
5. Verify search results and learnings survive refresh

Abort handling:
1. Start a new research query
2. During clarify streaming, click abort/stop
3. Verify clean abort (no error state, UI shows stopped)
4. Start another query, abort during research phase
5. Verify clean abort mid-research

Take screenshots before and after each refresh/abort.

## Inputs

- `src/stores/research-store.ts`
- `src/hooks/use-research.ts`

## Expected Output

- `Screenshots showing state before/after refresh`
- `Screenshots showing clean abort states`

## Verification

State survives browser refresh at multiple phase boundaries. Abort produces clean stopped state at multiple phases.
