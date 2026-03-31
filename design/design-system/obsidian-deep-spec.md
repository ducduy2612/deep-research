# Obsidian Deep - Full Design System Specification

> Source: Stitch design system `assets/94a8dbe74c7d46248045eb79751ad814`

---

## Design System: Editorial Precision & Tonal Depth

### 1. Overview & Creative North Star: "The Digital Obsidian"

This design system is engineered for the "Deep Research" environment — a high-cognitive-load space where clarity is paramount and distractions are architectural failures. Our Creative North Star is **The Digital Obsidian**: a philosophy that treats the UI as a single, polished volcanic stone. Instead of building with lines and boxes, we "carve" into the dark surface using light and tonal shifts.

We break the "standard SaaS template" by rejecting the 1px border. We achieve structure through intentional asymmetry and a rigorous hierarchy of dark surfaces. The goal is a workspace that feels like a premium, quiet library for the mind — calm, authoritative, and frictionless.

---

### 2. Colors: Tonal Architecture

The palette is a study in "Near-Blacks." We do not use pure black (#000), which causes ocular strain. We use a sophisticated range of zinc and slate tones to create a sense of infinite depth.

#### The Surface Hierarchy

Depth is managed through the `surface-container` tiers. **Rule of Thumb:** The more interactive or "focused" an element is, the higher it sits in the stack (and thus, the lighter its background).

- **Foundation (`surface` / `#131315`):** The canvas. Used for the main background.
- **The Well (`surface_container_lowest` / `#0e0e10`):** Used for inset areas like sidebars or secondary navigation to "recede" from the user.
- **The Sheet (`surface_container` / `#201f22`):** The primary work surface for content modules.
- **The Highlight (`surface_container_highest` / `#353437`):** Reserved for hover states or active selection cards.

#### The "No-Line" Rule

**Explicit Instruction:** You are prohibited from using 1px solid borders for sectioning. Structural boundaries must be defined solely through background shifts. If you need to separate a list from a background, change the background of the list container to `surface_container_low`. If it doesn't look separated enough, increase the whitespace (`spacing-8`), do not add a line.

#### The "Glass & Gradient" Rule

To elevate the experience from "utility" to "premium," floating elements (Modals, Command Palettes, Popovers) must use **Glassmorphism**.

- **Token:** `surface_variant` at 60% opacity.
- **Effect:** `backdrop-blur: 20px`.
- **Signature Texture:** Primary actions (`primary`) should utilize a subtle linear gradient: `linear-gradient(135deg, #c0c1ff 0%, #8083ff 100%)`. This provides a "soul" to the button that flat hex codes cannot replicate.

---

### 3. Typography: The Editorial Voice

We use **Inter** for its neutral, high-legibility character, but we style it with tight letter-spacing to give it a "custom-cast" editorial feel.

- **Display & Headlines:** Use `display-md` or `headline-lg` for dashboard summaries. Apply `letter-spacing: -0.04em`. This "tight" setting creates a sense of density and importance.
- **Technical Monospace:** For AI raw data, confidence scores, or timestamps, use a monospace font (e.g., JetBrains Mono or Roboto Mono) at `label-sm`. This signals "System Data" versus "Human Narrative."
- **Contrast Ratios:** Use `on_surface` (#e5e1e4) for primary text and `on_surface_variant` (#c7c4d7) for secondary "whisper" text. Never use pure white text; it vibrates uncomfortably against near-black backgrounds.

---

### 4. Elevation & Depth: The Layering Principle

Hierarchy is achieved by "stacking" surfaces rather than drawing boxes.

- **Ambient Shadows:** Floating elements (Glass) use a tinted shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color must never be grey; it should be a darker version of the surface it sits upon to mimic natural light occlusion.
- **The "Ghost Border" Fallback:** If accessibility requirements (WCAG) demand a border for an input or button, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
- **Roundedness Scale:**
    - **Standard Containers:** `md` (0.75rem / 12px) for a soft, modern feel.
    - **Interactive Elements:** `sm` (0.25rem / 4px) for buttons to maintain a "precise tool" aesthetic.

---

### 5. Components: Precision Primitives

#### Buttons

- **Primary:** Gradient fill (`primary` to `primary_container`), white text (`on_primary`), `DEFAULT` (8px) rounding.
- **Secondary:** `surface_container_highest` background, no border. On hover, shift background to `surface_bright`.
- **Tertiary/Ghost:** No background. `primary` text color. Use only for low-emphasis actions like "Cancel."

#### Input Fields

- **Style:** Background `surface_container_low`, `none` border. On focus, transition the background to `surface_container_high` and add a 1px `primary` ghost border (20% opacity).
- **Monospace Integration:** Use monospace for the helper text in AI prompt inputs to emphasize the "Research/Technical" nature of the tool.

#### Cards & Lists

- **The Divider Ban:** Strictly forbid `<hr>` or border-bottom dividers.
- **Alternative:** Use `spacing-2` (0.4rem) of vertical "dead space" or a slight color shift to `surface_container_low` for zebra-striping.

#### Command Palette (Specialty Component)

As an AI tool, the Command Palette is the heart. Style this with maximum Glassmorphism:

- **Blur:** 32px.
- **Fill:** `surface_container` at 70% opacity.
- **Shadow:** `xl` (Extra Large) diffused shadow.

---

### 6. Do's and Don'ts

#### Do:

- **Use Asymmetry:** Place a high-density data table (Monospace) next to a large-type editorial summary (Inter) to create visual interest.
- **Use Background Shifts:** Use `surface_container_lowest` for a global sidebar and `surface` for the main stage.
- **Focus on Micro-Interactions:** A button shouldn't just change color; it should subtly "lift" using a slightly lighter background shift.

#### Don't:

- **Don't use 100% Opaque Borders:** This shatters the "Digital Obsidian" illusion and makes the UI feel like a 2010 bootstrap site.
- **Don't use Harsh Shadows:** If the shadow is easily visible, it's too heavy. It should be a "whisper" of depth.
- **Don't Over-Color:** Stick to the `Indigo` and `Violet` accents for action. Keep the rest of the UI monochromatic (Zinc/Slate) to maintain a "Focus" personality.

---

## Complete Token Map

```json
{
  "namedColors": {
    "background": "#131315",
    "error": "#ffb4ab",
    "error_container": "#93000a",
    "inverse_on_surface": "#313032",
    "inverse_primary": "#494bd6",
    "inverse_surface": "#e5e1e4",
    "on_background": "#e5e1e4",
    "on_error": "#690005",
    "on_error_container": "#ffdad6",
    "on_primary": "#1000a9",
    "on_primary_container": "#0d0096",
    "on_primary_fixed": "#07006c",
    "on_primary_fixed_variant": "#2f2ebe",
    "on_secondary": "#002e6a",
    "on_secondary_container": "#e6ecff",
    "on_secondary_fixed": "#001a42",
    "on_secondary_fixed_variant": "#004395",
    "on_surface": "#e5e1e4",
    "on_surface_variant": "#c7c4d7",
    "on_tertiary": "#3c0091",
    "on_tertiary_container": "#340080",
    "on_tertiary_fixed": "#23005c",
    "on_tertiary_fixed_variant": "#5516be",
    "outline": "#908fa0",
    "outline_variant": "#464554",
    "primary": "#c0c1ff",
    "primary_container": "#8083ff",
    "primary_fixed": "#e1e0ff",
    "primary_fixed_dim": "#c0c1ff",
    "secondary": "#adc6ff",
    "secondary_container": "#0566d9",
    "secondary_fixed": "#d8e2ff",
    "secondary_fixed_dim": "#adc6ff",
    "surface": "#131315",
    "surface_bright": "#39393b",
    "surface_container": "#201f22",
    "surface_container_high": "#2a2a2c",
    "surface_container_highest": "#353437",
    "surface_container_low": "#1c1b1d",
    "surface_container_lowest": "#0e0e10",
    "surface_dim": "#131315",
    "surface_tint": "#c0c1ff",
    "surface_variant": "#353437",
    "tertiary": "#d0bcff",
    "tertiary_container": "#a078ff",
    "tertiary_fixed": "#e9ddff",
    "tertiary_fixed_dim": "#d0bcff"
  },
  "overrides": {
    "neutralColor": "#09090b",
    "primaryColor": "#6366f1",
    "secondaryColor": "#3b82f6",
    "tertiaryColor": "#8b5cf6"
  },
  "typography": {
    "headlineFont": "INTER",
    "bodyFont": "INTER",
    "labelFont": "INTER"
  },
  "shape": {
    "roundness": "ROUND_EIGHT"
  },
  "spacingScale": 1
}
```
