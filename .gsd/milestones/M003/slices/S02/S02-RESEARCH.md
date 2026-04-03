# S02 Research: Phase Freeze UX — Accordion Layout

**Calibration:** Targeted research. This is a well-scoped UI transformation using established patterns (Radix accordion, existing store, known design tokens). The main complexity is understanding how state maps to phases and where to inject freeze calls.

## Requirements Owned

- **R055** — Accordion layout with frozen/active distinction (collapsed frozen phases, summary badges, expanded active workspace)
- **R056** — Manual freeze actions for clarify/plan phases (Submit button freezes clarify, Approve button freezes plan)
- **R062** — Frozen phase visual badges and read-only state (✅ icon, muted styling for frozen; glow for active)

## Summary

S02 transforms the `ActiveResearchCenter` from a state-routed switch (showing one phase at a time) into an accordion where completed phases are collapsed read-only sections with summary badges, and the active phase is an expanded, editable workspace. The `RadixAccordion` component already exists at `src/components/ui/accordion.tsx`. The store already has `freeze(phase)` from S01. The work is primarily in `ActiveResearchCenter.tsx` — replacing its `renderCenterContent()` switch with an accordion — plus updating `ClarifyPanel` and `PlanPanel` to call `freeze()` on submit/approve.

## Recommendation

Three tasks in dependency order:
1. **Create `PhaseAccordion` component** — the new accordion layout that replaces `ActiveResearchCenter`'s content area
2. **Wire freeze calls into submit/approve buttons** — `ClarifyPanel` and `PlanPanel` call `store.freeze()` before triggering their parent callbacks
3. **Add frozen phase summary badges** — the collapsed accordion headers show contextual summaries ("3 questions answered", "4 search queries planned")

## Implementation Landscape

### Architecture: How the center panel works today

`ActiveResearchCenter.tsx` (230 lines) has a `renderCenterContent()` switch that renders ONE panel at a time based on `state`:
- `clarifying` / `awaiting_feedback` → `ClarifyPanel`
- `planning` / `awaiting_plan_review` → `PlanPanel`
- `searching` / `analyzing` / `reviewing` → streaming view
- `awaiting_results_review` → streaming view + `ResearchActions`
- `reporting` / `completed` → streaming view

This switch needs to become an accordion that renders ALL completed phases as collapsed items + the active phase as expanded.

### Phase-to-state mapping (critical for accordion logic)

| Phase | Frozen when checkpoint exists | Active states | Summary badge text |
|-------|-------------------------------|---------------|-------------------|
| clarify | `checkpoints.clarify` exists | `clarifying`, `awaiting_feedback` | "Questions answered" / count of questions |
| plan | `checkpoints.plan` exists | `planning`, `awaiting_plan_review` | "N search queries planned" |
| research | `checkpoints.research` exists | `searching`, `analyzing`, `reviewing`, `awaiting_results_review` | "N learnings, M sources" |
| report | `checkpoints.report` exists | `reporting`, `completed` | "Report generated" |

Frozen detection = `store.checkpoints[phase] !== undefined`. Active detection = current `state` matches phase's active states list.

### Key file changes

1. **`ActiveResearchCenter.tsx`** (230 lines → likely 200-250 lines with accordion)
   - Replace `renderCenterContent()` switch with `<PhaseAccordion>`
   - Keep error display, connection-interrupted banner, idle state at top level
   - Pass phase action callbacks through

2. **`ClarifyPanel.tsx`** (188 lines → ~195 lines)
   - Add `store.freeze("clarify")` call inside `handleSubmit` before calling `onSubmitFeedbackAndPlan`
   - This freezes the questions into `checkpoints.clarify` before the plan phase starts

3. **`PlanPanel.tsx`** (178 lines → ~185 lines)
   - Add `store.freeze("plan")` call inside `handleApprove` before calling `onApprovePlanAndResearch`
   - This freezes the plan into `checkpoints.plan` before research phase starts

4. **New: `src/components/research/PhaseAccordion.tsx`** (~200 lines)
   - Uses Radix Accordion from `src/components/ui/accordion.tsx`
   - Renders 4 accordion items (clarify, plan, research, report)
   - Frozen items: collapsed by default, click to expand read-only, show summary badge
   - Active item: expanded, editable, primary-color glow border
   - Future items (not yet started): hidden or grayed out

5. **`messages/en.json`** — Add new i18n keys under a `PhaseAccordion` namespace

6. **`messages/vi.json`** — Vietnamese translations (follow existing pattern)

### Store interaction

The store already has everything needed:
- `freeze(phase)` — creates immutable checkpoint snapshot
- `checkpoints` — `{ clarify?, plan?, research?, report? }` — check for frozen state
- `state` — determines which phase is active
- All workspace fields persist to localforage

No store changes needed for S02.

### Design tokens for frozen vs active

Frozen phases:
- Background: `bg-obsidian-surface-deck` (same as center panel)
- Badge: `text-obsidian-on-surface opacity-60` with `Check` icon from lucide
- Border: no border (Obsidian Deep = no borders, tonal layering)
- Summary text: `font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var/60`

Active phase:
- Glow: `ring-1 ring-obsidian-primary-deep/20` (already used in ActiveResearchLeft)
- Background: `bg-obsidian-surface-deck`
- Header: `text-obsidian-primary-deep` accent

### Frozen phase read-only content

When a frozen accordion item is expanded:
- **Clarify**: Render questions from `checkpoints.clarify.questions` via `MarkdownRenderer`. No edit toggle, no feedback textarea.
- **Plan**: Render plan from `checkpoints.plan.plan` via `MarkdownRenderer`. No edit toggle, no action buttons.
- **Research**: Render search results from `checkpoints.research.searchResults`. No CRUD buttons (those come in S03).
- **Report**: Render report from `checkpoints.report.result.report` via `MarkdownRenderer`. No export buttons yet (S05).

### Accordion component API

The Radix accordion accepts:
- `type="single"` — one item open at a time (what we want for frozen items)
- `collapsible` — allow collapsing the open item
- `value` / `onValueChange` — controlled mode

We need controlled mode: the active phase is always the open accordion item. User can click a frozen phase to expand it temporarily, but the active phase stays the "primary" expanded one. Actually, simpler: use `type="multiple"` so frozen items can be independently toggled while active is always open.

Better approach: Use `type="single"` with `collapsible=true`. The active phase is the default expanded value. When user clicks a frozen phase, it expands and the active one collapses (read-only mode). But this is confusing UX. 

**Simplest approach:** Use uncontrolled accordion with `defaultValue` set to the active phase ID. Frozen items start collapsed. User can toggle any item open/closed independently. Active phase header has visual indicator (glow, badge) regardless of open/closed state.

Actually, looking at Radix Accordion docs: for `type="single"`, only one item can be open. For `type="multiple"`, multiple can be open. We want the active phase always visible, and users can optionally expand frozen phases. So use `type="multiple"` with the active phase's value always in the open set.

Simplest implementation: Just render all items, let the active one default to open, frozen ones default to closed. Use `defaultValue={[activePhaseId]}`.

### What about the existing WorkflowProgress bar?

The `WorkflowProgress` step indicator at the top stays as-is for S02. It already shows completed/active/awaiting states. The accordion goes in the center panel below it. No changes to WorkflowProgress needed for this slice — S02 focuses on the center content area.

### What about the three-panel layout?

The current layout is `ActiveResearch` → `WorkflowProgress` + `ResizablePanelGroup(left, center, right)`. The accordion goes inside the center panel (`ActiveResearchCenter`). Left panel (search questions/sources) and right panel stay as-is. No layout changes needed.

## Constraints

- **No store changes** — all checkpoint APIs already exist from S01
- **Component file limit** — 300 lines max (ESLint enforced). `PhaseAccordion` should be ~150-200 lines
- **i18n** — all new strings go through `useTranslations`
- **No borders** — Obsidian Deep design uses tonal layering, no border lines between accordion items
- **Accordion UI component** — already exists at `src/components/ui/accordion.tsx`, uses Radix. Default styling has `border-b` between items — remove for Obsidian Deep.
- **The accordion component needs restyling** — the default shadcn accordion has borders and light-theme styling. Need to override with Obsidian Deep tokens.

## Risks

- **Accordion UI restyling** — the default accordion component has `border-b` on items and light-theme colors. Need to strip these and apply Obsidian Deep styling in PhaseAccordion. Low risk — just CSS overrides.
- **Controlled vs uncontrolled accordion** — need to decide whether active phase auto-expands or user controls all. Uncontrolled with `defaultValue` is simplest and least likely to cause state bugs. Low risk.
- **Read-only enforcement** — frozen panels should not allow editing. The simplest approach is to not render edit controls when a checkpoint exists. Medium risk — need to ensure ClarifyPanel/PlanPanel check checkpoint state to disable editing. But actually, the frozen panels in the accordion won't use ClarifyPanel/PlanPanel at all — they'll render read-only MarkdownRenderer directly. This is cleaner.

## Don't Hand-Roll

- Use the existing `Accordion` component from `src/components/ui/accordion.tsx` — don't build custom collapsible logic
- Use `MarkdownRenderer` for read-only content — already handles markdown rendering
- Use existing design tokens — no custom colors needed
