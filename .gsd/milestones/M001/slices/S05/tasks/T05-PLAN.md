---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T05: Wire page.tsx and integrate all components end-to-end

Replace the placeholder page.tsx with a 'use client' component that renders Header and switches views based on uiStore.activeView: hub shows TopicInput + ReportConfig, active shows WorkflowProgress + ActiveResearch, report shows FinalReport. Wire the useResearch hook into TopicInput (startResearch) and ActiveResearch (abortResearch). Add Toaster from sonner for error notifications. Verify the full path: type topic → click Start → SSE stream → streaming progress → final report. Run pnpm build and all existing tests.

## Inputs

- `src/components/Header.tsx`
- `src/components/research/TopicInput.tsx`
- `src/components/research/WorkflowProgress.tsx`
- `src/components/research/ActiveResearch.tsx`
- `src/components/research/FinalReport.tsx`
- `src/components/research/ReportConfig.tsx`
- `src/components/MarkdownRenderer.tsx`
- `src/hooks/use-research.ts`
- `src/stores/research-store.ts`
- `src/stores/settings-store.ts`
- `src/stores/ui-store.ts`

## Expected Output

- `src/app/page.tsx`
- `src/app/providers.tsx`

## Verification

pnpm build && pnpm vitest run
