# M003: 

## Vision
Transform the multi-phase research flow into a checkpointed workspace model. Completed phases become immutable frozen checkpoints (accordion-collapsed, read-only, with visual badges). The active phase is an editable, persistent workspace where users can steer research, refine reports, and export results. All workspace state survives browser refresh.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Store Refactor — Checkpoints + Workspace Separation | high | — | ✅ | Store has checkpoints{} + workspace{} separation. Workspace edits (questions, feedback, suggestion, manual queries) survive refresh. Frozen data is immutable — freeze() action prevents mutation. All 617+ existing tests pass. |
| S02 | Phase Freeze UX — Accordion Layout | medium | S01 | ✅ | Accordion with collapsed frozen phases (badge: '3 questions answered') and expanded active workspace. Click frozen phase to expand read-only. Manual freeze buttons for clarify (Submit) and plan (Approve). Frozen badge with checkmark icon. Active phase has primary-color glow. |
| S03 | Research Workspace — Per-Task CRUD + Review Loop | high | S01, S02 | ✅ | Each search result is a card with delete (X) and retry (↻) buttons. Delete removes query+learning+sources. Retry re-searches that single query. Manual query input queues for next batch. Suggestion textarea appears before 'More Research'. One review round per click. 'Finalize Findings' freezes research. |
| S04 | Report Workspace — Feedback + Regeneration | medium | S01, S02 | ✅ | Report phase shows streamed report with feedback textarea. User writes comments on current report. 'Regenerate' sends frozen checkpoints (plan + learnings + sources) + user feedback to AI. AI regenerates entire report. Multiple regeneration rounds. 'Done' freezes report. |
| S05 | Export + Knowledge Base Integration | low | S03, S04 | ⬜ | Download report as .md file. Download report as PDF with proper formatting. Export search results as MD or JSON. Add search result content to knowledge base from card. |
| S06 | Integration + Browser Verification | low | S05 | ⬜ | Full clarify→plan→research→report flow works in browser. Refresh at each phase preserves state. Abort at each phase. Export produces correct files. All tests pass. |
