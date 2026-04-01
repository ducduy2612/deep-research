---
estimated_steps: 5
estimated_files: 16
skills_used: []
---

# T03: Obsidian Deep polish pass across all screens

**Slice:** S09 — PWA, i18n, and Polish
**Milestone:** M001

## Description

Final visual polish pass across all components. Review against design/DESIGN.md and design/screens/ mockups. Fix any surface hierarchy inconsistencies (Well → Deck → Sheet → Raised → Float), ensure glassmorphism on all floating elements (modals, command palette), verify no 1px solid borders exist (use ghost borders rgba(70, 69, 84, 0.15) only where structurally needed), check tonal layering consistency, verify responsive layouts at mobile (375px) and desktop (1440px) breakpoints, and ensure all component files remain under 300 lines.

## Steps

1. **Read design references** — Read `design/DESIGN.md` for the complete token reference. Check `design/SCREENS.md` for screen index. Read any `design/screens/*.html` mockups for visual comparison. Focus on: surface hierarchy (Well=#08080a → Deck=#141417 → Sheet=#1c1b1f → Raised=#242328 → Float=#2d2c32), ghost border spec (rgba(70, 69, 84, 0.15)), glassmorphism (backdrop-blur-xl + semi-transparent bg), typography (Inter body, JetBrains Mono code, -0.04em heading tracking).

2. **Surface hierarchy audit** — Grep all component files for surface class usage. Verify each component uses the correct surface level:
   - Page backgrounds: `obsidian-surface-well` (darkest)
   - Content areas/panels: `obsidian-surface-deck`
   - Cards/content blocks: `obsidian-surface-sheet`
   - Interactive elements: `obsidian-surface-raised`
   - Floating/dropdown: `obsidian-surface-float`
   - Fix any misplaced surface levels. Common issues: using `obsidian-surface-deck` where `obsidian-surface-sheet` is correct, or vice versa.

3. **Glassmorphism check** — Verify all floating elements (modals, dialogs, popovers, command palette, the research input panel in TopicInput) use `backdrop-blur-xl` with semi-transparent backgrounds (`bg-[rgba(32,31,34,0.6)]` or similar). The header should use `bg-obsidian-surface-deck/60 backdrop-blur-xl`. Settings, History, and Knowledge dialogs should all have glassmorphism. The bottom action bar in FinalReport should have `backdrop-blur-md`.

4. **Border audit** — Search for `border` classes that create visible 1px solid borders. The Obsidian Deep "No-Line Rule" says no visible borders. Replace with:
   - Ghost borders where structurally needed: `border border-obsidian-border/30` (this uses the ghost border color)
   - Or remove entirely if not structurally needed
   - The `border-obsidian-outline-ghost` class with `/10` or `/30` opacity is acceptable
   - Common acceptable patterns: `border-obsidian-surface-raised` (borders matching the surface color are effectively invisible)

5. **Responsive + line count verification** — Check all components at mobile (375px) and desktop (1440px) breakpoints. Verify: nav items collapse to icon-only on mobile (`hidden md:inline`), research panels stack vertically, modals don't overflow viewport. Run `find src/components -name '*.tsx' -exec wc -l {} + | sort -rn | head -20` — if any file exceeds 300 lines, refactor.

6. **Verify**: `pnpm build` succeeds, `pnpm test` passes

## Must-Haves

- [ ] All components use correct surface hierarchy tokens (no misplaced levels)
- [ ] All floating elements (modals, header, bottom bar, input panel) have glassmorphism (backdrop-blur + semi-transparent bg)
- [ ] No visible 1px solid borders — only ghost borders (rgba with low opacity) where structurally needed
- [ ] All component files remain under 300 lines
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes — all 498+ tests green
- [ ] Responsive layouts verified — mobile (375px) and desktop (1440px) look correct

## Verification

- `pnpm build` — confirms all component changes compile
- `pnpm test` — all 498+ tests pass
- `find src/components -name '*.tsx' -exec wc -l {} + | sort -rn | head -20` — no file exceeds 300 lines
- Visual inspection of running app at 375px and 1440px viewports (manual if needed, or browser screenshot comparison)

## Inputs

- `src/components/Header.tsx` — verify surface hierarchy, glassmorphism, responsive
- `src/components/research/ActiveResearchCenter.tsx` — verify surface hierarchy
- `src/components/research/FinalReport.tsx` — verify glassmorphism on bottom bar, responsive sidebar
- `src/components/research/TopicInput.tsx` — verify glassmorphism on input panel
- `src/components/research/ReportConfig.tsx` — verify surface hierarchy
- `src/components/research/WorkflowProgress.tsx` — verify surface hierarchy
- `src/components/settings/SettingsDialog.tsx` — verify glassmorphism on dialog
- `src/components/settings/GeneralTab.tsx` — verify surface hierarchy
- `src/components/settings/AIModelsTab.tsx` — verify surface hierarchy
- `src/components/settings/SearchTab.tsx` — verify surface hierarchy
- `src/components/settings/AdvancedTab.tsx` — verify surface hierarchy
- `src/components/settings/HistoryDialog.tsx` — verify glassmorphism, responsive, ≤300 lines
- `src/components/knowledge/KnowledgeDialog.tsx` — verify glassmorphism on dialog
- `src/components/knowledge/KnowledgeList.tsx` — verify surface hierarchy
- `src/components/knowledge/FileUpload.tsx` — verify surface hierarchy
- `src/components/knowledge/UrlCrawler.tsx` — verify surface hierarchy
- `design/DESIGN.md` — design token reference
- `design/SCREENS.md` — screen index

## Expected Output

- `src/components/Header.tsx` — polished surface hierarchy, glassmorphism, responsive
- `src/components/research/FinalReport.tsx` — polished glassmorphism, responsive sidebar, bottom bar
- `src/components/research/TopicInput.tsx` — polished glassmorphism on input panel
- `src/components/settings/HistoryDialog.tsx` — ≤300 lines, polished
- Any other component files that needed surface hierarchy or border fixes
