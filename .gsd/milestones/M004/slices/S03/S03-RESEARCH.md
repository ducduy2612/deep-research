# S03 Research: UI cleanup + start() removal

**Depth:** Light — scope is small and well-understood.
**Risk:** Low. Most work already done by S01.

## Summary

S03's scope ("No start() anywhere in the codebase, all entry points use clarify(), dead code removed") is **almost entirely already complete**. S01/T03 removed `start()` from the hook, and S01/T04 removed it from the orchestrator and updated all tests. The remaining work is **one line of dead code** plus **cosmetic cleanup**.

## What's Already Done (by S01 + S02)

- `start()` method removed from `ResearchOrchestrator` and `useResearch` hook
- `start()` removed from `UseResearchReturn` interface
- All callers updated: `page.tsx` wires `clarify` to `TopicInput.onStart`
- `fullSchema`, `handleFullPhase`, `Phase 'full'` removed from route.ts
- `runPlan()`, `runReviewLoop()` removed from orchestrator
- `requestMoreResearch()` sends `phase: "review"` with learnings/sources/images
- Auto-review trigger, round tracking, and visible state all working (S02)
- All 823 tests passing, clean build

## What Remains

### 1. Dead code: `d.phase === "full"` check (1 line)
**File:** `src/stores/research-store-events.ts`, line 127
```typescript
// Current (dead condition):
if (!d.phase || d.phase === "full" || d.phase === "clarify") {

// Should be:
if (!d.phase || d.phase === "clarify") {
```
The full phase no longer exists in the route, so this condition is unreachable dead code.

### 2. Stale test name referencing `start()`
**File:** `src/engine/research/__tests__/orchestrator.test.ts`, line 786
```typescript
// Current:
it("produces same final state as start() when chained manually", async () => {

// Should be:
it("chaining all phases produces complete result", async () => {
```

### 3. Stale test comment referencing `start()`
**File:** `src/engine/research/__tests__/orchestrator.test.ts`, line 195
```typescript
// Current:
// Abort (using clarifyOnly since start() is removed)

// Could simplify to:
// Abort
```
This one is informational — explains why tests use clarifyOnly. Low priority.

### 4. Optional: Rename `StartOptions` → `ClarifyOptions` (cosmetic)
**Files:** `src/hooks/use-research.ts`, `src/components/research/TopicInput.tsx`, `src/app/page.tsx`
The `StartOptions` type is still exported and used as the parameter type for `clarify()`. Renaming to `ClarifyOptions` would be more accurate, but it's purely cosmetic — `StartOptions` still makes semantic sense as "options for starting a research session."

### 5. Optional: Rename `onStart`/`handleStart` in TopicInput (cosmetic)
**File:** `src/components/research/TopicInput.tsx`
The prop `onStart` and internal `handleStart` are fine — they mean "start research," not the old `start()` method. Renaming is optional.

## What's NOT in Scope (despite being nice-to-have)

- **`/* eslint-disable max-lines */` on orchestrator.ts (951 lines) and route.ts (736 lines)** — These exceed the 500-line ESLint limit. Splitting them into smaller modules would be a significant refactoring beyond "cleanup." Both files are well-organized with clear function boundaries.
- **Further file splitting** — The orchestrator has clear method boundaries. Breaking it into separate phase handlers would be a structural change, not cleanup.

## Recommendation

**1 task, ~30 minutes.** Remove the dead `d.phase === "full"` check, update the stale test name, and optionally rename `StartOptions` → `ClarifyOptions`. Run full test suite to verify nothing breaks.

## Verification

```bash
# Dead code gone
grep -rn '"full"' src/ --include='*.ts' --include='*.tsx' | grep -v '__tests__'
# Should return 0 results (or only comments in types.ts)

# No start() references in production code
grep -rn 'start()' src/ --include='*.ts' --include='*.tsx' | grep -v '__tests__' | grep -v 'ReadableStream'
# Should return 0 results

# Tests + build
pnpm test --run
pnpm build
```

## Implementation Landscape

| File | Change | Size |
|------|--------|------|
| `src/stores/research-store-events.ts` | Remove `d.phase === "full"` dead condition | 1 line |
| `src/engine/research/__tests__/orchestrator.test.ts` | Update stale test name + comment | 2 lines |
| `src/hooks/use-research.ts` | Optional: rename `StartOptions` → `ClarifyOptions` | 3 lines |
| `src/components/research/TopicInput.tsx` | Optional: update import if renamed | 1 line |
| `src/app/page.tsx` | Optional: update import if renamed | 1 line |
