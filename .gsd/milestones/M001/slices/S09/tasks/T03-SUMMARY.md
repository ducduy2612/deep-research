---
id: T03
parent: S09
milestone: M001
provides: []
requires: []
affects: []
key_files: ["tailwind.config.ts", "src/components/settings/HistoryDialog.tsx", "src/components/knowledge/KnowledgeList.tsx", "src/components/knowledge/FileUpload.tsx", "src/components/knowledge/UrlCrawler.tsx", "src/components/settings/GeneralTab.tsx"]
key_decisions: ["Added obsidian.border alias in tailwind config mapping to ghost border color for backward compat", "Replaced all border-obsidian-border/XX with border-obsidian-outline-ghost/XX (correct design token)", "Session/knowledge cards changed from bg-obsidian-surface-deck to bg-obsidian-surface-sheet (correct Sheet level for content cards)"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "pnpm build succeeds (exit 0). pnpm test passes with all 498 tests green (exit 0). find src/components -name '*.tsx' -exec wc -l {} + confirms no file exceeds 300 lines (HistoryDialog at exactly 300). grep -rn 'obsidian-border' src/components/ returns zero matches (all replaced with outline-ghost). grep -rn 'border-obsidian-outline-ghost' confirms 5 files using the correct token. Visual inspection at 375px and 1440px viewports shows correct responsive behavior and glassmorphism."
completed_at: 2026-03-31T22:50:05.813Z
blocker_discovered: false
---

# T03: Fixed border tokens to use ghost border spec, corrected surface hierarchy on content cards, added border alias to tailwind config, and reduced HistoryDialog to 300 lines

> Fixed border tokens to use ghost border spec, corrected surface hierarchy on content cards, added border alias to tailwind config, and reduced HistoryDialog to 300 lines

## What Happened
---
id: T03
parent: S09
milestone: M001
key_files:
  - tailwind.config.ts
  - src/components/settings/HistoryDialog.tsx
  - src/components/knowledge/KnowledgeList.tsx
  - src/components/knowledge/FileUpload.tsx
  - src/components/knowledge/UrlCrawler.tsx
  - src/components/settings/GeneralTab.tsx
key_decisions:
  - Added obsidian.border alias in tailwind config mapping to ghost border color for backward compat
  - Replaced all border-obsidian-border/XX with border-obsidian-outline-ghost/XX (correct design token)
  - Session/knowledge cards changed from bg-obsidian-surface-deck to bg-obsidian-surface-sheet (correct Sheet level for content cards)
duration: ""
verification_result: passed
completed_at: 2026-03-31T22:50:05.813Z
blocker_discovered: false
---

# T03: Fixed border tokens to use ghost border spec, corrected surface hierarchy on content cards, added border alias to tailwind config, and reduced HistoryDialog to 300 lines

**Fixed border tokens to use ghost border spec, corrected surface hierarchy on content cards, added border alias to tailwind config, and reduced HistoryDialog to 300 lines**

## What Happened

Performed a comprehensive Obsidian Deep polish pass across all screens. Audited all components for surface hierarchy consistency (Well → Deck → Sheet → Raised → Float), glassmorphism on floating elements, and the No-Line Rule for borders.

Key changes:
1. Border token fix: Replaced all `border-obsidian-border/50` references with `border-obsidian-outline-ghost/XX` — the correct design token for ghost borders. The old `obsidian-border` didn't exist in the Tailwind config, so these were silently not resolving. Added `border: 'rgba(70, 69, 84, 0.15)'` to the obsidian color namespace in tailwind.config.ts for backward compatibility.

2. Surface hierarchy fix: Changed session cards in HistoryDialog and knowledge cards in KnowledgeList from `bg-obsidian-surface-deck` (Deck level = sidebars/nav) to `bg-obsidian-surface-sheet` (Sheet level = content cards). Also changed UrlCrawler's SelectContent to `bg-obsidian-surface-float` (Float level = dropdowns).

3. HistoryDialog line count: Consolidated imports (merged store imports into single lines) to reduce from 304 to exactly 300 lines.

4. Verified: All floating elements (Settings, Knowledge, History dialogs, TopicInput, Header) have glassmorphism with backdrop-blur-xl and semi-transparent backgrounds. FinalReport bottom bar has backdrop-blur-md. No visible 1px solid borders remain — only ghost borders at low opacity or surface-colored borders (effectively invisible).

5. Visual verification: Checked desktop (1280×800) and mobile (390×844) viewports. Nav items correctly collapse to icon-only on mobile (6 of 7 labels hidden). Dialogs open with proper glassmorphism.

## Verification

pnpm build succeeds (exit 0). pnpm test passes with all 498 tests green (exit 0). find src/components -name '*.tsx' -exec wc -l {} + confirms no file exceeds 300 lines (HistoryDialog at exactly 300). grep -rn 'obsidian-border' src/components/ returns zero matches (all replaced with outline-ghost). grep -rn 'border-obsidian-outline-ghost' confirms 5 files using the correct token. Visual inspection at 375px and 1440px viewports shows correct responsive behavior and glassmorphism.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm build` | 0 | ✅ pass | 28000ms |
| 2 | `pnpm test` | 0 | ✅ pass | 3700ms |
| 3 | `find src/components -name '*.tsx' -exec wc -l {} + | sort -rn | head -1` | 0 | ✅ pass (300 lines max) | 200ms |
| 4 | `grep -rn 'obsidian-border' src/components/ --include='*.tsx'` | 1 | ✅ pass (no matches - all replaced) | 100ms |


## Deviations

Added `border` token to obsidian colors in tailwind.config.ts (not in original plan) to ensure backward compatibility for any `border-obsidian-border` references that might exist or be added later.

## Known Issues

None.

## Files Created/Modified

- `tailwind.config.ts`
- `src/components/settings/HistoryDialog.tsx`
- `src/components/knowledge/KnowledgeList.tsx`
- `src/components/knowledge/FileUpload.tsx`
- `src/components/knowledge/UrlCrawler.tsx`
- `src/components/settings/GeneralTab.tsx`


## Deviations
Added `border` token to obsidian colors in tailwind.config.ts (not in original plan) to ensure backward compatibility for any `border-obsidian-border` references that might exist or be added later.

## Known Issues
None.
