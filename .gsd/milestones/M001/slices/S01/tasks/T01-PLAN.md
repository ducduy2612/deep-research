# T01: Design Tokens, Tailwind Config, and Scaffolding

**Slice:** S01 — **Milestone:** M001

## Description

Set up the Obsidian Deep design foundation: CSS custom properties, Tailwind configuration, fonts, directory scaffolding, ESLint rules, and package cleanup.

Purpose: This is the base layer that all subsequent plans and phases build upon. Without correct design tokens in CSS and Tailwind, no component will render correctly.
Output: A running dev server showing the Obsidian Deep dark theme with correct fonts, plus a clean dependency tree and enforced code size limits.

## Must-Haves

- [ ] "Developer can run pnpm dev and see a page with dark Obsidian background (#0e0e10)"
- [ ] "Inter font loads for body text, JetBrains Mono loads for code/mono text"
- [ ] "Tailwind utility classes like bg-obsidian-surface-well produce correct colors"
- [ ] "Surface hierarchy colors are available as Tailwind classes"
- [ ] "ESLint max-lines rule rejects files over 300 lines"
- [ ] "Unused AI provider packages are removed from package.json"

## Files

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `next.config.ts`
- `eslint.config.mjs`
- `package.json`
- `src/utils/style.ts`
