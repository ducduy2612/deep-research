# Plan: Eliminate Vercel Timeout Dependency

## Problem

The SSE research stream runs as a single serverless function invocation per phase. The `research` phase loops N search-analyze cycles (~80s each) with a 780s time budget designed for Vercel Pro's 800s max. On Hobby (300s max), the function gets hard-killed — no graceful exit, no `remainingQueries`, lost partial work.

The `full` pipeline is worse: clarify → plan → research → report all in one SSE connection. Unrecoverable on any plan.

The review loop (`autoReviewRounds`) runs inside the same SSE connection as research, with no cycle limit or budget check. A review round generates follow-up queries and runs full search+analyze on each — easily adding 70-200s per round.

The manual "More Research" button has a duplication problem — it generates new SERP queries from the plan without seeing existing learnings, so it re-searches things already found.

## Approach

**Three changes, one goal: every SSE connection finishes well within 300s.**

### 1. Remove `full` pipeline
Force multi-phase flow: clarify → plan → research → review → report. Each phase is its own SSE connection.

### 2. Chunk research into 2-cycle batches
Each `phase: "research"` SSE connection runs at most 2 search-analyze cycles (~160s), then returns `remainingQueries`. Client auto-reconnects with a new SSE connection for the next batch. The existing `pendingRemainingQueries` mechanism already handles this.

### 3. Unified review phase — both auto and manual
**"More Research" and "auto-review" become the same thing** — `phase: "review"`. Both:
- Send existing learnings to the AI (no blind duplication)
- AI generates **1 follow-up query** (capped)
- If user provided suggestion/manual queries → included as direction for the AI
- Search + analyze that 1 query (~70s)
- New learnings merge on top (same merge mechanism as auto-reconnect)

The only difference is **who triggers it**:
- **Auto-review**: triggers automatically after research completes, driven by `autoReviewRounds` setting
- **Manual "More Research"**: user clicks the button, optionally provides suggestion text or manual queries as direction

Both are 1 SSE connection each. `autoReviewRounds: 4` = 4 auto-triggered SSE connections after research finishes.

## Numbers

| Parameter | Value | Purpose |
|---|---|---|
| `maxCyclesPerInvocation` | 2 | Primary cutoff: stop after 2 search-analyze cycles |
| `timeBudgetMs` | 180s (180_000) | Safety net: bail if approaching limit |
| `maxDuration` | 300 | Vercel route config — Hobby max, safe for all plans |
| 80s | Per-cycle cost estimate | Budget check: "do I have 80s left to start another cycle?" |
| ~160s | Typical research SSE duration | 2 cycles × ~80s |
| ~70s | Typical review SSE duration | 1 follow-up query × search+analyze |
| 1 | Follow-up queries per review | Capped for both auto and manual review |
| 300s | Vercel Hobby hard kill | The wall we must never hit |

**Budget math (normal case):**
| Point | Elapsed | Remaining | Decision |
|---|---|---|---|
| Before cycle 1 | 0s | 180s | 180 > 80 → go |
| Cycle 1 runs | 0→80s | — | takes 80s |
| Before cycle 2 | 80s | 100s | 100 > 80 → go |
| Cycle 2 runs | 80→160s | — | takes 80s |
| After cycle 2 | 160s | — | **cycle counter = 2 → stop** |

Total: ~160s. 140s from the 300s wall.

**Budget math (slow cycles, 150s each):**
| Point | Elapsed | Remaining | Decision |
|---|---|---|---|
| Before cycle 1 | 0s | 180s | 180 > 80 → go |
| Cycle 1 runs | 0→150s | — | takes 150s (slow provider) |
| Before cycle 2 | 150s | 30s | **30 < 80 → bail** |

Budget fires: "only 30s left, one cycle costs 80s, not enough." Graceful exit at ~150s. 150s from the wall.

## Files to Change

### 1. `src/engine/research/types.ts`

- Add `maxCyclesPerInvocation?: number` to `ResearchConfig` (default: 2)
- Change `timeBudgetMs` default comment from 780s to 180s

### 2. `src/engine/research/orchestrator.ts`

**`runSearchPhase()` method (~line 530)**

Current loop:
```
for each query:
  check timeBudgetMs → bail if <80s remaining
  search + analyze
```

Change to:
```
const maxCycles = this.config.maxCyclesPerInvocation ?? 2
let cyclesDone = 0

for each query:
  // Primary limit: cycle count
  if (cyclesDone >= maxCycles) → return remainingQueries = queries.slice(i)
  // Safety net: time budget
  if (remaining < 80_000) → bail
  search + analyze
  cyclesDone++
```

**Remove `runReviewLoop()` call from `researchFromPlan()`** — review is now a separate SSE phase. Delete this block (line ~270):
```ts
if (remainingQueries.length === 0) {
  await this.runReviewLoop(plan, allLearnings, allSources, allImages);
}
```

**Add `reviewOnly()` phase method:**
```ts
async reviewOnly(
  plan: string,
  learnings: string[],
  sources: Source[],
  images: ImageSource[],
  suggestion?: string,
): Promise<ResearchPhaseResult | null>
```

Inside:
1. Generate follow-up queries from plan + learnings + optional suggestion (capped at 1)
2. If 0 queries returned → return null (nothing missing)
3. If 1 query → search + analyze → return new learnings/sources/images

This replaces the current `runReviewLoop`. The loop aspect is handled by the client opening N SSE connections.

**`start()` method** — keep for tests but no longer called from SSE route.

**`timeBudgetMs` default** — change from `780_000` to `180_000`.

### 3. `src/app/api/research/stream/route.ts`

**Remove `full` phase:**
- Delete `fullSchema`
- Delete `handleFullPhase()` function
- Remove from `requestSchema` union
- Remove `case "full"` from switch
- Change `maxDuration` from `800` to `300`

**Add `review` phase handler — `handleReviewPhase()`:**

New request schema:
```ts
const reviewSchema = baseFieldsSchema.extend({
  phase: z.literal("review"),
  plan: z.string().min(1),
  learnings: z.array(z.string()),
  sources: z.array(z.object({ url: z.string(), title: z.string().optional() })),
  images: z.array(z.object({ url: z.string(), description: z.string().nullable().optional() })),
  suggestion: z.string().optional(),
});
```

Handler:
1. Create orchestrator with search provider
2. Call `orchestrator.reviewOnly(plan, learnings, sources, images, suggestion)`
3. Stream events (search-task, search-result, step-delta, etc.)
4. Return `research-result` event with new learnings/sources/images (or empty if AI said "nothing missing")
5. Send `done`

Add to request schema union and switch.

### 4. `src/hooks/use-research.ts`

**Remove `start()` action** — delete the callback, remove from `UseResearchReturn`.

**Rewrite `requestMoreResearch()`** — change from `phase: "research"` (which regenerates SERP queries blindly) to `phase: "review"` (which sees existing learnings):
```ts
const requestMoreResearch = useCallback(async () => {
  const { plan, result, suggestion, manualQueries } = useResearchStore.getState();
  
  // Build suggestion from user input
  const parts: string[] = [];
  if (manualQueries.length > 0) {
    parts.push("Manual search queries:\n" + manualQueries.map(q => `- ${q}`).join("\n"));
  }
  if (suggestion.trim()) {
    parts.push(`Additional direction:\n${suggestion.trim()}`);
  }
  
  useResearchStore.getState().setManualQueries([]);
  useResearchStore.getState().clearSuggestion();
  
  await connectSSE({
    phase: "review",
    plan,
    learnings: result?.learnings ?? [],
    sources: result?.sources.map(s => ({ url: s.url, title: s.title })) ?? [],
    images: result?.images.map(i => ({ url: i.url, description: i.description })) ?? [],
    suggestion: parts.join("\n\n") || undefined,
    ...buildBaseBody(),
  });
}, [connectSSE]);
```

**Add `runAutoReview()` action:**
```ts
const runAutoReview = useCallback(async () => {
  const { plan, result, autoReviewRoundsRemaining } = useResearchStore.getState();
  if (autoReviewRoundsRemaining <= 0) return;
  
  useResearchStore.getState().decrementAutoReviewRounds();
  
  await connectSSE({
    phase: "review",
    plan,
    learnings: result?.learnings ?? [],
    sources: result?.sources.map(s => ({ url: s.url, title: s.title })) ?? [],
    images: result?.images.map(i => ({ url: i.url, description: i.description })) ?? [],
    // No suggestion — AI decides on its own
    ...buildBaseBody(),
  });
}, [connectSSE]);
```

**Add auto-review trigger effect:**
After research phase completes (all batches done, no `pendingRemainingQueries`), check if auto-review rounds remain:
```ts
useEffect(() => {
  const { state, autoReviewRoundsRemaining, pendingRemainingQueries } = useResearchStore.getState();
  if (state === 'awaiting_results_review' 
      && autoReviewRoundsRemaining > 0 
      && pendingRemainingQueries.length === 0) {
    runAutoReview();
  }
}, [/* reactive state */]);
```

**`approvePlanAndResearch()`** — set `autoReviewRoundsRemaining` from settings before connecting:
```ts
const settings = useSettingsStore.getState();
useResearchStore.getState().setAutoReviewRoundsRemaining(settings.autoReviewRounds ?? 0);
```

### 5. `src/stores/research-store.ts`

**Add fields:**
- `autoReviewRoundsRemaining: number` — tracks how many auto-review rounds are left (default: 0)
- Actions: `setAutoReviewRoundsRemaining(n)`, `decrementAutoReviewRounds()`

### 6. `src/stores/research-store-events.ts`

The review phase returns `research-result` events with the same shape. The existing merge logic handles it — no changes needed:
```ts
const mergedLearnings = [...(prevResult?.learnings ?? []), ...d.learnings];
const mergedSources = [...(prevResult?.sources ?? []), ...d.sources];
const mergedImages = [...(prevResult?.images ?? []), ...d.images];
```

**Update activity log message** from "Time budget reached" to "Batch complete — N queries remaining, auto-continuing..."

### 7. `src/engine/research/prompts.ts`

**Update review prompt** to accept optional `suggestion` parameter. When suggestion is provided (manual "More Research"), include it as additional direction. When absent (auto-review), keep current behavior.

### 8. UI components that call `start()`

Search for any component calling `useResearch().start()` and change to `useResearch().clarify()`.

Likely files to check:
- `src/app/page.tsx`
- Any search input / hero component

### 9. Tests

**`src/engine/research/__tests__/orchestrator.test.ts`**
- Keep `orchestrator.start()` tests (method still exists)
- Add: `runSearchPhase` stops after `maxCyclesPerInvocation` cycles
- Add: `runSearchPhase` with `maxCyclesPerInvocation: 1` stops after 1 cycle
- Add: `reviewOnly()` returns null when AI returns 0 follow-up queries
- Add: `reviewOnly()` with suggestion includes it in the prompt
- Add: `reviewOnly()` caps follow-up queries at 1
- Update time-budget tests for new 180s default

**`src/engine/research/__tests__/sse-route.test.ts`**
- Remove `full` phase route tests
- Add: `handleReviewPhase` handler test
- Add: review request validation test
- Add: review with suggestion test

**`src/hooks/__tests__/use-research.test.ts`**
- Remove or convert `start()` tests to `clarify()` tests
- Add: `requestMoreResearch` sends `phase: "review"` (not "research")
- Add: auto-review triggers after research completes with rounds remaining
- Add: auto-review doesn't trigger when rounds = 0

## What Does NOT Change

- `clarify` phase (~30s) — well within any timeout
- `plan` phase (~30s) — well within any timeout
- `report` phase (~60s) — well within any timeout
- The auto-reconnect mechanism (`pendingRemainingQueries`) — already works
- The `immediateRetryQuery` mechanism — already works
- The checkpoint/freeze system — unaffected
- The learnings/sources/images merge logic in the store — already works
- Docker self-hosting — still works, just also works on Vercel now

## SSE Connection Flow (End to End)

```
User clicks "Start Research"
  │
  ├─ SSE 1: phase=clarify (~30s)
  │   └─ Returns questions
  │
  ├─ User fills answers, clicks "Submit"
  │
  ├─ SSE 2: phase=plan (~30s)
  │   └─ Returns plan
  │
  ├─ User reviews plan, clicks "Approve"
  │
  ├─ SSE 3: phase=research (~160s, 2 cycles)
  │   └─ Returns learnings + remainingQueries
  │
  ├─ Auto-reconnect: SSE 4: phase=research (~160s, 2 cycles)
  │   └─ Returns more learnings + remainingQueries
  │
  ├─ Auto-reconnect: SSE 5: phase=research (remaining cycles)
  │   └─ Returns final learnings, no remainingQueries
  │
  ├─ Auto-review triggers (if autoReviewRounds > 0)
  │
  ├─ SSE 6: phase=review (~70s, 1 follow-up query)
  │   └─ AI sees all learnings, generates 1 gap-filling query
  │   └─ Returns new learning merged into store
  │
  ├─ Auto-review triggers again (if rounds remaining)
  │
  ├─ SSE 7: phase=review (~70s)
  │   └─ AI returns 0 queries → nothing missing → stop early
  │
  ├─ User clicks "More Research" (optional, any time after research completes)
  │
  ├─ SSE N: phase=review (~70s, 1 follow-up query)
  │   └─ AI sees all learnings + user suggestion, generates 1 targeted query
  │   └─ Returns new learning merged into store
  │
  ├─ User clicks "Finalize Findings"
  │
  ├─ SSE final: phase=report (~60s)
  │   └─ Returns final report with all accumulated learnings
  │
  └─ Done
```

Every connection is well under 300s. No connection depends on a previous one staying alive.

## Verification

1. Deploy to Vercel Hobby with `maxCyclesPerInvocation: 2`, `timeBudgetMs: 180000`, `maxDuration: 300`
2. Start research with 6 queries → expect 3 SSE connections (2+2+2)
3. Set `autoReviewRounds: 2` → expect 2 additional review SSE connections after research completes
4. Verify learnings/sources accumulate across all connections
5. Verify final report includes all accumulated data (research + review)
6. Verify no timeout errors in Vercel function logs
7. Verify manual "More Research" sends `phase: "review"` and AI sees existing learnings
8. Verify auto-review stops early when AI returns 0 follow-up queries
9. Verify manual "More Research" with suggestion text influences the AI's follow-up query

## Migration Notes

1. **`useResearch().start()` → `useResearch().clarify()`** — full pipeline removed
2. **`requestMoreResearch`** — now sends `phase: "review"` instead of `phase: "research"`. Same button, smarter behavior (sees existing learnings, no duplication).
3. **`autoReviewRounds`** — still a setting, but each round is now 1 SSE connection instead of running inside the research phase.
