# Design Screens Index

> Stitch Project: `projects/14295135505384260738`
> Design System: Obsidian Deep (`assets/94a8dbe74c7d46248045eb79751ad814`)

---

## Screen Map

### 1. Deep Research Hub (`01-deep-research-hub`)
- **Stitch ID:** `4ef8b4ffa59f482385a39afbaf347fd8`
- **Purpose:** Main landing page / empty state when no research is active
- **Key Elements:** Centered search bar with glassmorphism, topic suggestions, workflow progress indicator
- **Route:** `/` (home, empty state)

### 2. Premium Landing (`02-premium-landing`)
- **Stitch ID:** `a3d313a8db06462db6575ff7cb101540`
- **Purpose:** Alternative hero landing with enhanced branding
- **Key Elements:** Hero section, feature highlights, premium search input
- **Route:** `/` (alternative landing)

### 3. Research In Progress (`03-research-in-progress`)
- **Stitch ID:** `42c3d9cb38e44468bd6cd98899761722`
- **Purpose:** Active research view showing real-time progress
- **Key Elements:** 3-panel layout (sidebar questions/sources, main result grid, activity log), workflow progress bar, streaming result cards
- **Route:** `/` (during active research)

### 4. Final Report (`04-final-report`)
- **Stitch ID:** `1909331ec2d4406aac27376878ca0f8c`
- **Purpose:** Completed research report display
- **Key Elements:** Editorial markdown report, table of contents sidebar, knowledge graph, source references, AI confidence score
- **Route:** `/` (after research completes)

### 5. Settings Modal (`05-settings-modal`)
- **Stitch ID:** `024040f13b86415db262339c73394561`
- **Purpose:** App configuration modal
- **Key Elements:** Tabbed interface (AI Models, Search, General, Advanced), glassmorphism overlay, model selectors, API config, parameter sliders
- **Trigger:** Settings button in header

### 6. Research History (`06-research-history`)
- **Stitch ID:** `4f4a1f6f829f46168638221d6f6d781f`
- **Purpose:** Past research sessions archive
- **Key Elements:** Stats row, filter chips, session cards with AI Pulse accent bars, search, import/export
- **Trigger:** History button in header

---

## File Structure

```
design/
  DESIGN.md                          # Main design reference (tokens, principles, Tailwind mapping)
  SCREENS.md                         # This file - screen index
  design-system/
    obsidian-deep-spec.md            # Full design system specification from Stitch
  screens/
    01-deep-research-hub.html        # Reference HTML
    01-deep-research-hub.png         # Screenshot
    02-premium-landing.html
    02-premium-landing.png
    03-research-in-progress.html
    03-research-in-progress.png
    04-final-report.html
    04-final-report.png
    05-settings-modal.html
    05-settings-modal.png
    06-research-history.html
    06-research-history.png
```

---

## Stitch MCP Commands Reference

```bash
# Get project
get_project(name: "projects/14295135505384260738")

# List screens
list_screens(projectId: "14295135505384260738")

# Get specific screen
get_screen(name: "projects/14295135505384260738/screens/{screenId}", projectId: "14295135505384260738", screenId: "{screenId}")

# List design systems
list_design_systems(projectId: "14295135505384260738")

# Edit screen
edit_screens(projectId: "14295135505384260738", selectedScreenIds: ["{id}"], prompt: "...")

# Generate new screen
generate_screen_from_text(projectId: "14295135505384260738", prompt: "...")

# Apply design system
apply_design_system(projectId: "14295135505384260738", assetId: "94a8dbe74c7d46248045eb79751ad814", selectedScreenInstances: [...])
```
