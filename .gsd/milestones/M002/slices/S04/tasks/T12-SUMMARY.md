---
id: T12
parent: S04
milestone: M002
provides: []
requires: []
affects: []
key_files: ["src/stores/research-store.ts", "src/components/research/ActiveResearchCenter.tsx", "src/app/providers.tsx", "src/app/page.tsx", "src/stores/__tests__/research-store-persistence.test.ts"]
key_decisions: ["Auto-persist via Zustand subscribe rather than middleware to avoid serialization overhead on every delta event", "Streaming states converted to nearest checkpoint on hydration rather than introducing new interrupted states to the ResearchState type union", "Connection interrupted shown as amber banner rather than modal dialog to avoid blocking user interaction", "Used z.record(z.string(), schema) for Zod v4 compatibility instead of z.record(schema)"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 636 tests pass across 29 test files (19 new persistence tests added). Verification command: pnpm vitest run — all green. Tests cover: auto-persist on state changes, persist removal on reset, idle/non-idle state handling, hydrate for all awaiting states, interrupted streaming state conversion, connectionInterrupted flag lifecycle, clearInterrupted action, and no-restore for terminal states."
completed_at: 2026-04-02T11:46:11.971Z
blocker_discovered: false
---

# T12: Add localforage persistence to research store with interrupted-connection recovery

> Add localforage persistence to research store with interrupted-connection recovery

## What Happened
---
id: T12
parent: S04
milestone: M002
key_files:
  - src/stores/research-store.ts
  - src/components/research/ActiveResearchCenter.tsx
  - src/app/providers.tsx
  - src/app/page.tsx
  - src/stores/__tests__/research-store-persistence.test.ts
key_decisions:
  - Auto-persist via Zustand subscribe rather than middleware to avoid serialization overhead on every delta event
  - Streaming states converted to nearest checkpoint on hydration rather than introducing new interrupted states to the ResearchState type union
  - Connection interrupted shown as amber banner rather than modal dialog to avoid blocking user interaction
  - Used z.record(z.string(), schema) for Zod v4 compatibility instead of z.record(schema)
duration: ""
verification_result: passed
completed_at: 2026-04-02T11:46:11.972Z
blocker_discovered: false
---

# T12: Add localforage persistence to research store with interrupted-connection recovery

**Add localforage persistence to research store with interrupted-connection recovery**

## What Happened

Implemented full state persistence for the multi-phase research workflow. The research store now auto-persists all state to localforage on every change via Zustand's subscribe, and hydrates on app startup via hydrate() called from providers.tsx.

Key design decisions:
1. Auto-persist via subscribe — Every state change fires a fire-and-forget write to localforage. Idle state removes the key. Reset clears it.
2. Interrupted streaming states map to nearest checkpoint — clarifying→awaiting_feedback, planning→awaiting_plan_review, searching/analyzing/reviewing/reporting→awaiting_results_review. The connectionInterrupted flag signals to the UI that the connection was lost.
3. Banner UI — ActiveResearchCenter shows an amber "Connection lost" banner with dismiss when connectionInterrupted is true.
4. Navigation restoration — page.tsx detects non-idle hydrated state and auto-navigates to "active" view.
5. Zod v4 compatibility — z.record() requires both key and value schema args in Zod v4 (z.record(z.string(), valueSchema)).

## Verification

All 636 tests pass across 29 test files (19 new persistence tests added). Verification command: pnpm vitest run — all green. Tests cover: auto-persist on state changes, persist removal on reset, idle/non-idle state handling, hydrate for all awaiting states, interrupted streaming state conversion, connectionInterrupted flag lifecycle, clearInterrupted action, and no-restore for terminal states.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run` | 0 | ✅ pass | 2280ms |


## Deviations

The eslint-disable comment for the mount-only useEffect in page.tsx uses the standard format (-- comment after the closing bracket) since the inline format wasn't recognized by Next.js ESLint config.

## Known Issues

None.

## Files Created/Modified

- `src/stores/research-store.ts`
- `src/components/research/ActiveResearchCenter.tsx`
- `src/app/providers.tsx`
- `src/app/page.tsx`
- `src/stores/__tests__/research-store-persistence.test.ts`


## Deviations
The eslint-disable comment for the mount-only useEffect in page.tsx uses the standard format (-- comment after the closing bracket) since the inline format wasn't recognized by Next.js ESLint config.

## Known Issues
None.
