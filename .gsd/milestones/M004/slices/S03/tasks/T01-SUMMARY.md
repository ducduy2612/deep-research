---
id: T01
parent: S03
milestone: M004
key_files:
  - src/stores/research-store-events.ts
  - src/engine/research/__tests__/orchestrator.test.ts
  - src/hooks/use-research.ts
  - src/components/research/TopicInput.tsx
  - src/app/page.tsx
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-14T18:21:34.027Z
blocker_discovered: false
---

# T01: Remove dead phase==="full" condition, rename StartOptions → ClarifyOptions across all files

**Remove dead phase==="full" condition, rename StartOptions → ClarifyOptions across all files**

## What Happened

Removed the dead `d.phase === "full"` condition from `research-store-events.ts` (the `start()` method and full phase were previously deleted, leaving this orphaned check). Updated two stale references in `orchestrator.test.ts`: a comment referencing "clarifyOnly since start() is removed" and a test name referencing "same final state as start()". Renamed the `StartOptions` interface to `ClarifyOptions` across three files (`use-research.ts`, `TopicInput.tsx`, `page.tsx`) to reflect that the only entry point is now `clarify()`. All 823 tests pass, build succeeds cleanly.

## Verification

Ran `pnpm test --run` — 43 test files, 823 tests all passing (2.28s). Ran `pnpm build` — clean build with no errors (22s). Grepped for any remaining `StartOptions` references (clean) and `phase === "full"` references (clean).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test --run` | 0 | ✅ pass | 2280ms |
| 2 | `pnpm build` | 0 | ✅ pass | 22000ms |
| 3 | `grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__` | 1 | ✅ pass (no matches) | 50ms |
| 4 | `grep -rn 'phase === "full"' src/` | 1 | ✅ pass (no matches) | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/stores/research-store-events.ts`
- `src/engine/research/__tests__/orchestrator.test.ts`
- `src/hooks/use-research.ts`
- `src/components/research/TopicInput.tsx`
- `src/app/page.tsx`
