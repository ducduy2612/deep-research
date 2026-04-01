# S01: Foundation And Design System — UAT

**Milestone:** M001
**Written:** 2026-03-31T16:51:47.013Z

# S01: Foundation And Design System — UAT

**Milestone:** M001
**Written:** 2026-03-31

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice produces static design tokens, UI components, and infrastructure utilities. Verification is confirming the build succeeds, the design showcase renders correctly, and all tokens/components are present. No runtime state or user flows to test.

## Preconditions

- `pnpm install` completed
- `pnpm build` succeeds (zero errors)
- Dev server running at http://localhost:3000

## Smoke Test

Navigate to http://localhost:3000/design — the page should render with "Obsidian Deep" heading and dark background (#0e0e10).

## Test Cases

### 1. Design tokens render correctly

1. Navigate to http://localhost:3000/design
2. Scroll to "Surface Hierarchy" section
3. **Expected:** 7 surface swatches visible: Well, Surface, Deck, Sheet, Raised, Float, Bright — each showing hex value and description
4. Scroll to "Accent Colors" section
5. **Expected:** 9 color swatches visible: Primary, Primary Deep, Primary Seed, Secondary, Tertiary, Error, On Surface, On Surface Var, Outline

### 2. Typography roles display correctly

1. Scroll to "Typography" section on /design
2. **Expected:** 4 typography roles visible:
   - Display: "Deep Research" in Inter, 3rem, tracking-tight
   - Heading: "Section Heading" in Inter, 1.5rem, semibold
   - Label: Monospaced text in JetBrains Mono, 0.75rem, medium
   - Body: Paragraph text in Inter, 0.875rem, leading-relaxed

### 3. AI Pulse signature pattern renders

1. Scroll to "AI Pulse · Signature Pattern" section
2. **Expected:** 3 pulse variants visible:
   - Inline pulse (tall primary-colored pill with AI-Generated Summary text)
   - Short pulse (smaller pill with confidence score)
   - Active pulse (animated with "Analyzing sources..." text)
3. **Expected:** All pulse bars are primary color (#c0c1ff), 4px (w-1) wide, rounded

### 4. Glassmorphism effect works

1. Scroll to "Glassmorphism" section
2. **Expected:** Semi-transparent panel overlaying background content
3. **Expected:** Panel has backdrop blur effect (background lines appear blurred through panel)
4. **Expected:** Panel shows text "Glassmorphism Panel" with rgba/background-blur spec

### 5. All shadcn/ui components render

1. Scroll through component sections below the design tokens
2. **Expected:** 16 component sections visible with titles:
   - Button (6 variants: Primary, Secondary, Outline, Ghost, Destructive, Link + 2 sizes)
   - Card (self-demonstrating with header, content, footer)
   - Accordion (3 items, collapsible)
   - Dialog (button opens glassmorphism modal)
   - Dropdown Menu (button opens menu with Edit/Duplicate/Delete)
   - Input & Textarea (labeled form fields)
   - Label (standalone label demo)
   - Select (dropdown with Gemini/OpenAI options)
   - Tabs (3 tabs: Overview/Details/Settings with content)
   - Slider (value display updates on drag)
   - Separator (horizontal line between text)
   - Scroll Area (20 scrollable items in fixed height)
   - Resizable Panels (2 draggable panels)
   - Tooltip (hover shows tooltip content)
   - Popover (click opens popover with glassmorphism styling)

### 6. Build and lint pass

1. Run `pnpm build`
2. **Expected:** Exit code 0, zero errors, 3 routes generated (/, /design, /_not-found)
3. Run `pnpm lint`
4. **Expected:** Exit code 0, "No ESLint warnings or errors"

### 7. File size compliance

1. Run `find src -name "*.tsx" -o -name "*.ts" | xargs wc -l`
2. **Expected:** No file exceeds 300 lines

### 8. Infrastructure utilities are importable

1. Verify `src/lib/env.ts` exports `env` with Zod-validated config
2. Verify `src/lib/logger.ts` exports `logger` with debug/info/warn/error methods
3. Verify `src/lib/errors.ts` exports `AppError` class and `toAppError` helper
4. Verify `src/lib/storage.ts` exports `get`, `set`, `remove`, `clear`, `localforage`
5. Verify `src/utils/style.ts` exports `cn` function

## Edge Cases

### Console errors on fresh load

1. Open browser DevTools console
2. Navigate to http://localhost:3000/design
3. **Expected:** Zero application errors (React DevTools info message is acceptable, favicon 404 is acceptable)

### Home page renders

1. Navigate to http://localhost:3000
2. **Expected:** "Deep Research" heading visible with "v1.0 rewrite in progress" subtitle
3. **Expected:** Page has dark background (Obsidian Well #0e0e10)

## Failure Signals

- Build fails with TypeScript or CSS errors
- Design page shows white background (light mode leaked)
- Surface swatches missing or showing wrong colors
- Components not interactive (buttons not clickable, accordion not collapsible)
- Console errors from component rendering

## Not Proven By This UAT

- Runtime behavior of env.ts validation with invalid env vars (server-side only, tested in later slices)
- localforage persistence across sessions (tested in S06)
- Component behavior within actual application screens (tested in S05+)
- Form component integration with react-hook-form (tested in S06)

## Notes for Tester

- The /design page is a development-only showcase — it will not ship to production
- The Dialog, Dropdown, and Popover components require click interaction to reveal their content
- The Slider component is interactive — drag it to confirm value updates
- All component styling uses the Obsidian Dark theme — no borders, tonal layering for separation

