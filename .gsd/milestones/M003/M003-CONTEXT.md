# M003: Frozen Checkpoints + Active Workspace

**Gathered:** 2026-04-03
**Status:** Ready for planning

## Project Description

Transform the multi-phase research flow from a streaming pipeline into a checkpointed workspace model. Each phase (clarify → plan → research → report) becomes a distinct stage where completed phases are frozen (immutable, read-only) and the active phase is an editable workspace. All workspace state persists across refresh.

## Why This Milestone

The current M002 multi-phase flow lets users interact at phase boundaries (submit feedback, approve plan, request more research), but it lacks:
- **Workspace persistence** — edits are lost on refresh
- **Phase immutability** — no visual or structural distinction between completed and active phases
- **Research workspace control** — users can't delete bad results, retry failed queries, add manual queries, or steer the research direction with precision
- **Report refinement** — users can't give feedback to regenerate the report
- **Export** — reports can't be downloaded

The frozen checkpoint model from the user's spec doc defines the architecture: frozen data is never mutated, workspace data is freely editable, phase transition = workspace → checkpoint (freeze) → new workspace opens.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See an accordion layout with collapsed frozen phases (showing summary badges) and an expanded active workspace
- Edit content in the active phase (questions, plan text, suggestion) and have edits survive browser refresh
- In the research workspace: delete search result cards (removing their data), retry individual queries, add manual queries for the next batch, write suggestions to steer "More Research", and explicitly click "Finalize Findings" to freeze research
- In the report workspace: write comments/requirements on the current report and click "Regenerate" to have AI rewrite it from frozen inputs + new feedback
- Download reports as Markdown (.md) or PDF
- Export search results as MD or JSON
- Add search result content to the knowledge base

### Entry point / environment

- Entry point: http://localhost:3000 — Research Hub
- Environment: Local dev browser (Turbopack dev server)
- Live dependencies: AI provider APIs (Google Gemini, OpenAI-compatible), search provider APIs (Tavily, Brave, etc.)

## Completion Class

- Contract complete means: Store enforces checkpoint immutability, workspace state persists, all CRUD operations work in browser, export produces correct output
- Integration complete means: Full clarify→plan→research→report flow works end-to-end in browser with frozen/active transitions at each phase
- Operational complete means: Refresh at any phase preserves workspace state, abort at any phase works cleanly, export works from any frozen phase

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- User can complete full research flow (clarify→plan→research→report) with frozen checkpoints at each transition, seeing accordion layout throughout
- User can refresh mid-research and resume with workspace edits preserved
- User can delete a search result card, add a manual query, retry a failed query, and finalize findings — all producing correct downstream data
- User can write report feedback, regenerate, and download as MD and PDF
- All 617+ existing tests continue to pass

## Risks and Unknowns

- Store refactor scope — current research-store.ts is 603 lines with complex handleEvent() dispatcher. Restructuring to checkpoints+workspace while preserving all event handling is the highest-risk change.
- SSE event compatibility — new store shape must still consume all existing SSE events. Breaking the event contract would break the entire research flow.
- PDF generation quality — client-side html2pdf.js can produce layout artifacts with complex markdown (tables, code blocks). May need CSS tuning.

## Existing Codebase / Prior Art

- `src/stores/research-store.ts` (603 lines) — Current store with 13-state state machine, handleEvent() dispatcher, auto-persist subscription, Zod-validated hydration. This is the primary file being restructured.
- `src/hooks/use-research.ts` (604 lines) — SSE connector hook with phase-specific actions. Will need updates for new store shape.
- `src/engine/research/orchestrator.ts` (904 lines) — Framework-agnostic state machine. Minimal changes — already emits correct events.
- `src/engine/research/types.ts` — Research state types, event map, result types. Will need checkpoint/workspace type additions.
- `src/components/research/ActiveResearchCenter.tsx` — Center panel with state-routed rendering. Major restructure to accordion layout.
- `src/components/research/ClarifyPanel.tsx` — Already has edit/preview toggle + submit button. Needs freeze semantics.
- `src/components/research/PlanPanel.tsx` — Similar pattern to ClarifyPanel.
- `src/components/research/ResearchActions.tsx` — Suggestion input + More Research/Generate Report buttons. Needs expansion for workspace CRUD.
- `src/components/research/FinalReport.tsx` — Has export button (not wired). Needs PDF/MD export wiring.
- `src/components/research/WorkflowProgress.tsx` — Step indicator with frozen/active/awaiting states. Needs freeze badge updates.
- `src/app/api/research/stream/route.ts` — SSE route with phase handlers. Minor changes for retry/single-query support.
- `src/lib/storage.ts` — localforage abstraction. Already supports Zod-validated get/set.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R050 — Checkpoint + workspace store separation (M003/S01)
- R051 — Workspace persistence across refresh (M003/S01)
- R052 — Research workspace per-task CRUD (M003/S03)
- R053 — Suggestion input + single review round (M003/S03)
- R054 — Explicit "Finalize Findings" (M003/S03)
- R055 — Accordion layout with frozen/active distinction (M003/S02)
- R056 — Manual freeze actions for clarify/plan (M003/S02)
- R057 — Report workspace feedback + regeneration (M003/S04)
- R058 — Markdown export (M003/S05)
- R059 — PDF export (M003/S05)
- R060 — Search result export (M003/S05)
- R061 — Add-to-KB from search results (M003/S05)
- R062 — Frozen phase visual badges (M003/S02)

## Scope

### In Scope

- Store refactor to checkpoints + workspace model
- Workspace persistence (extends existing localforage hydration)
- Accordion layout with frozen/active phase distinction
- Research workspace CRUD (delete, retry, manual queries, suggestion, finalize)
- Report workspace (feedback input + AI regeneration, no inline editing)
- MD and PDF export for reports
- Search result export (MD/JSON)
- Add-to-KB from search results

### Out of Scope / Non-Goals

- Inline report text editing (feedback+regeneration model only)
- Word (.docx) export
- Server-side PDF generation
- Mobile native app changes
- Multi-user collaboration
- AI provider changes

## Technical Constraints

- Must not break existing SSE event contract — orchestrator emits same events
- Must not break existing 617+ tests without updating them
- Component files must stay under 300 lines (ESLint enforced)
- Store auto-persist pattern (fire-and-forget localforage writes) must be preserved
- All new UI strings must go through i18n (useTranslations)
- PDF generation must be client-side only (no server dependency)

## Integration Points

- AI provider APIs — report regeneration sends same SSE phase="report" request with updated feedback
- Search provider APIs — retry sends single-query search request
- Knowledge base store — add-to-KB from search results writes to knowledge-store
- History store — auto-save on report completion continues as before
- Settings store — prompt overrides and provider config consumed as before

## Open Questions

- None — all key decisions resolved during discussion
