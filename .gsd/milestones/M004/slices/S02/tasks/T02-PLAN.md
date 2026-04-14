---
estimated_steps: 55
estimated_files: 4
skills_used: []
---

# T02: Add auto-review progress banner and abort button to ResearchActions + i18n keys

Render auto-review state in ResearchActions component. When autoReviewCurrentRound > 0 and state is 'reviewing', show a progress banner with round count and spinner. Hide More Research and Finalize buttons during auto-review. Show abort button that resets autoReviewRoundsRemaining to 0 and calls the abort handler. Add all i18n keys to both en.json and vi.json.

## Steps
1. Add i18n keys to `messages/en.json` under the existing ResearchActions section:
   - `autoReviewProgress`: `"Auto-review round {current}/{total}..."`
   - `autoReviewComplete`: `"Auto-review complete"`
   - `autoReviewAbort`: `"Abort auto-review"`
   - `autoReviewBannerTitle`: `"AUTO-REVIEW"`

2. Add matching keys to `messages/vi.json` under ResearchActions:
   - `autoReviewProgress`: `"Tự động xem xét vòng {current}/{total}..."`
   - `autoReviewComplete`: `"Tự động xem xét hoàn tất"`
   - `autoReviewAbort`: `"Hủy tự động xem xét"`
   - `autoReviewBannerTitle`: `"TỰ ĐỘNG XEM XÉT"`

3. In `src/components/research/ResearchActions.tsx`:
   - Read `autoReviewCurrentRound` and `autoReviewTotalRounds` from store
   - Add an `onAbortAutoReview` prop to ResearchActionsProps
   - Compute `isAutoReviewing = state === 'reviewing' && autoReviewCurrentRound > 0`
   - When `isAutoReviewing`:
     - Show auto-review banner: a div with the same sheet background styling, containing:
       - A section label like the existing SUGGESTION label but reading the autoReviewBannerTitle key
       - Progress text: `t('autoReviewProgress', { current: autoReviewCurrentRound, total: autoReviewTotalRounds })`
       - A Loader2 spinner (already imported)
       - An abort button styled like the existing secondary buttons
     - HIDE the suggestion textarea and ManualQueryInput during auto-review
     - HIDE the More Research and Finalize buttons during auto-review
   - When state transitions back to `awaiting_results_review` after auto-review rounds complete (autoReviewCurrentRound === 0 and state === awaiting_results_review), the component naturally shows the normal review UI

4. In `src/components/research/ActiveResearchCenter.tsx`:
   - Pass `onAbortAutoReview` prop to ResearchActions
   - The handler should: (1) set `autoReviewRoundsRemaining: 0` and `autoReviewCurrentRound: 0` and `autoReviewTotalRounds: 0` on the store, (2) abort the current SSE connection
   - Use the existing `abort` from useResearch return for the SSE abort
   - But ResearchActions doesn't call useResearch directly — it gets callbacks from ActiveResearchCenter via props
   - So ActiveResearchCenter should provide the `onAbortAutoReview` callback
   - ActiveResearchCenter already has `onAbort` prop from its parent — use that OR construct the abort in ActiveResearchCenter using useResearchStore directly
   - Simplest: make `onAbortAutoReview` a function in ActiveResearchCenter that calls `useResearchStore.setState({ autoReviewRoundsRemaining: 0, autoReviewCurrentRound: 0, autoReviewTotalRounds: 0 })` and then calls the parent's onAbort

## Must-Haves
- [ ] i18n keys in en.json and vi.json for auto-review progress, complete, and abort
- [ ] ResearchActions shows progress banner with round N/M during auto-review
- [ ] Action buttons (More Research, Finalize) hidden during auto-review
- [ ] Abort button visible and functional during auto-review
- [ ] Suggestion textarea and ManualQueryInput hidden during auto-review

## Verification
- `pnpm build` — clean build (catches i18n key mismatches)
- `pnpm lint` — clean
- `grep -c 'autoReviewProgress' messages/en.json messages/vi.json` — both return 1
- `grep -c 'autoReviewCurrentRound' src/components/research/ResearchActions.tsx` — returns >= 1

## Inputs
- `src/components/research/ResearchActions.tsx` — component to add auto-review banner to
- `src/components/research/ActiveResearchCenter.tsx` — parent that wires abort callback
- `messages/en.json` — English i18n strings
- `messages/vi.json` — Vietnamese i18n strings
- `src/stores/research-store.ts` — store with autoReviewCurrentRound/TotalRounds (from T01)

## Expected Output
- `src/components/research/ResearchActions.tsx` — modified with auto-review banner and abort
- `src/components/research/ActiveResearchCenter.tsx` — modified with onAbortAutoReview callback
- `messages/en.json` — new ResearchActions i18n keys
- `messages/vi.json` — new ResearchActions i18n keys

## Inputs

- `src/components/research/ResearchActions.tsx`
- `src/components/research/ActiveResearchCenter.tsx`
- `messages/en.json`
- `messages/vi.json`

## Expected Output

- `src/components/research/ResearchActions.tsx`
- `src/components/research/ActiveResearchCenter.tsx`
- `messages/en.json`
- `messages/vi.json`

## Verification

pnpm build && pnpm lint
