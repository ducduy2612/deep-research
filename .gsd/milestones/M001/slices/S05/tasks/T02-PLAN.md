---
estimated_steps: 1
estimated_files: 6
skills_used: []
---

# T02: Create Zustand stores for research, settings, and UI state

Build three Zustand stores: useResearchStore (active session state: topic, orchestrator state, streaming text per step, search tasks, final result, error, elapsed time, activity log), useSettingsStore (provider configs, search provider config, report preferences, domain filters — persisted via localforage), and useUIStore (active view: hub/active/report, settings dialog state). Export store types and actions.

## Inputs

- `src/engine/research/types.ts`
- `src/engine/provider/types.ts`
- `src/engine/search/types.ts`
- `src/lib/storage.ts`

## Expected Output

- `src/stores/research-store.ts`
- `src/stores/settings-store.ts`
- `src/stores/ui-store.ts`
- `src/stores/index.ts`
- `src/stores/__tests__/research-store.test.ts`
- `src/stores/__tests__/settings-store.test.ts`

## Verification

pnpm vitest run src/stores/ && pnpm build
