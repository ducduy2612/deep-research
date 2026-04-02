---
id: T11
parent: S03
milestone: M002
provides: []
requires: []
affects: []
key_files: ["messages/en.json", "messages/vi.json", "src/components/research/ClarifyPanel.tsx", "src/components/research/PlanPanel.tsx"]
key_decisions: ["Added "preview" i18n key to both ClarifyPanel and PlanPanel namespaces to replace the only two hardcoded English strings"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm lint: no ESLint warnings or errors. pnpm build: compiled successfully, all types valid, all routes generated correctly."
completed_at: 2026-04-02T09:00:50.743Z
blocker_discovered: false
---

# T11: Added preview i18n key to en/vi message files and replaced hardcoded "Preview" strings in ClarifyPanel and PlanPanel

> Added preview i18n key to en/vi message files and replaced hardcoded "Preview" strings in ClarifyPanel and PlanPanel

## What Happened
---
id: T11
parent: S03
milestone: M002
key_files:
  - messages/en.json
  - messages/vi.json
  - src/components/research/ClarifyPanel.tsx
  - src/components/research/PlanPanel.tsx
key_decisions:
  - Added "preview" i18n key to both ClarifyPanel and PlanPanel namespaces to replace the only two hardcoded English strings
duration: ""
verification_result: passed
completed_at: 2026-04-02T09:00:50.743Z
blocker_discovered: false
---

# T11: Added preview i18n key to en/vi message files and replaced hardcoded "Preview" strings in ClarifyPanel and PlanPanel

**Added preview i18n key to en/vi message files and replaced hardcoded "Preview" strings in ClarifyPanel and PlanPanel**

## What Happened

Reviewed all new checkpoint components (ClarifyPanel, PlanPanel, ResearchActions, WorkflowProgress, ActiveResearchCenter) for hardcoded strings. The ClarifyPanel, PlanPanel, ResearchActions, and Workflow message sections already existed in both en.json and vi.json with full translations from prior tasks. Only two hardcoded "Preview" strings in the edit-toggle buttons of ClarifyPanel and PlanPanel were missing i18n coverage. Added a `preview` key to both namespace sections in both language files and updated both components to use `t("preview")`. Ran lint (clean) and build (clean) to verify everything compiles.

## Verification

pnpm lint: no ESLint warnings or errors. pnpm build: compiled successfully, all types valid, all routes generated correctly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm lint` | 0 | ✅ pass | 23000ms |
| 2 | `pnpm build` | 0 | ✅ pass | 12000ms |


## Deviations

None. All planned i18n strings were already present from prior tasks; only the `preview` key was missing.

## Known Issues

None.

## Files Created/Modified

- `messages/en.json`
- `messages/vi.json`
- `src/components/research/ClarifyPanel.tsx`
- `src/components/research/PlanPanel.tsx`


## Deviations
None. All planned i18n strings were already present from prior tasks; only the `preview` key was missing.

## Known Issues
None.
