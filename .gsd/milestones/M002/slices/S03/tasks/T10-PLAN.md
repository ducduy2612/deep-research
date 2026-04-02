---
estimated_steps: 15
estimated_files: 4
skills_used: []
---

# T10: Wire panels into ActiveResearch layout

Update the research page and ActiveResearch components to integrate the new checkpoint panels:

1. Update TopicInput to call `clarify()` instead of `start()`
2. Update ActiveResearch layout to show panels based on store state:
   - `clarifying` → show clarify streaming in center panel
   - `awaiting_feedback` → show ClarifyPanel
   - `planning` → show plan streaming in center panel
   - `awaiting_plan_review` → show PlanPanel
   - `searching/analyzing/reviewing` → show search progress (existing)
   - `awaiting_results_review` → show ResearchActions + existing results
   - `reporting` → show report streaming (existing)
   - `completed` → show final report (existing)
3. Update WorkflowProgress to reflect multi-phase states
4. Wire up timer to track total elapsed across all phases

The left panel (config) and right panel (sources) stay the same.
The center panel switches content based on the current state.

## Inputs

- `S03 T08 hook changes`
- `S03 T09 panel components`

## Expected Output

- `Updated ActiveResearch, TopicInput, WorkflowProgress`

## Verification

pnpm lint && pnpm build
