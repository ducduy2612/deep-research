---
estimated_steps: 45
estimated_files: 4
skills_used: []
---

# T01: Build History Store and History Dialog

Create useHistoryStore with localforage persistence and Zod validation, plus HistoryDialog component with session cards, filter chips, search, stats row, delete, and view-report action.

## Steps

1. Create `src/stores/history-store.ts`:
   - Define `HistorySession` interface: `{ id, topic, title, state, startedAt, completedAt, report, learnings, sources, images, reportStyle, reportLength }`
   - Create `historySessionSchema` using Zod (reuse `sourceSchema`, `imageSourceSchema` from research types)
   - State: `sessions: HistorySession[]`, `loaded: boolean`
   - Actions: `hydrate()`, `save(session)`, `remove(id)`, `load(id)`, `clearAll()`
   - Persist to localforage key `"history"` with Zod validation
   - Quota management: on `save()`, if `sessions.length >= 100`, remove oldest session (FIFO)
   - Follow same fire-and-forget persistence pattern as settings-store.ts
   - Export selectors: `selectSessionCount`, `selectSessionsByFilter`

2. Add barrel export for history store in `src/stores/index.ts`

3. Create `src/stores/__tests__/history-store.test.ts`:
   - Mock `@/lib/storage` same pattern as settings-store.test.ts
   - Test: initial state, hydrate, save session, remove session, clearAll, FIFO quota at 100 sessions, selectors
   - Test: hydrate with corrupted data falls back to empty
   - Test: save persists via storage.set()

4. Create `src/components/settings/HistoryDialog.tsx`:
   - Dialog wrapper using shadcn Dialog component with glassmorphism styling
   - Controlled by `useUIStore.activeDialog === "history"`
   - Stats row at top: total sessions, sessions this week, total sources
   - Filter chips: All / Completed / Failed (controlled by local state)
   - Search input that filters sessions by title/topic
   - Session cards showing: title, date (relative), status badge (completed=green, failed=red, aborted=yellow), source count
   - Each card has: "View Report" button, "Delete" button (with confirmation)
   - View Report action: loads session data into useResearchStore and navigates to report view
   - Empty state when no sessions
   - Use Obsidian Deep tokens: `bg-obsidian-surface-deck`, `text-obsidian-on-surface`, etc.
   - Must stay under 300 lines

## Must-Haves
- [ ] useHistoryStore with Zod-validated localforage persistence and 100-session FIFO quota
- [ ] HistoryDialog with session list, filters, search, delete, and view-report
- [ ] History store tests passing

## Verification
- `pnpm vitest run src/stores/__tests__/history-store.test.ts` — all history store tests pass
- `pnpm build` — no type errors
- HistoryDialog.tsx is under 300 lines: `wc -l src/components/settings/HistoryDialog.tsx`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| localforage (IndexedDB) | Catch and log, keep in-memory state | N/A | Zod validation rejects, falls back to defaults |

## Negative Tests

- **Malformed inputs**: Corrupted storage data → falls back to empty sessions
- **Error paths**: Storage write failure → silently ignored (fire-and-forget)
- **Boundary conditions**: 100 sessions → oldest deleted on next save; empty session list → empty state shown

## Inputs

- `src/lib/storage.ts`
- `src/engine/research/types.ts`
- `src/stores/settings-store.ts`
- `src/stores/ui-store.ts`
- `src/stores/research-store.ts`
- `src/stores/__tests__/settings-store.test.ts`

## Expected Output

- `src/stores/history-store.ts`
- `src/stores/__tests__/history-store.test.ts`
- `src/components/settings/HistoryDialog.tsx`
- `src/stores/index.ts`

## Verification

pnpm vitest run src/stores/__tests__/history-store.test.ts && pnpm build

## Observability Impact

History store persistence errors caught and logged to console. Quota cleanup (FIFO at 100) logged for diagnostics.
