# S06: Integration + Browser Verification

**Goal:** End-to-end browser verification of the complete frozen-checkpoint flow using browser automation with proxy mode. Verify clarify→plan→research→report flow, refresh persistence, abort handling, export downloads, and knowledge base integration.
**Demo:** After this: Full clarify→plan→research→report flow works in browser. Refresh at each phase preserves state. Abort at each phase. Export produces correct files. All tests pass.

## Tasks
- [ ] **T01: Browser verify: full multi-phase research flow (clarify→plan→research→report)** — Start dev server in proxy mode (keys from .env.local). Use browser automation to:
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
  - Estimate: 45min
  - Verify: Browser automation completes all 10 steps without errors. Screenshots show correct phase states.
- [ ] **T02: Browser verify: refresh persistence and abort handling** — Using the running dev server from T01:

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
  - Estimate: 30min
  - Verify: State survives browser refresh at multiple phase boundaries. Abort produces clean stopped state at multiple phases.
- [ ] **T03: Browser verify: export downloads and knowledge base integration** — Using a completed research from T01:

Export verification:
1. Navigate to FinalReport view
2. Click Export dropdown
3. Select MD download — verify file downloads
4. Select PDF download — verify file downloads
5. Navigate back to research phase
6. Click export on a search result card (MD)
7. Click export on a search result card (JSON)

Knowledge base verification:
1. On a search result card, click 'Add to KB' button
2. Verify success toast appears
3. Navigate to Knowledge Base page
4. Verify the added item appears in the list

Take screenshots of each action.
  - Estimate: 30min
  - Verify: All export options produce downloadable files. Add-to-KB adds content and shows confirmation. KB page shows the added item.
- [ ] **T04: Run full test suite + lint + build** — After browser verification confirms everything works:
1. Run full vitest suite — all tests must pass
2. Run pnpm lint — no errors
3. Run pnpm build — production build succeeds

Fix any issues found.
  - Estimate: 15min
  - Verify: pnpm vitest run && pnpm lint && pnpm build — all green.
