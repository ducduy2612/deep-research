---
estimated_steps: 24
estimated_files: 3
skills_used: []
---

# T09: Create ClarifyPanel, PlanPanel, ResearchActions components

Create three new UI components for the checkpoint panels:

1. **ClarifyPanel** (src/components/research/ClarifyPanel.tsx):
   - Shows streamed questions from store (step text for clarify step)
   - Editable markdown renderer (can edit the questions)
   - Feedback textarea
   - "Write Report Plan" button → calls submitFeedbackAndPlan()
   - Loading state while clarifying

2. **PlanPanel** (src/components/research/PlanPanel.tsx):
   - Shows streamed plan from store (step text for plan step)
   - Editable markdown renderer
   - "Start Research" button → calls approvePlanAndResearch()
   - "Rewrite Plan" button (resubmit with modified plan)
   - Loading state while planning

3. **ResearchActions** (src/components/research/ResearchActions.tsx):
   - Shows after search/analyze/review phase completes
   - Shows search result summaries (learnings count, sources count)
   - Suggestion textarea + "Continue Research" button → calls requestMoreResearch()
   - "Generate Report" button → calls generateReport()
   - Loading state while researching

All components:
- Use existing Obsidian Deep design tokens
- Stay under 300 lines each
- Use store selectors, not props
- Use next-intl for strings

## Inputs

- `src/stores/research-store.ts`
- `src/hooks/use-research.ts`
- `design/DESIGN.md`

## Expected Output

- `ClarifyPanel.tsx`
- `PlanPanel.tsx`
- `ResearchActions.tsx`

## Verification

pnpm lint && pnpm build
