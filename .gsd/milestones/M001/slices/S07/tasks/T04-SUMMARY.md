---
id: T04
parent: S07
milestone: M001
provides: []
requires: []
affects: []
key_files: ["src/components/Header.tsx", "src/app/page.tsx", "src/components/research/ReportConfig.tsx", "src/stores/settings-store.ts", "src/hooks/use-research.ts", "src/hooks/__tests__/use-research.test.ts", "vitest.config.ts", ".npmrc", "src/components/ui/switch.tsx"]
key_decisions: ["Lazy-loaded knowledge-store in use-research.ts to keep fuse.js out of the hot module path and avoid dual-React issues in test envs", "Added .npmrc with public-hoist-pattern for react/react-dom/use-sync-external-store to fix pnpm strict-mode dual-React issue that broke all jsdom tests", "Added resolve.alias in vitest.config.ts to force single React instance resolution"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm vitest run — all 439 tests pass across 21 test files (3 new knowledge integration tests). pnpm build — clean production build with zero type/lint errors."
completed_at: 2026-03-31T21:35:01.307Z
blocker_discovered: false
---

# T04: Wired knowledge subsystem into main app: Header Knowledge button, KnowledgeDialog mounting, local-only mode toggle with Switch, and SSE request body with knowledge content

> Wired knowledge subsystem into main app: Header Knowledge button, KnowledgeDialog mounting, local-only mode toggle with Switch, and SSE request body with knowledge content

## What Happened
---
id: T04
parent: S07
milestone: M001
key_files:
  - src/components/Header.tsx
  - src/app/page.tsx
  - src/components/research/ReportConfig.tsx
  - src/stores/settings-store.ts
  - src/hooks/use-research.ts
  - src/hooks/__tests__/use-research.test.ts
  - vitest.config.ts
  - .npmrc
  - src/components/ui/switch.tsx
key_decisions:
  - Lazy-loaded knowledge-store in use-research.ts to keep fuse.js out of the hot module path and avoid dual-React issues in test envs
  - Added .npmrc with public-hoist-pattern for react/react-dom/use-sync-external-store to fix pnpm strict-mode dual-React issue that broke all jsdom tests
  - Added resolve.alias in vitest.config.ts to force single React instance resolution
duration: ""
verification_result: passed
completed_at: 2026-03-31T21:35:01.308Z
blocker_discovered: false
---

# T04: Wired knowledge subsystem into main app: Header Knowledge button, KnowledgeDialog mounting, local-only mode toggle with Switch, and SSE request body with knowledge content

**Wired knowledge subsystem into main app: Header Knowledge button, KnowledgeDialog mounting, local-only mode toggle with Switch, and SSE request body with knowledge content**

## What Happened

Integrated the knowledge base into the main application across 6 source files. Added a "Knowledge" NavButton with Database icon to the Header (between Report and History). Mounted KnowledgeDialog in page.tsx alongside existing dialogs. Extended settings store with `localOnlyMode` and `selectedKnowledgeIds` fields (persisted via localforage with Zod validation). Added a local-only mode toggle to ReportConfig using shadcn/ui Switch component with an amber "No Web Search" badge when enabled. Extended the SSE request in use-research.ts to include `localOnly` flag and `knowledgeContent` array (loaded from knowledge store, defensive against deleted items). Used lazy dynamic import for knowledge-store to avoid pulling fuse.js into the module graph and breaking test environments. Added 3 integration tests verifying localOnly flag, knowledge content inclusion, and deleted item filtering. Fixed a pre-existing dual-React issue in pnpm strict mode that was causing all jsdom-based hook tests to fail — resolved by adding .npmrc with public-hoist-pattern and vitest.config.ts resolve.alias. All 439 tests pass, build succeeds cleanly.

## Verification

pnpm vitest run — all 439 tests pass across 21 test files (3 new knowledge integration tests). pnpm build — clean production build with zero type/lint errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run` | 0 | ✅ pass | 1650ms |
| 2 | `pnpm build` | 0 | ✅ pass | 7000ms |


## Deviations

DialogType already included "knowledge" from T03. Used lazy dynamic import for knowledge-store instead of static import. Fixed pre-existing dual-React test issue with .npmrc + vitest.config.ts changes (not in original plan). Compacted use-research.ts to stay within 300-line ESLint max-lines rule.

## Known Issues

None.

## Files Created/Modified

- `src/components/Header.tsx`
- `src/app/page.tsx`
- `src/components/research/ReportConfig.tsx`
- `src/stores/settings-store.ts`
- `src/hooks/use-research.ts`
- `src/hooks/__tests__/use-research.test.ts`
- `vitest.config.ts`
- `.npmrc`
- `src/components/ui/switch.tsx`


## Deviations
DialogType already included "knowledge" from T03. Used lazy dynamic import for knowledge-store instead of static import. Fixed pre-existing dual-React test issue with .npmrc + vitest.config.ts changes (not in original plan). Compacted use-research.ts to stay within 300-line ESLint max-lines rule.

## Known Issues
None.
