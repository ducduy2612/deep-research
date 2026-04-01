# T03: Design Showcase Route and Verification

**Slice:** S01 — **Milestone:** M001

## Description

Build the /design showcase route that renders all Obsidian Deep design tokens, signature patterns, and every installed shadcn/ui component in one viewable page, then verify the complete Phase 1 output.

Purpose: The /design route serves as both Phase 1 verification (proving all tokens, fonts, and components render correctly) and as a living reference for all subsequent phases. This is the human verification checkpoint for the entire phase.
Output: A fully rendered /design page demonstrating the complete Obsidian Deep design system.

## Must-Haves

- [ ] "Developer can visit /design and see all 7 surface levels rendered as color swatches"
- [ ] "Developer can see all 4 typography roles (Display, Heading, Label, Body) rendered correctly"
- [ ] "Glassmorphism effect visible on floating elements (backdrop-blur, semi-transparent bg)"
- [ ] "All 16 shadcn/ui components render in Obsidian Deep dark theme on /design"
- [ ] "AI Pulse signature pattern renders as 4px vertical pill in primary color"
- [ ] "No component file exceeds 300 lines"

## Files

- `src/app/design/page.tsx`
- `src/app/design/components-demo.tsx`
