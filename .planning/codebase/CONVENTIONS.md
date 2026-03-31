# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `SearchResult.tsx`, `Topic.tsx`)
- Utilities: camelCase with `.ts` extension (e.g., `style.ts`, `error.ts`, `file.ts`)
- Hooks: camelCase prefixed with `use` (e.g., `useDeepResearch.ts`, `useKnowledge.ts`)
- Store files: camelCase (e.g., `global.ts`, `setting.ts`, `task.ts`)
- UI components: kebab-case for internal UI (e.g., `button.tsx`, `input.tsx`)

**Functions:**
- camelCase for all functions (e.g., `handleSubmit`, `generateId`, `updateTask`)
- Custom hooks follow `use` prefix convention (e.g., `useDeepResearch`, `useAiProvider`)
- Event handlers prefixed with `handle` (e.g., `handleSubmit`, `handleRetry`)
- Getter functions often start with `get` (e.g., `getModel`, `getPromptOverrides`)

**Variables:**
- camelCase for all variables (e.g., `formattedTime`, `isThinking`, `taskQuery`)
- Boolean variables prefixed with `is/has/can/should` (e.g., `isThinking`, `hasApiKey`, `taskFinished`)
- Constants use UPPER_SNAKE_CASE (e.g., `HEAD_SCRIPTS`, `MAX_CHUNK_LENGTH`, `TOPIC_FIELD_ID`)

**Types:**
- PascalCase for interfaces and type aliases (e.g., `TaskStore`, `SearchTask`, `DeepResearchPromptTemplates`)
- Type-specific suffixes used appropriately (e.g., `Props`, `Store`, `Actions`)

**Enums/Union Types:**
- String literal types for state values (e.g., `"unprocessed" | "processing" | "completed" | "failed"`)
- Discriminated unions used in store actions pattern

## Code Style

**Formatting:**
- ESLint configured with `next/core-web-vitals` and `next/typescript`
- Key setting: `@typescript-eslint/no-explicit-any: "off"` (allows `any` type)
- No Prettier configuration detected (using default ESLint formatting)
- Uses React Compiler (experimental)

**Linting:**
- ESLint flat config format (`eslint.config.mjs`)
- TypeScript strict mode enabled in `tsconfig.json`
- Path alias: `@/*` maps to `./src/*`

**Import Organization:**

Imports follow this order:
1. External dependencies (react, next, third-party packages)
2. Internal absolute imports with `@/` alias
3. Relative imports (sibling files)

Example from `src/hooks/useDeepResearch.ts`:
```typescript
// React and core libraries
import { useState } from "react";
import { streamText, smoothStream } from "ai";

// Utility libraries
import { openai } from "@ai-sdk/openai";
import { Plimit } from "p-limit";

// Internal imports with @/ alias
import useModelProvider from "@/hooks/useAiProvider";
import useWebSearch from "@/hooks/useWebSearch";
import { useTaskStore } from "@/store/task";
```

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- Common aliases: `@/components`, `@/hooks`, `@/store`, `@/utils`, `@/constants`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations that may fail
- Custom `parseError()` utility function in `src/utils/error.ts`
- Error display using toast notifications via `sonner` library

**Error Handling Pattern:**
```typescript
async function handleSubmit(values: z.infer<typeof formSchema>) {
  try {
    setIsThinking(true);
    accurateTimerStart();
    // ... async operations
  } finally {
    setIsThinking(false);
    accurateTimerStop();
  }
}

// Error parsing
function handleError(error: unknown) {
  console.log(error);
  const errorMessage = parseError(error);
  toast.error(errorMessage);
}
```

**State Updates on Error:**
- Update task/resource status to `"failed"` when operations fail
- Use toast notifications for user-facing errors
- Console.error for debugging purposes

**Error Types:**
- `APICallError` from `ai` SDK handled specifically
- Generic `Error` instances checked with `instanceof`
- Fallback error messages for unknown error types

## Logging

**Framework:** console (native browser APIs)

**Patterns:**
- `console.error()` for errors in utility functions (`src/utils/url.ts`, `src/utils/parser/`)
- `console.log()` for debugging reasoning content (LLM thought processes)
- Comments indicate some console logging was removed (see `src/libs/mcp-server/streamableHttp.ts:217`)

**When to log:**
- Error conditions: `console.error("Invalid URL:", err)`
- LLM reasoning: `console.log(reasoning)` (for debugging AI responses)
- Conditional/unused logging remains commented out

## Comments

**When to Comment:**
- Constants with descriptive values (e.g., `TOPIC_FIELD_ID`, `RESOURCE_TRIGGER_ID`)
- Algorithm explanations (e.g., sorting weight objects)
- Inline comments for complex logic
- Disabled code sections with `//` comments

**JSDoc/TSDoc:**
- Not extensively used in this codebase
- Some parameter descriptions in external library types
- Exported functions generally lack JSDoc comments
- Type definitions use inline comments for clarification

**Comment Style:**
- Single-line `//` for brief explanations
- Multi-line `/* */` not commonly used
- JSX/TSX uses `{/* */}` for commented-out elements

## Function Design

**Size:**
- Functions range from small utilities (~10 lines) to large hooks (~850 lines)
- No strict size limit enforced
- Complex hooks like `useDeepResearch.ts` contain multiple related functions

**Parameters:**
- Destructured parameters preferred in components: `({ className, variant, size, ...props }, ref)`
- Options objects used for complex parameters
- TypeScript interfaces define parameter shapes

**Return Values:**
- Hooks return object collections: `return { status, deepResearch, askQuestions, ... }`
- Functions return single values or promises
- Store actions return void or boolean (for success indication)
- Early returns used for guard clauses

**Async Function Pattern:**
```typescript
async function processData() {
  try {
    setIsLoading(true);
    const result = await fetch();
    return result;
  } catch (err) {
    handleError(err);
  } finally {
    setIsLoading(false);
  }
}
```

## Module Design

**Exports:**
- Default exports for components (e.g., `export default function Topic()`)
- Named exports for utilities and hooks (e.g., `export function cn()`)
- Store exports use `export const` for Zustand stores
- Type exports co-located with implementations

**Barrel Files:**
- `src/utils/parser/index.ts` exports parser functions
- `src/utils/deep-research/index.ts` exports deep research utilities
- `src/components/ui/` has no barrel file (individual exports)

**Store Pattern (Zustand):**
```typescript
// State interface separated from actions interface
interface TaskStore { /* state */ }
interface TaskActions { /* methods */ }

// Store combines state + actions
export const useTaskStore = create<TaskStore & TaskActions>(
  persist(
    (set, get) => ({
      ...defaultValues,
      // action implementations
    }),
    { name: "storage-key" }
  )
);
```

**Component Structure:**
- `"use client"` directive at top of client components
- Imports organized by type
- Type definitions before component
- Constants defined outside component
- Main component function
- Export default at bottom

---

*Convention analysis: 2026-03-31*
