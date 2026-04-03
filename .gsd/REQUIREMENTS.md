# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

## Active

### R050 — Checkpoint + workspace store separation

- Class: core-capability
- Status: active
- Description: Research store restructured with immutable `checkpoints` object (clarify, plan, research) and mutable `workspace` object scoped to the active phase. Frozen checkpoint data is never mutated after phase completion.
- Why it matters: Enables the frozen/active workspace model — the architectural foundation for all other M003 features.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Must preserve backward compatibility with existing SSE event handling and hydration.

### R051 — Workspace state persistence across refresh

- Class: continuity
- Status: active
- Description: Active workspace state (edits, partial results, suggestion text, manual queries) persists to localforage and survives browser refresh. On rehydration, mid-stream states convert to nearest awaiting_* state as before, but workspace edits are restored.
- Why it matters: Users shouldn't lose their in-progress work on refresh. Current persistence only saves checkpoint-level data.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: M003/S02
- Validation: unmapped
- Notes: Extends existing auto-persist subscription and Zod-validated schema.

### R052 — Research workspace per-task CRUD (delete, retry, manual queries)

- Class: primary-user-loop
- Status: active
- Description: Each search result is an editable card. User can: delete a card (removes query + learning + sources from accumulated data), retry a failed/bad query (re-search only, single query), and add manual queries (queued for next "More Research" batch).
- Why it matters: The research phase is where users spend the most time. Without CRUD control, they're passive observers of whatever the AI decides to search.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Delete removes everything (query, learning, sources) from downstream data. Retry is search-only (not analyze). Manual queries queue for next batch.

### R053 — Suggestion input + single review round per "More Research"

- Class: primary-user-loop
- Status: active
- Description: Suggestion input appears pre-fill when user is about to click "More Research". Included in review prompt so AI generates follow-up queries aligned with user's direction. One review round per click.
- Why it matters: Gives users steering control over research depth and direction without overwhelming them with options.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Suggestion is consumed only when "More Research" is clicked, not continuously.

### R054 — Explicit "Finalize Findings" to freeze research phase

- Class: core-capability
- Status: active
- Description: An explicit "Finalize Findings" button that freezes the research phase, converting workspace data (learnings, sources, images) into an immutable checkpoint before proceeding to report.
- Why it matters: The user must be in control of when research is "done". Auto-freezing would cut short iterative deepening.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped

### R055 — Phase freeze UX — accordion layout with frozen/active distinction

- Class: core-capability
- Status: active
- Description: Accordion layout where completed phases are collapsed (showing summary badge) and read-only, while the active phase is expanded and editable. Clear visual distinction between frozen and active states.
- Why it matters: Gives users a clear sense of progress — "I've locked in clarify, I've locked in plan, I'm working on research now."
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Frozen phases show summary (e.g. "3 questions answered"). Click to expand read-only. Active phase takes full workspace.

### R056 — Manual freeze actions for clarify/plan phases

- Class: core-capability
- Status: active
- Description: User explicitly clicks a freeze/submit button to lock in the clarify and plan phases. No auto-freezing on stream end.
- Why it matters: User control over phase transitions. Current behavior (Submit Feedback & Plan) already does this for clarify — extend consistently.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped

### R057 — Report workspace — feedback input + AI regeneration

- Class: primary-user-loop
- Status: active
- Description: Report phase is a feedback workspace, not an editor. User sees the streamed report and can write comments/requirements. "Regenerate" sends frozen inputs + user feedback to AI for report rewrite. Multiple regeneration rounds possible.
- Why it matters: Allows iterative refinement without the complexity of inline editing. Simpler and more predictable than freeform editing.
- Source: user
- Primary owning slice: M003/S04
- Supporting slices: none
- Validation: unmapped
- Notes: No inline report text editing. User writes feedback, AI regenerates entire report from frozen checkpoint data.

### R058 — Report export — Markdown (.md) download

- Class: core-capability
- Status: active
- Description: User can download the final report as a .md file with proper filename (derived from report title or topic).
- Why it matters: Most basic export format — users need to get their report out of the app.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Trivial — Blob download from report markdown string.

### R059 — Report export — PDF generation (client-side)

- Class: core-capability
- Status: active
- Description: User can export the final report as PDF, generated entirely client-side using html2pdf.js (markdown → HTML via marked → render to DOM → html2pdf.js capture).
- Why it matters: PDF is the most common sharing format. Client-side generation avoids server dependencies.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Uses html2pdf.js (already established pattern). marked already in deps for HTML conversion.

### R060 — Search result export (MD/JSON)

- Class: core-capability
- Status: active
- Description: User can export individual or all search results as Markdown or JSON from the research workspace.
- Why it matters: Researchers often need raw data separate from the report for their own analysis.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: M003/S03
- Validation: unmapped

### R061 — Add-to-knowledge-base from search results

- Class: integration
- Status: active
- Description: User can add search result content (learning + sources) directly to the knowledge base from the research workspace.
- Why it matters: Bridges research and knowledge base — useful findings get persisted for future research sessions.
- Source: inferred
- Primary owning slice: M003/S05
- Supporting slices: M003/S03
- Validation: unmapped

### R062 — Frozen phase visual badges and read-only state

- Class: core-capability
- Status: active
- Description: Completed phases display a "frozen" badge (e.g. ✅ icon, muted styling) and their content is non-editable. Active phase has distinct visual treatment (glowing border, primary color accent).
- Why it matters: Visual clarity about what's locked vs what's editable prevents user confusion.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped

## Validated

### UI-01 — All 6 screens implement Obsidian Deep design system (dark-only, tonal layering, no borders)

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S01 — Design tokens, Tailwind config, /design page with 30/30 browser assertions; M001-S09 — polish pass confirmed across all components

### UI-02 — System uses surface hierarchy (Well → Deck → Sheet → Raised → Float) consistently across all components

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S01 — 7 surface levels as swatches on /design page; M001-S09 — surface hierarchy corrections applied

### UI-03 — Floating elements use glassmorphism (backdrop-blur, semi-transparent backgrounds)

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S01 — Glassmorphism demo with backdrop-blur(20px) + rgba(53,52,55,0.7); S05/S06 — glassmorphism dialogs

### UI-04 — Typography uses Inter for body and JetBrains Mono for code, with consistent spacing tokens

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S01 — Inter + JetBrains Mono via next/font, CSS variable strategy, 4 typography roles demonstrated

### UI-05 — No component file exceeds 300 lines

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S01 through S09 — wc -l confirms all files under 300 lines (max: HistoryDialog at 300)

### RES-01 — User can input a research topic via the Research Hub screen

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S05 — TopicInput component with glassmorphism textarea and Start Research button

### RES-02 — User can watch real-time streaming progress of each research step

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S05 — ActiveResearch 3-panel layout with WorkflowProgress step indicator and streaming cards

### RES-03 — User receives a structured markdown final report with citations, source references, and optional images

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S05 — FinalReport with MarkdownRenderer, TOC sidebar, source references

### RES-04 — User can configure report style and length

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S05 — ReportConfig with style (4 options) and length (3 options) selectors

### RES-05 — User can abort an in-progress research session and see partial results

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S03 — AbortController cancellation; M001-S05 — useResearch hook abort + partial result preservation

### RES-06 — User receives clear error feedback when any research step fails

- Class: failure-visibility
- Status: validated
- Source: inferred
- Validation: M001-S05 — SSE error events + sonner toasts for all failure modes

### AI-01 — User can configure Google Gemini provider with API key and select thinking/networking models

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S02 — ProviderConfig supports Google with apiKey + models; M001-S06 — AIModelsTab Google provider card

### AI-02 — User can configure OpenAI-compatible providers with API key, base URL, and model selection

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S02 — createOpenAICompatibleProvider handles 5 providers; M001-S06 — AIModelsTab 5 provider cards

### AI-03 — User can assign separate thinking and networking models per provider

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S02 — ModelRole type + getModelsByRole() helper, 21 type tests pass

### AI-04 — User can customize which model is used at each step of the research workflow

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S02 — ResearchStep + StepModelMap types for per-step model assignment

### AI-05 — System uses AI SDK structured output instead of raw JSON parsing

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S02 — generateStructured wrapping generateObject with Zod schema; M001-S03 — orchestrator usage

### AI-06 — System properly cleans up AI streams on abort/unmount

- Class: quality-attribute
- Status: validated
- Source: inferred
- Validation: M001-S02 — streamWithAbort with AbortController lifecycle; M001-S05 — useResearch AbortController cleanup

### SRC-01 through SRC-08 — Search provider integrations (Tavily, Firecrawl, Exa, Brave, SearXNG, model-native, domain filter, citation images)

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S04 — All providers implemented and tested

### KB-01 through KB-06 — Knowledge base (PDF, Office, text, URL crawling, local-only, chunking)

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S07 — All features implemented and tested

### SET-01 through SET-05 — Settings management (tabbed dialog, Zod validation, prompt overrides, persistence, sub-components)

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S06 — All features implemented and tested

### HIST-01 through HIST-04 — Research history (list, view, delete, quota management)

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S06 — All features implemented and tested

### SEC-01 through SEC-04 — CORS proxy mode and middleware

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S08 — All features implemented and tested

### PWA-01 through PWA-02 — PWA support

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S09 — All features implemented

### I18N-01 through I18N-03 — Internationalization

- Class: core-capability
- Status: validated
- Source: inferred
- Validation: M001-S09 — All features implemented

## Deferred

### KB-06-partial — AI rewriting of non-plain-text content for knowledge base

- Class: enhancement
- Status: deferred
- Source: M001-S07 decision D002
- Notes: Chunking implemented; AI rewriting deferred — basic text extraction sufficient for most documents. Revisit when user feedback indicates content quality issues.

### Word (.docx) export

- Class: enhancement
- Status: deferred
- Source: M003 discussion
- Notes: User selected MD + PDF only for M003. Can add docx export in a future milestone if needed.

## Out of Scope

### Inline report text editing

- Class: anti-feature
- Status: out-of-scope
- Source: M003 discussion
- Notes: Report workspace uses feedback + regeneration model instead. User writes comments, AI regenerates entire report. Simpler and more predictable than freeform editing.

### Multi-user collaboration

- Class: anti-feature
- Status: out-of-scope
- Source: M001
- Notes: Single-user tool, no backend auth system needed.

### Real-time chat

- Class: anti-feature
- Status: out-of-scope
- Source: M001
- Notes: Not core to research workflow.

### Mobile native app

- Class: anti-feature
- Status: out-of-scope
- Source: M001
- Notes: Web-first, PWA is sufficient.

### MCP server integration

- Class: anti-feature
- Status: out-of-scope
- Source: M001
- Notes: Focus on web app only; programmatic access via API is not needed for v1.0.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R050 | core-capability | active | M003/S01 | none | unmapped |
| R051 | continuity | active | M003/S01 | M003/S02 | unmapped |
| R052 | primary-user-loop | active | M003/S03 | none | unmapped |
| R053 | primary-user-loop | active | M003/S03 | none | unmapped |
| R054 | core-capability | active | M003/S03 | none | unmapped |
| R055 | core-capability | active | M003/S02 | none | unmapped |
| R056 | core-capability | active | M003/S02 | none | unmapped |
| R057 | primary-user-loop | active | M003/S04 | none | unmapped |
| R058 | core-capability | active | M003/S05 | none | unmapped |
| R059 | core-capability | active | M003/S05 | none | unmapped |
| R060 | core-capability | active | M003/S05 | M003/S03 | unmapped |
| R061 | integration | active | M003/S05 | M003/S03 | unmapped |
| R062 | core-capability | active | M003/S02 | none | unmapped |

## Coverage Summary

- Active requirements: 13
- Mapped to slices: 13
- Validated: 45
- Unmapped active requirements: 0
