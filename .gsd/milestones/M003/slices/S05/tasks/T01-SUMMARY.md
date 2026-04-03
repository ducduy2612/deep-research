---
id: T01
parent: S05
milestone: M003
provides: []
requires: []
affects: []
key_files: ["src/utils/download.ts", "src/utils/export-pdf.ts", "src/types/html2pdf.d.ts", "src/components/research/FinalReport.tsx", "src/utils/__tests__/download.test.ts", "src/utils/__tests__/export-pdf.test.ts", "messages/en.json", "messages/vi.json"]
key_decisions: ["Used html2pdf.js for PDF generation with marked for MD→HTML conversion", "Dropdown pattern with click-outside detection for export menu"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 11 new tests pass (3 downloadBlob + 8 export-pdf). Full suite 722/722 pass. `pnpm build` compiles clean. `pnpm lint` clean. FinalReport.tsx at 279 lines under 500-line limit."
completed_at: 2026-04-03T17:59:05.209Z
blocker_discovered: false
---

# T01: Created download utility and wired FinalReport export button with Markdown and PDF download options

> Created download utility and wired FinalReport export button with Markdown and PDF download options

## What Happened
---
id: T01
parent: S05
milestone: M003
key_files:
  - src/utils/download.ts
  - src/utils/export-pdf.ts
  - src/types/html2pdf.d.ts
  - src/components/research/FinalReport.tsx
  - src/utils/__tests__/download.test.ts
  - src/utils/__tests__/export-pdf.test.ts
  - messages/en.json
  - messages/vi.json
key_decisions:
  - Used html2pdf.js for PDF generation with marked for MD→HTML conversion
  - Dropdown pattern with click-outside detection for export menu
duration: ""
verification_result: passed
completed_at: 2026-04-03T17:59:05.213Z
blocker_discovered: false
---

# T01: Created download utility and wired FinalReport export button with Markdown and PDF download options

**Created download utility and wired FinalReport export button with Markdown and PDF download options**

## What Happened

Installed html2pdf.js and created shared `downloadBlob()` utility in `src/utils/download.ts` for browser-initiated file downloads via object URLs. Created `src/utils/export-pdf.ts` with `exportReportAsPdf()` (MD→HTML via marked, then PDF via html2pdf.js) and `sanitizeFilename()` helper. Added TypeScript declaration for html2pdf.js. Modified FinalReport.tsx to replace the static Export button with a dropdown showing "Download Markdown" and "Download PDF" options, using click-outside detection. Added i18n keys to both English and Vietnamese locale files. Wrote 11 unit tests covering download utility, filename sanitization, PDF export, and error handling.

## Verification

All 11 new tests pass (3 downloadBlob + 8 export-pdf). Full suite 722/722 pass. `pnpm build` compiles clean. `pnpm lint` clean. FinalReport.tsx at 279 lines under 500-line limit.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm vitest run src/utils/__tests__/download.test.ts src/utils/__tests__/export-pdf.test.ts` | 0 | ✅ pass | 375ms |
| 2 | `pnpm vitest run (full suite)` | 0 | ✅ pass | 2280ms |
| 3 | `pnpm build` | 0 | ✅ pass | 14000ms |
| 4 | `pnpm lint` | 0 | ✅ pass | 5000ms |


## Deviations

None. Implementation matches the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/utils/download.ts`
- `src/utils/export-pdf.ts`
- `src/types/html2pdf.d.ts`
- `src/components/research/FinalReport.tsx`
- `src/utils/__tests__/download.test.ts`
- `src/utils/__tests__/export-pdf.test.ts`
- `messages/en.json`
- `messages/vi.json`


## Deviations
None. Implementation matches the task plan exactly.

## Known Issues
None.
