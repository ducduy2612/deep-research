# T02: shadcn/ui Primitives and Infrastructure Utilities

**Slice:** S01 — **Milestone:** M001

## Description

Install all shadcn/ui primitives with Obsidian Deep theming and build the four infrastructure utilities (AppError, env, logger, storage).

Purpose: These components and utilities form the reusable foundation for every subsequent phase. Installing them now with correct Obsidian Deep styling means all future work uses the same tested primitives.
Output: 16 shadcn/ui component files in src/components/ui/ and 4 infrastructure modules in src/lib/.

## Must-Haves

- [ ] "All 16 shadcn/ui primitives are installed and render with Obsidian Deep colors"
- [ ] "Floating elements (dialog, popover, dropdown-menu) show glassmorphism effect"
- [ ] "AppError class provides structured error format with code, message, and context"
- [ ] "env.ts validates environment variables with Zod at startup, failing fast on invalid config"
- [ ] "logger outputs JSON in production and pretty-print in development"
- [ ] "Storage wrapper provides Zod-validated get/set with localforage"

## Files

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/resizable.tsx`
- `src/lib/errors.ts`
- `src/lib/env.ts`
- `src/lib/logger.ts`
- `src/lib/storage.ts`
- `src/types/index.ts`
