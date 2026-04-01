---
id: T03
parent: S06
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/hooks/use-research.ts", "src/app/page.tsx", "src/app/providers.tsx", "src/hooks/__tests__/use-research.test.ts"]
key_decisions: ["Auto-save uses try/catch to ensure history failures never block research flow", "Empty promptOverrides object sent as undefined to avoid sending empty JSON", "Session ID uses topic + startedAt timestamp for uniqueness"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 378 tests pass across 17 test files (4 new integration tests added). Production build succeeds with zero type/lint errors. HistoryDialog.tsx remains exactly 300 lines. Slice-level checks: history store tests pass, build clean, line count verified."
completed_at: 2026-03-31T20:49:42.828Z
blocker_discovered: false
---

# T03: Wire history auto-save into useResearch hook, send prompt overrides and advanced settings to SSE route, mount both dialogs in page.tsx, hydrate history store on startup

> Wire history auto-save into useResearch hook, send prompt overrides and advanced settings to SSE route, mount both dialogs in page.tsx, hydrate history store on startup

## What Happened
---
id: T03
parent: S06
milestone: M001
key_files:
  - src/hooks/use-research.ts
  - src/app/page.tsx
  - src/app/providers.tsx
  - src/hooks/__tests__/use-research.test.ts
key_decisions:
  - Auto-save uses try/catch to ensure history failures never block research flow
  - Empty promptOverrides object sent as undefined to avoid sending empty JSON
  - Session ID uses topic + startedAt timestamp for uniqueness
duration: ""
verification_result: passed
completed_at: 2026-03-31T20:49:42.828Z
blocker_discovered: false
---

# T03: Wire history auto-save into useResearch hook, send prompt overrides and advanced settings to SSE route, mount both dialogs in page.tsx, hydrate history store on startup

**Wire history auto-save into useResearch hook, send prompt overrides and advanced settings to SSE route, mount both dialogs in page.tsx, hydrate history store on startup**

## What Happened

Extended useResearch hook with three new settings selectors (promptOverrides, autoReviewRounds, maxSearchQueries) and included them in the SSE request body in connectSSE(). Added auto-save logic inside the SSE buffer callback: when a done event fires and result exists in the research store, the session is saved to history store with full metadata. The auto-save is wrapped in try/catch so history failures never block the research flow. Empty promptOverrides are sent as undefined rather than {}. Mounted SettingsDialog and HistoryDialog in page.tsx after the main content area, controlled by useUIStore.activeDialog. Added history store hydration to providers.tsx alongside the existing settings hydration. Added 4 new tests covering settings fields in request body, auto-save on done with result, skip auto-save without result, and omit empty promptOverrides. Compacted the test file from 566 to 268 lines to comply with 300-line ESLint max-lines rule.

## Verification

All 378 tests pass across 17 test files (4 new integration tests added). Production build succeeds with zero type/lint errors. HistoryDialog.tsx remains exactly 300 lines. Slice-level checks: history store tests pass, build clean, line count verified.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run` | 0 | ✅ pass | 1230ms |
| 2 | `pnpm build` | 0 | ✅ pass | 5000ms |
| 3 | `wc -l src/components/settings/HistoryDialog.tsx` | 0 | ✅ pass (300 lines) | 100ms |


## Deviations

None. All planned wiring steps implemented as specified.

## Known Issues

None.

## Files Created/Modified

- `src/hooks/use-research.ts`
- `src/app/page.tsx`
- `src/app/providers.tsx`
- `src/hooks/__tests__/use-research.test.ts`


## Deviations
None. All planned wiring steps implemented as specified.

## Known Issues
None.
