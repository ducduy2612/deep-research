---
estimated_steps: 31
estimated_files: 3
skills_used: []
---

# T01: Create PhaseAccordion component with frozen/active rendering and i18n strings

Build the PhaseAccordion component that replaces ActiveResearchCenter's state-routed switch. Uses Radix Accordion (type=multiple, defaultValue=[activePhaseId]) to show collapsed frozen phases with summary badges and expanded active phase with glow. Frozen content rendered read-only via MarkdownRenderer. Add i18n keys to en.json and vi.json.

Steps:
1. Add PhaseAccordion i18n namespace to `messages/en.json` with keys for: phase headers (clarifyTitle, planTitle, researchTitle, reportTitle), summary badges (clarifySummary with {count}, planSummary with {count}, researchSummary with {learnings} and {sources}, reportSummary), frozen badge text, and active phase label
2. Add matching translations to `messages/vi.json`
3. Create `src/components/research/PhaseAccordion.tsx` (~180-200 lines):
   - Import Accordion/AccordionItem/AccordionTrigger/AccordionContent from ui/accordion
   - Import useResearchStore for state, checkpoints, steps, searchResults, questions, plan, result
   - Import MarkdownRenderer for read-only frozen content
   - Import Check, Loader2, ChevronDown icons from lucide-react
   - Define PHASE_CONFIG array mapping each phase to: { id, label, activeStates[], getSummary(checkpoint), renderFrozenContent(checkpoint) }
   - Phase detection: frozen = checkpoints[phase] !== undefined, active = state is in phase's activeStates list
   - Use type=multiple with defaultValue=[activePhaseId] so active phase starts expanded
   - Frozen accordion items: show ✅ Check icon + summary badge (e.g. '3 questions answered') in header, collapsed by default. Content area renders checkpoint data via MarkdownRenderer with muted opacity-60 styling
   - Active accordion item: show primary-color header + ring-1 ring-obsidian-primary-deep/20 glow. Content area renders the appropriate live panel (ClarifyPanel, PlanPanel, streaming view, etc.) via render prop or callback
   - Future phases (no checkpoint, not active): render as disabled/muted AccordionItem with no content
   - Override default shadcn accordion styling: remove border-b from AccordionItem, apply Obsidian Deep tonal layering
   - Frozen header: font-mono text-[10px] uppercase tracking-widest text-obsidian-on-surface-var/60
   - Active header: text-obsidian-primary-deep font-semibold
   - Strip the border-b className from AccordionItem usage (pass className override)
4. The component accepts render props for active phase content: onRenderClarify, onRenderPlan, onRenderStreaming, onRenderResearchActions, onRenderReport callbacks
5. Export PhaseAccordion from the file

Must-Haves:
- [ ] PhaseAccordion renders 4 accordion items (clarify, plan, research, report)
- [ ] Frozen detection via checkpoints[phase] !== undefined works correctly
- [ ] Active detection via state membership in phase's activeStates[] works correctly
- [ ] Summary badges show contextual info (question count, query count, learnings+sources, report status)
- [ ] Frozen content is read-only via MarkdownRenderer with opacity-60
- [ ] Active phase has ring-1 ring-obsidian-primary-deep/20 visual treatment
- [ ] AccordionItem has no border-b (Obsidian Deep = no borders)
- [ ] i18n keys added to both en.json and vi.json
- [ ] Component stays under 300 lines

## Inputs

- `src/components/ui/accordion.tsx — existing Radix accordion component to use`
- `src/stores/research-store.ts — store with checkpoints, state, freeze()`
- `src/engine/research/types.ts — CheckpointPhase, ResearchCheckpoints, checkpoint types`
- `src/components/MarkdownRenderer.tsx — for rendering read-only frozen content`
- `messages/en.json — existing i18n file to add PhaseAccordion namespace`
- `messages/vi.json — Vietnamese translations file`

## Expected Output

- `src/components/research/PhaseAccordion.tsx — new accordion component with frozen/active rendering`
- `messages/en.json — PhaseAccordion i18n namespace added`
- `messages/vi.json — Vietnamese PhaseAccordion translations added`

## Verification

pnpm build succeeds with no TypeScript errors. grep -q 'PhaseAccordion' src/components/research/PhaseAccordion.tsx. grep -q 'PhaseAccordion' messages/en.json. Component file is under 300 lines: test $(wc -l < src/components/research/PhaseAccordion.tsx) -le 300

## Observability Impact

Frozen/active phase state is inspectable via Zustand devtools by reading store.checkpoints and store.state — no new observability surfaces needed.
