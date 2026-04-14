# S03: UI cleanup + start() removal — UAT

**Milestone:** M004
**Written:** 2026-04-14T18:23:49.330Z

# S03 UAT: UI Cleanup + start() Removal

## Preconditions
- Dev server running (`pnpm dev`)
- Application loads at http://localhost:3000

## Test Cases

### TC1: No StartOptions references in production code
1. Run `grep -rn 'StartOptions' src/ --include='*.ts' --include='*.tsx' | grep -v __tests__`
2. **Expected**: No matches found

### TC2: No phase==="full" references anywhere in src/
1. Run `grep -rn 'phase === "full"' src/`
2. **Expected**: No matches found

### TC3: ClarifyOptions used consistently
1. Run `grep -rn 'ClarifyOptions' src/ --include='*.ts' --include='*.tsx'`
2. **Expected**: Matches found in use-research.ts (interface definition + clarify param type), TopicInput.tsx (import + prop type), page.tsx (HubView prop type)

### TC4: All tests pass
1. Run `pnpm test --run`
2. **Expected**: All 823 tests pass, 0 failures

### TC5: Clean build
1. Run `pnpm build`
2. **Expected**: Build completes with no type errors

### TC6: Research topic input still works
1. Navigate to http://localhost:3000
2. Type a research topic in the input field
3. Click submit
4. **Expected**: Research begins with clarify phase, SSE connection opens successfully

### TC7: Dead code removed from research-store-events.ts
1. Open `src/stores/research-store-events.ts`
2. **Expected**: No `phase === "full"` condition exists in any handler

### TC8: Test names updated in orchestrator tests
1. Open `src/engine/research/__tests__/orchestrator.test.ts`
2. **Expected**: No test names or comments reference "start()" or "same final state as start()"
