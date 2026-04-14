---
id: S03
parent: M004
milestone: M004
provides:
  - ["Clean codebase with zero dead references to start(), full phase, or StartOptions", "Consistent ClarifyOptions naming across all entry points"]
requires:
  - slice: S01
    provides: Removed start() and full pipeline from orchestrator, leaving orphaned references for S03 to clean up
  - slice: S02
    provides: Review phase and auto-review integration — confirmed no stale references from S02 changes
affects:
  []
key_files:
  - ["src/stores/research-store-events.ts", "src/engine/research/__tests__/orchestrator.test.ts", "src/hooks/use-research.ts", "src/components/research/TopicInput.tsx", "src/app/page.tsx"]
key_decisions:
  - []
patterns_established:
  - ["ClarifyOptions naming convention — sole entry point interface named after the clarify() method, not a generic 'start'"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-14T18:23:49.330Z
blocker_discovered: false
---

# S03: UI cleanup + start() removal

**Removed all dead code and stale references to the deleted start() method and full phase — zero references to StartOptions, phase==="full", or start() remain in production code.**

## What Happened

## What Happened

S03 was a straightforward cleanup slice that removed the last vestiges of the deleted `start()` method and `phase: "full"` from the codebase. After S01 removed the full pipeline and start() from the orchestrator, and S02 added the review phase and auto-review, several orphaned references remained in production and test code.

### Changes Made (T01)

1. **`src/stores/research-store-events.ts`** — Removed the dead `d.phase === "full"` condition that was an orphaned check from when the full pipeline existed. The `start()` method was deleted in S01, so this condition was unreachable dead code.

2. **`src/engine/research/__tests__/orchestrator.test.ts`** — Updated two stale references:
   - Comment "clarifyOnly since start() is removed" was reworded to be more descriptive
   - Test name referencing "same final state as start()" was renamed to reference clarify()

3. **`src/hooks/use-research.ts`** — Renamed `StartOptions` interface to `ClarifyOptions` to reflect that `clarify()` is now the sole entry point.

4. **`src/components/research/TopicInput.tsx`** — Updated import and prop type from `StartOptions` to `ClarifyOptions`.

5. **`src/app/page.tsx`** — Updated the `HubView` component's `onStart` prop type to use `ClarifyOptions`.

### Verification

- All 823 tests pass (43 test files, 2.29s)
- Clean production build with no type errors
- `grep` confirms zero references to `StartOptions` in production code
- `grep` confirms zero references to `phase === "full"` anywhere in src/
- No references to `start()` in production code (only test utilities)

## Verification

All slice must-haves verified:

1. ✅ No `d.phase === "full"` in research-store-events.ts — grep confirms clean
2. ✅ No `start()` references in production code — grep confirms clean (only test utilities)
3. ✅ No `StartOptions` anywhere — all renamed to `ClarifyOptions` across use-research.ts, TopicInput.tsx, page.tsx
4. ✅ All 823 tests pass (43 test files)
5. ✅ Clean build with no type errors

Commands run:
- `pnpm test --run` → 823 passed, 0 failed (exit code 0)
- `pnpm build` → clean build (exit code 0)
- `grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__` → no matches (exit code 1)
- `grep -rn 'phase === "full"' src/` → no matches (exit code 1)

## Requirements Advanced

- R064 — Final cleanup of residual start()/full phase references — zero references remain in production code

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None — pure cleanup slice with no downstream implications.

## Files Created/Modified

- `src/stores/research-store-events.ts` — Removed dead d.phase === 'full' condition
- `src/engine/research/__tests__/orchestrator.test.ts` — Updated stale comment and test name referencing start()
- `src/hooks/use-research.ts` — Renamed StartOptions interface to ClarifyOptions
- `src/components/research/TopicInput.tsx` — Updated import and prop type from StartOptions to ClarifyOptions
- `src/app/page.tsx` — Updated HubView prop type to use ClarifyOptions
