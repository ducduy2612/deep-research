# S01 Research: Store Refactor — Checkpoints + Workspace Separation

## Summary

Restructure the research store to add an immutable `checkpoints` object alongside the existing flat mutable fields (which become the implicit "workspace"). Add a `freeze(phase)` action that copies workspace data into frozen checkpoints. The SSE event handler, component selectors, and 638 tests continue to work with minimal changes. Only new surface: `checkpoints` state, `freeze()` action, `manualQueries` field, and updated persistence schema.

## Requirements Owned

- **R050** — Checkpoint + workspace store separation
- **R051** — Workspace persistence across refresh

## Recommendation

**Keep existing flat fields (`questions`, `feedback`, `plan`, `suggestion`) as the implicit workspace. Add `checkpoints` as a new nested object.** This minimizes breakage across 15+ consumer files and 92 store tests while achieving the architectural goal. The flat fields ARE the workspace — they're mutable and freely editable. The checkpoints are the frozen record, populated by `freeze()` at phase transitions.

## Implementation Landscape

### Current Store Shape (src/stores/research-store.ts, 603 lines)

```
ResearchStoreState {
  topic: string
  state: ResearchState          // 13-state state machine
  steps: Record<ResearchStep, StepStreamState>  // 6 step slots
  searchTasks: SearchTask[]
  searchResults: SearchResult[]
  result: ResearchResult | null
  error: { code, message } | null
  startedAt / completedAt: number | null
  activityLog: ActivityEntry[]
  // "workspace" fields (flat, mutable):
  questions: string
  feedback: string
  plan: string
  suggestion: string
  connectionInterrupted: boolean
}
```

### Target Store Shape (additive changes only)

```
ResearchStoreState {
  // ... all existing fields unchanged ...
  
  // NEW: frozen checkpoints (immutable after freeze)
  checkpoints: {
    clarify: { questions: string, feedback: string } | null
    plan: { plan: string } | null
    research: { learnings: string[], sources: Source[], images: ImageSource[] } | null
    report: { title: string, report: string, learnings: string[], sources: Source[], images: ImageSource[] } | null
  }
  
  // NEW: workspace field for S03 research workspace
  manualQueries: string[]
}
```

### Why Keep Flat Fields (not nest into workspace: {})

1. **15+ consumer files** access `s.questions`, `s.feedback`, `s.plan`, `s.suggestion` directly — all would break
2. **92 store tests** assert on these flat fields — all would break
3. **use-research.ts** (604 lines) reads `topic`, `questions`, `feedback`, `plan`, `suggestion` from `getState()` — would need updating
4. **HistoryDialog** does `useResearchStore.setState({ topic, state, result, ... })` directly — flat field names are baked in
5. The flat fields ARE the workspace conceptually. Nesting adds indirection with no functional benefit.

### Files That Need Changes

| File | Change | Risk |
|------|--------|------|
| `src/stores/research-store.ts` | Add checkpoints state, freeze() action, manualQueries field, update persist/hydrate | **High** — core restructure |
| `src/stores/__tests__/research-store*.test.ts` (4 files, 92 tests) | Add checkpoint/freeze tests, verify existing tests pass unchanged | Medium — additive only |
| `src/hooks/__tests__/use-research*.test.ts` (2 files, 22 tests) | Should pass unchanged — hook reads flat fields which aren't changing | Low |
| `src/stores/index.ts` | Export new types (CheckpointData, etc.) | Low |
| `src/engine/research/types.ts` | Add checkpoint-related type definitions | Low |

### Files That DON'T Need Changes (verified by search)

These consumers access only flat fields or selectors that remain unchanged:
- `src/components/research/ClarifyPanel.tsx` — reads `s.questions`, `s.feedback`, `s.setQuestions`, `s.setFeedback`
- `src/components/research/PlanPanel.tsx` — reads `s.plan`, `s.steps.plan.text`, `s.setPlan`
- `src/components/research/ResearchActions.tsx` — reads `s.suggestion`, `s.setSuggestion`, `s.result`
- `src/components/research/ActiveResearchCenter.tsx` — reads `s.steps`, `s.state`, `s.searchResults`, `s.error`
- `src/components/research/FinalReport.tsx` — reads `s.result`, `s.startedAt`, `s.completedAt`
- `src/components/research/WorkflowProgress.tsx` — receives state as prop, reads `selectElapsedMs`
- `src/components/Header.tsx` — reads `selectIsActive`, `s.topic`, `s.startedAt`, `s.completedAt`
- `src/components/settings/HistoryDialog.tsx` — writes flat fields via setState
- `src/app/page.tsx` — reads `s.result`, `s.state`
- `src/hooks/use-research.ts` — reads `s.topic`, `s.questions`, `s.feedback`, `s.plan`, `s.suggestion`, `s.result`

S02 will need to update components to read from `checkpoints` for frozen phase display, but that's S02's scope.

## Detailed Design

### Checkpoint Types

```typescript
interface ClarifyCheckpoint {
  questions: string
  feedback: string
}

interface PlanCheckpoint {
  plan: string
}

interface ResearchCheckpoint {
  learnings: string[]
  sources: Source[]
  images: ImageSource[]
}

interface ReportCheckpoint {
  title: string
  report: string
  learnings: string[]
  sources: Source[]
  images: ImageSource[]
}

interface Checkpoints {
  clarify: ClarifyCheckpoint | null
  plan: PlanCheckpoint | null
  research: ResearchCheckpoint | null
  report: ReportCheckpoint | null
}
```

### freeze() Action

```typescript
freeze: (phase: 'clarify' | 'plan' | 'research' | 'report') => void
```

Behavior:
- `freeze('clarify')` → sets `checkpoints.clarify = { questions: state.questions, feedback: state.feedback }`
- `freeze('plan')` → sets `checkpoints.plan = { plan: state.plan }`
- `freeze('research')` → sets `checkpoints.research = { learnings: state.result?.learnings ?? [], sources: state.result?.sources ?? [], images: state.result?.images ?? [] }`
- `freeze('report')` → sets `checkpoints.report = state.result`
- Calling `freeze()` on an already-frozen phase overwrites the checkpoint (idempotent, intentional for regeneration)
- After freeze, workspace fields remain editable — they're the current phase's workspace

### handleEvent() Changes

The SSE handler needs minimal changes — existing events still write to flat fields. The only change: certain events could auto-populate checkpoints (e.g., `clarify-result` could set `checkpoints.clarify` as a "pre-freeze" snapshot). However, based on R056 ("No auto-freezing on stream end"), we should NOT auto-freeze. Checkpoints are populated only when `freeze()` is called explicitly.

**Key insight:** The SSE events don't change at all. The `clarify-result` event still writes to `state.questions` and `state.state`. Checkpoints are only created when the user clicks the freeze/submit button, which triggers `freeze()`.

### reset() Changes

Must also clear `checkpoints` and `manualQueries`:

```typescript
reset: () => {
  set({ ...INITIAL_STATE, steps: emptySteps() });
  // checkpoints and manualQueries reset to initial values via INITIAL_STATE
}
```

### Persistence Schema Changes

The `persistedStateSchema` needs new fields:

```typescript
const checkpointSchema = z.object({
  clarify: z.object({ questions: z.string(), feedback: z.string() }).nullable(),
  plan: z.object({ plan: z.string() }).nullable(),
  research: z.object({
    learnings: z.array(z.string()),
    sources: z.array(sourceSchema),
    images: z.array(imageSourceSchema),
  }).nullable(),
  report: researchResultSchema.nullable(),
});

// Add to persistedStateSchema:
checkpoints: checkpointSchema,
manualQueries: z.array(z.string()),
```

### Hydration Migration

Old persisted state won't have `checkpoints` or `manualQueries`. The hydrate function needs to handle missing fields:

```typescript
const saved = await storage.get(STORAGE_KEY, persistedStateSchema);
if (!saved) return;

// Backward compat: missing checkpoints = all null
const checkpoints = saved.checkpoints ?? { clarify: null, plan: null, research: null, report: null };
const manualQueries = saved.manualQueries ?? [];
```

### Auto-persist Subscription

The existing `subscribe()` callback needs to include `checkpoints` and `manualQueries` in the persisted data object. This is a one-line addition to the persistData object.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Store restructure breaks 638 tests | High | Additive-only changes to state shape. All existing fields stay. Run full suite after each change. |
| Persistence migration — old state missing new fields | Medium | Default to null/[] in hydrate. Old state restores correctly without checkpoints. |
| freeze() semantics unclear — when to call | Low | S02 defines the UX freeze buttons. S01 only provides the action. |
| Checkpoint immutability not enforced at type level | Low | Runtime guard in freeze(): once set, checkpoints.X can be overwritten (for regeneration) but components should read from checkpoints for frozen display. TypeScript readonly helps but Zustand set() bypasses it. |

## Verification

1. `pnpm vitest run src/stores/__tests__/research-store` — all 92 existing tests pass unchanged
2. `pnpm vitest run` — all 638 tests pass
3. New tests: freeze() creates checkpoint, freeze() is idempotent, reset() clears checkpoints, persist+hydrate round-trips checkpoints, hydrate handles missing fields
4. `pnpm build` — no TypeScript errors

## Don't Hand-Roll

- Zod schemas for checkpoint types — use existing `sourceSchema`, `imageSourceSchema`, `researchResultSchema`
- State machine transitions — keep existing 13-state model unchanged

## Sources

- Decision D010: "Immutable checkpoints{} + mutable workspace{} in single Zustand store"
- Knowledge: S06 persistence patterns (fire-and-forget, Zod-validated hydration)
- Knowledge: S05 research store handleEvent() dispatcher pattern
