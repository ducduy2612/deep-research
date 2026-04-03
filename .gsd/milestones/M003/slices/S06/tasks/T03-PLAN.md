---
estimated_steps: 15
estimated_files: 2
skills_used: []
---

# T03: Browser verify: export downloads and knowledge base integration

Using a completed research from T01:

Export verification:
1. Navigate to FinalReport view
2. Click Export dropdown
3. Select MD download — verify file downloads
4. Select PDF download — verify file downloads
5. Navigate back to research phase
6. Click export on a search result card (MD)
7. Click export on a search result card (JSON)

Knowledge base verification:
1. On a search result card, click 'Add to KB' button
2. Verify success toast appears
3. Navigate to Knowledge Base page
4. Verify the added item appears in the list

Take screenshots of each action.

## Inputs

- `src/components/research/FinalReport.tsx`
- `src/components/research/SearchResultCard.tsx`
- `src/stores/knowledge-store.ts`

## Expected Output

- `Downloaded .md and .pdf files`
- `Screenshots of export UI and KB integration`

## Verification

All export options produce downloadable files. Add-to-KB adds content and shows confirmation. KB page shows the added item.
