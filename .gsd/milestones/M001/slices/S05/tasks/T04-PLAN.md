---
estimated_steps: 1
estimated_files: 10
skills_used: []
---

# T04: Build all research UI components (Header, TopicInput, WorkflowProgress, ActiveResearch, FinalReport, ReportConfig, MarkdownRenderer)

Create all visual components for the research screens. Header with logo, status indicator, and nav buttons. TopicInput with glassmorphism textarea and Start Research button. WorkflowProgress as horizontal step indicator. ActiveResearch as 3-panel resizable layout (left: questions/sources, center: streaming cards, right: activity log). FinalReport with markdown display and right sidebar (TOC, sources). ReportConfig with style/length selectors. MarkdownRenderer wrapping marked with Obsidian Deep styling. Each component under 300 lines.

## Inputs

- `src/stores/research-store.ts`
- `src/stores/settings-store.ts`
- `src/stores/ui-store.ts`
- `src/hooks/use-research.ts`
- `src/engine/research/types.ts`
- `src/components/ui/resizable.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/separator.tsx`

## Expected Output

- `src/components/Header.tsx`
- `src/components/research/TopicInput.tsx`
- `src/components/research/WorkflowProgress.tsx`
- `src/components/research/ActiveResearch.tsx`
- `src/components/research/ActiveResearchLeft.tsx`
- `src/components/research/ActiveResearchCenter.tsx`
- `src/components/research/ActiveResearchRight.tsx`
- `src/components/research/FinalReport.tsx`
- `src/components/research/ReportConfig.tsx`
- `src/components/MarkdownRenderer.tsx`

## Verification

pnpm build
