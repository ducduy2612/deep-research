---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T02: Knowledge store with localforage persistence and Fuse.js search

**Slice:** S07 — Knowledge Base
**Milestone:** M001

## Description

Create the knowledge Zustand store following the established pattern from history-store.ts and settings-store.ts. The store persists to localforage with Zod validation, supports FIFO quota management (200 items), Fuse.js fuzzy search over titles and content, and provides CRUD operations. Also add barrel export to stores/index.ts and hydration to providers.tsx.

## Steps

1. **Create knowledge store** (`src/stores/knowledge-store.ts`):
   - Follow history-store.ts pattern exactly: Zustand create with localforage persistence, Zod schema for validation, fire-and-forget persistence helper, FIFO quota.
   - State: `{ items: KnowledgeItem[], loaded: boolean }`
   - Actions: `hydrate()`, `add(item: KnowledgeItem)`, `remove(id: string)`, `update(id: string, partial: Partial<KnowledgeItem>)`, `get(id: string)`, `clearAll()`, `search(query: string)` (returns filtered items via Fuse.js)
   - FIFO quota: 200 items max. When adding beyond quota, remove oldest items with console.warn.
   - Persistence: fire-and-forget via `storage.set()`, same as settings-store.ts.
   - Fuse.js: Create a Fuse instance with keys `["title", "content"]` and threshold 0.3. Rebuild index on every state change (items array). The `search()` action runs Fuse.search(query) and returns matching items.
   - Zod schema: validate full KnowledgeItem array on hydrate, validate on persist.
   - Selectors: `selectItemCount`, `selectItemsByType(type)`.

2. **Add barrel export** to `src/stores/index.ts`:
   - Export `useKnowledgeStore`, `selectItemCount`, `selectItemsByType` and their types.
   - Follow the exact pattern of the existing exports (value exports, then type exports).

3. **Add hydration to providers.tsx**:
   - Import `useKnowledgeStore` and call its `hydrate()` in the existing useEffect alongside settings and history hydration.
   - Add console.error catch for knowledge hydration failure, same pattern as history.

4. **Write tests** (`src/stores/__tests__/knowledge-store.test.ts`):
   - Follow the history-store test pattern: mock `@/lib/storage`, test initial state, hydrate (valid data, corrupted data fallback, empty), add/remove/update, FIFO quota at 200, search with Fuse.js, clearAll, selectors.
   - Test Fuse.js search: add items with different titles/content, verify search returns correct matches, verify empty query returns all items, verify no results for gibberish query.
   - ~20-25 tests total.

5. **Self-check**: Verify store file is under 300 lines, test file is under 300 lines (ESLint max-lines rule).

## Must-Haves

- [ ] Knowledge store with Zustand + localforage + Zod validation (fire-and-forget persistence)
- [ ] FIFO quota at 200 items with console.warn on eviction
- [ ] Fuse.js fuzzy search over title and content fields
- [ ] CRUD operations: add, remove, update, get, clearAll, search
- [ ] Barrel export in stores/index.ts
- [ ] Hydration in providers.tsx
- [ ] Store file under 300 lines
- [ ] All tests pass

## Verification

- `pnpm vitest run src/stores/__tests__/knowledge-store.test.ts` — All knowledge store tests pass
- `pnpm build` — Clean build (confirms store integrates properly)
- `wc -l src/stores/knowledge-store.ts` — Under 300 lines

## Inputs

- `src/engine/knowledge/types.ts` — KnowledgeItem type and Zod schema from T01
- `src/stores/history-store.ts` — Reference pattern for Zustand + localforage + Zod store
- `src/stores/settings-store.ts` — Reference pattern for fire-and-forget persistence
- `src/lib/storage.ts` — Storage abstraction (get/set/remove)
- `src/stores/index.ts` — Barrel export file to extend
- `src/app/providers.tsx` — Provider component to add hydration call

## Expected Output

- `src/stores/knowledge-store.ts` — Knowledge store with localforage persistence, Fuse.js search, FIFO quota
- `src/stores/__tests__/knowledge-store.test.ts` — ~20-25 tests covering store lifecycle
- `src/stores/index.ts` — Updated barrel with knowledge store exports
- `src/app/providers.tsx` — Updated with knowledge store hydration
