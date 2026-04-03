# S03 Research: Research Workspace — Per-Task CRUD + Review Loop

## Summary

This slice adds interactive CRUD controls to the research workspace phase. Each search result becomes a card with delete (X) and retry (↻) buttons. Users can add manual queries queued for the next "More Research" batch. A suggestion textarea steers research direction. One review round per "More Research" click. "Finalize Findings" freezes research and transitions to report.

The store already has most needed infrastructure from S01 (manualQueries, suggestion, freeze('research')). The main work is UI components (card CRUD, manual query input) and a small SSE route extension for single-query retry.

## Requirements Owned

- **R052** — Research workspace per-task CRUD (delete, retry, manual queries)
- **R053** — Suggestion input + single review round per "More Research"
- **R054** — Explicit "Finalize Findings" to freeze research phase

## Recommendation

Three tasks, ordered by dependency:

1. **Store actions for delete/retry** — Add `removeSearchResult(index)`, `retrySearchResult(index)` actions to research-store.ts. Delete removes the SearchResult at that index AND strips its learning/sources/images from `result`. Retry stores the query for re-execution. ~60 lines of store changes + tests.

2. **SSE route extension for single-query retry** — Add support for `phase: "research"` with `queries: string[]` field alongside existing `plan` field. When `queries` is provided, execute only those queries (not the full plan). Small route change (~20 lines). No orchestrator changes — we re-use `researchFromPlan` with a constructed mini-plan.

3. **UI components** — Build SearchResultCard, ManualQueryInput, and extend ResearchActions with "Finalize Findings" button. Wire retry/delete to store, retry to use-research hook. This is the bulk of the work (~4 new files, ~3 modified files).

## Implementation Landscape

### Store layer (research-store.ts)

**Current state (577 lines):**
- `searchResults: readonly SearchResult[]` — accumulated search+analyze results
- `result: ResearchResult | null` — accumulated learnings/sources/images
- `manualQueries: readonly string[]` + `setManualQueries` (from S01)
- `suggestion: string` + `setSuggestion` (existing)
- `freeze('research')` — snapshots searchResults + result to checkpoints.research (from S01)

**Needed actions:**
- `removeSearchResult(index: number)` — Removes `searchResults[index]`, also removes its learning from `result.learnings`, its sources from `result.sources`, its images from `result.images`. Logs activity.
- `retrySearchResult(index: number)` — Stores the query from `searchResults[index]` in `pendingRetryQueries` (new field), then removes it (same as delete semantics). The pending retries are consumed by the next `requestMoreResearch` call.
- `pendingRetryQueries: readonly string[]` — new state field, persisted, survives refresh.
- `clearSuggestion()` — convenience, set to empty string.

**Key constraint:** `result.learnings` is `string[]` (no index mapping to searchResults). Matching is positional: `result.learnings[i]` corresponds to `searchResults[i].learning`. Same for sources/images (flat arrays accumulated from all results). Delete must strip the correct learning string and the correct sources/images. The mapping is: `searchResults[i].sources` were pushed into `result.sources` at the same position as `searchResults[i]`. But since sources is a flat array accumulated across all results, we need to identify which sources belong to which result.

**Matching strategy:** Use the source URL as the identifier. When deleting searchResults[i], collect its `sources.map(s => s.url)` and `images.map(img => img.url)`, then filter those out of `result.sources` and `result.images`. For learnings, filter out `searchResults[i].learning` from `result.learnings`.

**Line count concern:** Store is at 577 lines. Adding 3 actions + 1 field + their implementations (~50-60 lines) pushes toward 630-640. This is over the 500-line content limit (the store uses 577 content lines with blanks/comments skipped, which already exceeds 500). Since the persist schema was already extracted, the remaining options are extracting more helpers or splitting event handlers. For now, the ESLint rule skips blank lines and comments, so 577 lines is ~450 content lines. Adding ~60 content lines → ~510 content lines. Tight but acceptable. If it crosses, extract handleEvent into a separate file.

### SSE route (route.ts, 626 lines)

**Current research phase handler** (`handleResearchPhase`): Takes `{ phase: "research", plan: string }`, creates orchestrator, calls `orchestrator.researchFromPlan(plan)`, which generates SERP queries from the plan then searches+analyzes each.

**Needed extension for retry + manual queries:** Instead of modifying the orchestrator, the simplest approach is to construct a mini-plan string from retry queries + manual queries and pass it as the `plan` field. The orchestrator's `generateSerpQueries` will turn these into search tasks. Since the user provides explicit queries, we can skip SERP generation and use the queries directly.

**Two approaches:**
1. **Simple:** Append retry + manual queries to the plan text as additional bullet points. The orchestrator will generate SERP queries that include these. Pro: no route changes. Con: queries may get rephrased by the AI, not exact-match retry.
2. **Direct query mode:** Add `queries?: string[]` to the research schema. When present, skip SERP generation and execute those queries directly. Pro: exact retry semantics. Con: more changes.

**Recommendation: Approach 1 (simple).** For retry, the user wants re-search of the same topic. Slight rephrasing is acceptable. For manual queries, the user's text is appended to the plan. This avoids any orchestrator changes and keeps the route modification minimal — just the client building the right plan string.

The `requestMoreResearch` hook already appends the suggestion to the plan. We extend it to also append retry queries and manual queries.

### Hook layer (use-research.ts, 604 lines)

**Current `requestMoreResearch`:**
```ts
const { plan, suggestion } = useResearchStore.getState();
await connectSSE({
  phase: "research",
  plan: suggestion ? `${plan}\n\nAdditional direction from user:\n${suggestion}` : plan,
  ...buildBaseBody(),
});
```

**Needed changes:**
- Also read `manualQueries` and `pendingRetryQueries` from store
- Append them to the plan string
- Clear `manualQueries`, `pendingRetryQueries`, and `suggestion` after sending

**New action:** `finalizeFindings()` — calls `store.freeze('research')`, then navigates to report or calls `generateReport()`. This is a thin wrapper in the hook, not a separate SSE call.

### UI components

**New component: SearchResultCard** (~80-100 lines)
- Receives `SearchResult` + index
- Shows query as header, learning as collapsed markdown, sources as list
- Delete (X) button → calls `store.removeSearchResult(index)`
- Retry (↻) button → calls `store.retrySearchResult(index)`
- Condensed card layout: header with query + buttons, expandable learning section

**New component: ManualQueryInput** (~60-80 lines)
- Text input + "Add" button
- Shows pending manual queries as removable chips/tags
- Calls `store.setManualQueries([...store.manualQueries, newQuery])` on add
- Calls `store.setManualQueries(store.manualQueries.filter((_, i) => i !== idx))` on remove

**Modified: ResearchActions.tsx** (currently 176 lines)
- Add "Finalize Findings" button (prominent, replaces or sits next to "Generate Report")
- The suggestion textarea is already present
- Wire "Finalize Findings" to: `store.freeze('research')` → `onGenerateReport()` callback
- The "Continue Research" button becomes "More Research" and shows pending count (retry + manual queries)
- Stat badges show pending retries + manual queries count
- Target: ~200-250 lines (under 300 limit)

**Modified: ActiveResearchCenter.tsx** (currently 178 lines)
- `renderStreamingView()` needs to render SearchResultCards instead of plain div blocks for completed search results
- Currently renders accumulated search rounds as plain MarkdownRenderer divs
- Change to: active search results rendered as SearchResultCard components with CRUD controls
- Target: ~220-240 lines

**Modified: PhaseAccordion.tsx** (currently 296 lines)
- No changes needed — it already delegates research content to `onRenderStreaming` + `onRenderResearchActions` render props

### i18n (messages/en.json, messages/vi.json)

New keys needed:
- `ResearchActions.moreResearch` — "More Research" (replace "Continue Research")
- `ResearchActions.finalizeFindings` — "Finalize Findings"
- `ResearchActions.pendingCount` — "{count} pending queries"
- `SearchResultCard.delete` — "Delete result"
- `SearchResultCard.retry` — "Retry search"
- `SearchResultCard.sources` — "{count} sources"
- `ManualQueryInput.placeholder` — "Add a search query..."
- `ManualQueryInput.add` — "Add"

### Persistence

- `pendingRetryQueries: readonly string[]` needs to be added to the persist schema in `research-store-persist.ts`
- Add to persistedStateSchema: `pendingRetryQueries: z.array(z.string()).optional().default([])`
- Add to hydrate in research-store.ts
- Add to auto-persist subscription

## Risks and Gotchas

1. **Result array matching** — `result.learnings` is a flat `string[]` accumulated from all searchResults. When deleting searchResults[i], we must find and remove the exact learning string. If two results have identical learning text, we'd remove the wrong one. **Mitigation:** Use index-based matching — learnings are pushed in order, so `result.learnings[i]` matches `searchResults[i].learning`. But after a deletion, indices shift. Safer approach: filter by exact string match but only remove the first occurrence, since duplicate learnings would be unusual and the worst case is removing one too many identical strings.

2. **Source deduplication** — Sources from different search results may share URLs (e.g., Wikipedia). Deleting result A shouldn't remove sources that also appear in result B. **Mitigation:** Before removing sources, collect all URLs from remaining search results. Only remove URLs that don't appear in any remaining result.

3. **Store line count** — At 577 lines, adding delete/retry actions could push toward 640 lines. ESLint max-lines is 500 with skipBlankLines+skipComments. Current content is ~450 lines, target ~510 after additions. Should be fine but tight. If it crosses, extract `handleEvent` into a separate module.

4. **Retry timing** — `pendingRetryQueries` are consumed on next "More Research" click. If user deletes a result but never clicks "More Research", the retry is orphaned. This is acceptable — the user explicitly chose not to continue.

5. **Freeze before generateReport** — The "Finalize Findings" flow must freeze before generating report. The `generateReport` hook reads `result.learnings/sources/images` from the store. If we freeze first (which only snapshots to checkpoints), the result field is still intact. So `freeze('research')` then `generateReport()` works correctly. The freeze happens synchronously (Zustand set), and the SSE connection is async, so ordering is guaranteed.

6. **"More Research" clears suggestion** — After sending the suggestion with the plan, clear it so the textarea is empty for the next round. Same for manual queries and pending retries — consume and clear.

## Don't Hand-Roll

Nothing novel — all patterns are established in the codebase (store actions, component props, SSE connection, i18n keys).

## Sources

- `src/stores/research-store.ts` (577 lines) — Store shape, handleEvent, freeze
- `src/stores/research-store-persist.ts` — Persist schema
- `src/hooks/use-research.ts` (604 lines) — SSE connection, phase actions
- `src/app/api/research/stream/route.ts` (626 lines) — SSE route with phase handlers
- `src/components/research/ResearchActions.tsx` (176 lines) — Current suggestion + action buttons
- `src/components/research/ActiveResearchCenter.tsx` (178 lines) — Center panel with PhaseAccordion
- `src/components/research/PhaseAccordion.tsx` (296 lines) — Accordion with render props
- `src/engine/research/types.ts` — SearchResult, SearchTask, checkpoint types
- `src/engine/research/orchestrator.ts` — researchFromPlan, runSearchPhase
