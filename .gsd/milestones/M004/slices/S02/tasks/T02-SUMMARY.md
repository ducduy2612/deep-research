---
id: T02
parent: S02
milestone: M004
key_files:
  - src/components/research/ResearchActions.tsx
  - src/components/research/ActiveResearchCenter.tsx
  - src/components/research/ActiveResearch.tsx
  - src/app/page.tsx
  - messages/en.json
  - messages/vi.json
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T18:02:48.771Z
blocker_discovered: false
---

# T02: Add auto-review progress banner with round counter, spinner, and abort button to ResearchActions with full i18n support

**Add auto-review progress banner with round counter, spinner, and abort button to ResearchActions with full i18n support**

## What Happened

Added auto-review progress banner and abort button to the ResearchActions component, plus i18n keys for both English and Vietnamese.

**ResearchActions.tsx:** Added `autoReviewCurrentRound` and `autoReviewTotalRounds` store selectors, `onAbortAutoReview` prop, and `StopCircle` icon import. Computed `isAutoReviewing = state === 'reviewing' && autoReviewCurrentRound > 0`. When auto-reviewing: shows a sheet-styled banner with AUTO-REVIEW section label, round progress text (N/M), Loader2 spinner, and an abort button. Hides the suggestion textarea, ManualQueryInput, More Research, and Finalize buttons during auto-review. When auto-review completes (state returns to awaiting_results_review with currentRound at 0), the normal review UI renders naturally.

**ActiveResearchCenter.tsx:** Added `onAbortAutoReview` optional prop and threaded it through to ResearchActions.

**ActiveResearch.tsx:** Added `onAbortAutoReview` optional prop and threaded it through to ActiveResearchCenter.

**page.tsx:** Extracted `abort` from useResearch, created `handleAbortAutoReview` callback that resets store fields (autoReviewRoundsRemaining/CurrentRound/TotalRounds to 0) and calls `abort()` to terminate the SSE connection. Passed the handler as `onAbortAutoReview` to ActiveResearch.

**i18n:** Added 4 keys to both en.json and vi.json: autoReviewProgress (with {current}/{total} interpolation), autoReviewComplete, autoReviewAbort, autoReviewBannerTitle.

## Verification

All verification checks pass:
- `pnpm build` — clean build with no type errors
- `pnpm lint` — no ESLint warnings or errors
- `grep -c 'autoReviewProgress' messages/en.json messages/vi.json` — both return 1
- `grep -c 'autoReviewCurrentRound' src/components/research/ResearchActions.tsx` — returns 3 (>= 1)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm build` | 0 | ✅ pass | 24100ms |
| 2 | `pnpm lint` | 0 | ✅ pass | 5200ms |
| 3 | `grep -c 'autoReviewProgress' messages/en.json messages/vi.json` | 0 | ✅ pass | 50ms |
| 4 | `grep -c 'autoReviewCurrentRound' src/components/research/ResearchActions.tsx` | 0 | ✅ pass | 40ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/research/ResearchActions.tsx`
- `src/components/research/ActiveResearchCenter.tsx`
- `src/components/research/ActiveResearch.tsx`
- `src/app/page.tsx`
- `messages/en.json`
- `messages/vi.json`
