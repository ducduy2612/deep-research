---
estimated_steps: 46
estimated_files: 5
skills_used: []
---

# T03: Wire Integration — Auto-Save, Hook Extension, Page Mount

Wire history auto-save into useResearch hook, send new settings fields to SSE route, mount both dialogs in page.tsx, and verify everything works together.

## Steps

1. Update `src/hooks/use-research.ts`:
   - Import `useHistoryStore` from history store
   - Import settings selectors for `promptOverrides`, `autoReviewRounds`, `maxSearchQueries`
   - Read these 3 new fields from `useSettingsStore` in the hook body
   - Add them to the request body in `connectSSE()`: `{ ...existingBody, promptOverrides, autoReviewRounds, maxSearchQueries }`
   - In the SSE event handler (inside `createSSEBuffer` callback), when `eventType === "done"` and the research completed (not failed), auto-save the session to history:
     - Get current result from `useResearchStore.getState().result`
     - Get topic, startedAt, state, reportStyle, reportLength from research store
     - Call `useHistoryStore.getState().save({ id, topic, title: result?.title ?? topic, ... })`
   - Only auto-save if `result` exists (not all failed runs produce a result)

2. Update `src/app/page.tsx`:
   - Import `SettingsDialog` and `HistoryDialog`
   - Import `useUIStore` selector for `activeDialog`
   - Render both dialogs after the main content area, controlled by `activeDialog`
   - Each dialog handles its own open/close via `useUIStore`

3. Update `src/stores/index.ts`:
   - Add barrel exports for history store (if not done in T01)

4. Update `src/app/providers.tsx`:
   - Also hydrate the history store on startup (call `useHistoryStore.getState().hydrate()`)

5. Update existing tests:
   - `src/hooks/__tests__/use-research.test.ts` — verify prompt overrides, autoReviewRounds, maxSearchQueries are included in request body
   - `src/stores/__tests__/research-store.test.ts` — verify handleEvent("done") works correctly

6. Run full test suite and production build:
   - `pnpm vitest run` — all tests pass
   - `pnpm build` — no type errors

## Must-Haves
- [ ] useResearch sends promptOverrides, autoReviewRounds, maxSearchQueries in SSE request body
- [ ] Completed research sessions auto-saved to history store on "done" event
- [ ] SettingsDialog and HistoryDialog mounted in page.tsx
- [ ] History store hydrated on app startup
- [ ] All tests pass, clean production build

## Verification
- `pnpm vitest run` — all tests pass (345+ existing + new)
- `pnpm build` — clean production build
- Verify dialog opens: Settings button in Header → dialog appears; History button → dialog appears

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| History store (auto-save) | Catch and log, does not block research flow | N/A | N/A |
| Settings store (read) | Returns defaults if not hydrated | N/A | N/A |

## Negative Tests

- **Malformed inputs**: No result on done event → skip auto-save gracefully
- **Error paths**: History save fails → logged to console, research flow continues
- **Boundary conditions**: Abort before completion → no auto-save triggered

## Inputs

- `src/hooks/use-research.ts`
- `src/app/page.tsx`
- `src/stores/index.ts`
- `src/app/providers.tsx`
- `src/hooks/__tests__/use-research.test.ts`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/settings/HistoryDialog.tsx`
- `src/stores/history-store.ts`

## Expected Output

- `src/hooks/use-research.ts`
- `src/app/page.tsx`
- `src/stores/index.ts`
- `src/app/providers.tsx`
- `src/hooks/__tests__/use-research.test.ts`

## Verification

pnpm vitest run && pnpm build
