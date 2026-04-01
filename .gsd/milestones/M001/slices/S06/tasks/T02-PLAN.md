---
estimated_steps: 68
estimated_files: 7
skills_used: []
---

# T02: Extend Settings Store and Build Settings Dialog with 4 Tabs

Extend useSettingsStore with promptOverrides, autoReviewRounds, maxSearchQueries fields. Build 4-tab SettingsDialog with sub-components for each tab.

## Steps

1. Extend `src/stores/settings-store.ts`:
   - Add to state: `promptOverrides: Record<string, string>` (default: `{}`), `autoReviewRounds: number` (default: 0), `maxSearchQueries: number` (default: 8)
   - Add actions: `setPromptOverrides(overrides)`, `setAutoReviewRounds(rounds)`, `setMaxSearchQueries(max)`
   - Update `settingsSchema` Zod schema to include: `promptOverrides: z.record(z.string(), z.string())`, `autoReviewRounds: z.number().int().min(0).max(5)`, `maxSearchQueries: z.number().int().min(1).max(30)`
   - Update `DEFAULT_STATE` with new fields
   - Update `persistSettings()` to include new fields in `toSave` object
   - Update `reset()` to include new fields in default reset

2. Update `src/stores/__tests__/settings-store.test.ts`:
   - Add tests for: default values of new fields, setPromptOverrides, setAutoReviewRounds, setMaxSearchQueries
   - Add test: new fields persist via storage.set
   - Add test: hydrate loads new fields from storage

3. Create `src/components/settings/SettingsDialog.tsx`:
   - Tabbed dialog using shadcn Tabs component
   - 4 tabs: AI Models, Search, General, Advanced
   - Controlled by `useUIStore.activeDialog === "settings"`
   - Glassmorphism dialog: `backdrop-blur-xl bg-[rgba(32,31,34,0.6)]`
   - Each tab rendered as a separate sub-component (imported)
   - Container under 300 lines

4. Create `src/components/settings/AIModelsTab.tsx`:
   - Provider cards for: google, openai, deepseek, openrouter, groq, xai
   - Each card: provider name, API key input (masked `sk-••••••••`), optional base URL input, enable toggle
   - Reads/writes via `useSettingsStore.setProvider()` / `removeProvider()`
   - Show enabled model count per provider (informational badge)
   - Under 300 lines

5. Create `src/components/settings/SearchTab.tsx`:
   - Search provider selector (radio buttons or select): tavily, firecrawl, exa, brave, searxng, model-native
   - API key input for selected provider
   - Base URL input (shown for searxng and other configurable providers)
   - Scope input, max results number input
   - Domain filters section: include textarea (one domain per line), exclude textarea
   - Citation images toggle
   - Reads/writes via settings store actions
   - Under 300 lines

6. Create `src/components/settings/GeneralTab.tsx`:
   - Language text input
   - Report style selector: balanced / executive / technical / concise (button list, same pattern as ReportConfig)
   - Report length selector: brief / standard / comprehensive (button list)
   - Auto-review rounds slider (0-5) with label showing current value
   - Max search queries slider (1-30) with label showing current value
   - Reads/writes via settings store actions
   - Under 300 lines

7. Create `src/components/settings/AdvancedTab.tsx`:
   - Prompt overrides section with 8 labeled textareas:
     - System, Clarify, Plan, SERP Queries, Analyze, Review, Report, Output Guidelines
   - Each textarea shows the prompt key as label, value from `promptOverrides[key]`
   - Empty textarea = use default (no override)
   - Save prompt overrides to settings store on blur (not on every keystroke)
   - Reset all settings button at bottom (calls `settingsStore.reset()`)
   - Under 300 lines

## Must-Haves
- [ ] useSettingsStore extended with promptOverrides, autoReviewRounds, maxSearchQueries
- [ ] SettingsDialog with 4 tabs rendering sub-components
- [ ] AIModelsTab with 6 provider cards
- [ ] SearchTab with provider selector, domain filters, citation toggle
- [ ] GeneralTab with report config and sliders
- [ ] AdvancedTab with 8 prompt override textareas
- [ ] All settings store tests updated and passing
- [ ] All components under 300 lines

## Verification
- `pnpm vitest run src/stores/__tests__/settings-store.test.ts` — all settings tests pass including new fields
- `pnpm build` — no type errors
- All settings components under 300 lines: `wc -l src/components/settings/*.tsx`

## Negative Tests

- **Malformed inputs**: Empty API key string → still saves but won't be used (selectEnabledProviders filters)
- **Error paths**: Storage write failure → silently ignored
- **Boundary conditions**: autoReviewRounds 0-5 enforced by Zod, maxSearchQueries 1-30 enforced by Zod

## Inputs

- `src/stores/settings-store.ts`
- `src/stores/__tests__/settings-store.test.ts`
- `src/stores/ui-store.ts`
- `src/engine/research/types.ts`
- `src/engine/research/prompts.ts`
- `src/components/research/ReportConfig.tsx`

## Expected Output

- `src/stores/settings-store.ts`
- `src/stores/__tests__/settings-store.test.ts`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/settings/AIModelsTab.tsx`
- `src/components/settings/SearchTab.tsx`
- `src/components/settings/GeneralTab.tsx`
- `src/components/settings/AdvancedTab.tsx`

## Verification

pnpm vitest run src/stores/__tests__/settings-store.test.ts && pnpm build && wc -l src/components/settings/*.tsx
