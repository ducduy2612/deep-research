# Deep Research - Obsidian Deep Design System Reference

> Generated from Stitch project `14295135505384260738` using the "Obsidian Deep" design system.

## Overview

**Design System:** Obsidian Deep ("The Digital Obsidian")
**Stitch Project:** `projects/14295135505384260738`
**Design Asset ID:** `assets/94a8dbe74c7d46248045eb79751ad814`

---

## Screens

| # | Screen | File | Description |
|---|--------|------|-------------|
| 1 | Deep Research Hub | `screens/01-deep-research-hub` | Main landing/empty state |
| 2 | Premium Landing | `screens/02-premium-landing` | Alternative hero landing |
| 3 | Research In Progress | `screens/03-research-in-progress` | Active research with 3-panel layout |
| 4 | Final Report | `screens/04-final-report` | Editorial report with sidebar |
| 5 | Settings Modal | `screens/05-settings-modal` | Glassmorphism settings dialog |
| 6 | Research History | `screens/06-research-history` | Session archive with filters |

Each screen has both `.html` (reference code) and `.png` (visual screenshot) files.

---

## Design Tokens

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#c0c1ff` | Primary actions, links, active states |
| `primary_container` | `#8083ff` | Gradient end, hover states |
| `primary_fixed` | `#e1e0ff` | Light context primary |
| `secondary` | `#adc6ff` | Secondary actions |
| `secondary_container` | `#0566d9` | Secondary backgrounds |
| `tertiary` | `#d0bcff` | Accent highlights |
| `tertiary_container` | `#a078ff` | Tertiary backgrounds |
| `surface` | `#131315` | Base canvas |
| `surface_container_lowest` | `#0e0e10` | Inset areas, wells |
| `surface_container_low` | `#1c1b1d` | Sidebars, navigation |
| `surface_container` | `#201f22` | Primary work surface |
| `surface_container_high` | `#2a2a2c` | Interactive elements, hover |
| `surface_container_highest` | `#353437` | Floating UI, modals |
| `surface_bright` | `#39393b` | Bright accent surfaces |
| `on_surface` | `#e5e1e4` | Primary text (NEVER pure white) |
| `on_surface_variant` | `#c7c4d7` | Secondary text, labels |
| `outline` | `#908fa0` | Subtle separators |
| `outline_variant` | `#464554` | Ghost borders |
| `error` | `#ffb4ab` | Error text |
| `error_container` | `#93000a` | Error backgrounds |

### Override Colors (Custom)

| Token | Hex | Purpose |
|-------|-----|---------|
| Primary | `#6366f1` | Indigo seed color |
| Neutral | `#09090b` | Zinc-based neutral |
| Secondary | `#3b82f6` | Blue accent |
| Tertiary | `#8b5cf6` | Violet accent |

### Typography

| Role | Font | Notes |
|------|------|-------|
| Display/Headlines | Inter | `letter-spacing: -0.04em` (tight) |
| Body | Inter | `line-height: 1.5` for readability |
| Labels/Monospace | JetBrains Mono or Space Grotesk | System data, scores, timestamps |

### Spacing & Shape

| Token | Value |
|-------|-------|
| Roundness | `ROUND_EIGHT` (8px / 0.5rem) |
| Spacing Scale | `1` (base scale) |
| Search bar radius | `1.5rem` (24px, xl) |
| Card radius | `0.75rem` (12px, md) |
| Button radius | `0.25rem` (4px, sm) for precise tool feel |

---

## Design Principles

### 1. The No-Line Rule
**NEVER use 1px solid borders.** All structural boundaries are defined through background color shifts (tonal layering). If separation is needed, increase whitespace or shift surface color.

### 2. Glassmorphism
Floating elements (modals, command palette, overlays):
```css
background: rgba(53, 52, 55, 0.7); /* surface_container_highest at 70% */
backdrop-filter: blur(20px);
border-radius: 0.75rem;
box-shadow: 0px 24px 48px -12px rgba(0, 0, 0, 0.5); /* whisper shadow */
```

### 3. Ghost Borders (Fallback)
When accessibility requires a border (inputs, buttons):
```css
border: 1px solid rgba(70, 69, 84, 0.15); /* outline_variant at 15% opacity */
```

### 4. AI Pulse (Signature Component)
A 4px wide vertical pill using `primary` color at the start of a line to indicate AI-generated content:
```css
width: 4px;
border-radius: 2px;
background: #c0c1ff;
```

### 5. Gradient Primary Buttons
```css
background: linear-gradient(135deg, #c0c1ff 0%, #8083ff 100%);
color: #1000a9; /* on_primary */
border-radius: 0.75rem;
```

### 6. Surface Hierarchy
- **Well** (`#0e0e10`) → Recedes content (main workspace)
- **Deck** (`#1c1b1d`) → Navigation, sidebars
- **Sheet** (`#201f22`) → Content modules, cards
- **Raised** (`#2a2a2c`) → Interactive, hover
- **Float** (`#353437`) → Modals, overlays

---

## Component Patterns

### Buttons
| Type | Style |
|------|-------|
| Primary | Gradient fill (`primary` to `primary_container`), `on_primary` text, `0.75rem` radius |
| Secondary | `surface_container_high` bg, no border. Hover: `surface_bright` |
| Ghost/Tertiary | No background, `primary` text. Hover: underline or `surface_bright` |

### Input Fields
- Background: `surface_container_low`
- No border (default)
- Focus: bg shifts to `surface_container_high`, ghost border glow in `primary` at 20%:
  ```css
  box-shadow: 0 0 0 2px rgba(192, 193, 255, 0.2);
  ```

### Cards
- Background: `surface_container`
- No borders, no dividers
- Separation via `1.5rem` vertical spacing
- Hover: shift from `surface_container_low` to `surface_container_high` (tonal lift, no movement)

### Search Bar (Signature)
```css
background: rgba(53, 52, 55, 0.7);
backdrop-filter: blur(20px);
border-radius: 1.5rem; /* xl */
```
Focus glow: `box-shadow: 0 0 0 2px rgba(160, 120, 255, 0.2);`

---

## Tailwind CSS Mapping

```js
// tailwind.config.ts extend
colors: {
  obsidian: {
    surface:           '#131315',
    'surface-well':    '#0e0e10',
    'surface-deck':    '#1c1b1d',
    'surface-sheet':   '#201f22',
    'surface-raised':  '#2a2a2c',
    'surface-float':   '#353437',
    'surface-bright':  '#39393b',
    primary:           '#c0c1ff',
    'primary-deep':    '#8083ff',
    'primary-seed':    '#6366f1',
    secondary:         '#adc6ff',
    tertiary:          '#d0bcff',
    'on-surface':      '#e5e1e4',
    'on-surface-var':  '#c7c4d7',
    outline:           '#908fa0',
    'outline-ghost':   'rgba(70, 69, 84, 0.15)',
    error:             '#ffb4ab',
    'error-bg':        '#93000a',
  }
}
```

---

## Implementation Notes

1. **No pure white text** - Use `#e5e1e4` (`on_surface`) for primary, `#c7c4d7` (`on_surface_variant`) for secondary
2. **No 4px border-radius** - Looks "bootstrapped." Use 8-12px range
3. **No harsh shadows** - Shadows should be a "whisper" of depth, never visible black edges
4. **No horizontal dividers** - Use spacing (1.5rem) or tonal shifts
5. **Monospace for data** - Switch to monospace for numbers, scores, timestamps to signal "raw data"
6. **Asymmetrical layouts** - Let content drive container widths, not fixed grids
7. **Dark mode only** - This design system is exclusively dark mode
