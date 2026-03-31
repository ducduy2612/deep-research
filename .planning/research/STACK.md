# Technology Stack

**Project:** Deep Research Rewrite
**Researched:** 2026-03-31
**Confidence:** HIGH (versions verified via npm registry)

## CRITICAL: Version Constraints Are Outdated

The project constraints specify "Next.js 15, Vercel AI SDK 4.x". As of March 2026:

| Constraint | Specified | Current Latest | Recommendation |
|------------|-----------|----------------|----------------|
| Next.js | 15.x | **16.2.1** (stable) | Use **Next.js 15.5.14** -- stable, well-tested, avoids v16 migration risk |
| AI SDK | 4.x | **6.0.141** (stable), 7.0.0-beta | Use **AI SDK 4.3.19** (last v4) OR upgrade to **6.0.141** |
| Zod | unspecified | **4.3.6** | Use **Zod 3.24.x** with AI SDK 4.x; use **Zod 4.3.x** with AI SDK 6.x |
| Tailwind CSS | 3.4.1 (old codebase) | **4.2.2** | Use **Tailwind CSS 4.2.2** -- complete rewrite, better DX |

**Recommendation: Upgrade AI SDK to v6 and use Zod v4.**

Rationale: AI SDK 4.x last release was July 2025 and is no longer maintained. AI SDK 6.x has been stable since December 2025 with 141 patch releases -- it is battle-tested. Starting a ground-up rewrite on an EOL SDK version creates immediate technical debt. The API surface is similar enough that the upgrade cost is minimal at project start, and the benefit is access to continued bug fixes, new model support, and provider improvements.

Similarly, use Tailwind CSS v4 which is a ground-up rewrite with CSS-first configuration, no `tailwind.config.ts` needed, and native dark mode support.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.5.14 | React framework, App Router, API routes | Stable v15 line, avoids v16 bleeding edge; App Router is mature; standalone output for Docker |
| React | 19.2.4 | UI library | Required by Next.js 15; Server Components, Actions, use() hook |
| React DOM | 19.2.4 | DOM rendering | Peer dependency of React 19 |
| TypeScript | 6.0.2 | Type safety | Latest stable; stricter checks, better inference |

### AI / LLM Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `ai` | 6.0.141 | AI SDK core -- streaming, text gen, structured output | Latest stable v6; 141 patches of bug fixes; active maintenance |
| `@ai-sdk/google` | 3.0.54 | Google Gemini provider (native) | Native Gemini support -- gemini-2.x models, structured output, tool calling. v3 pairs with ai v6 |
| `@ai-sdk/openai` | 3.0.49 | OpenAI provider | Official OpenAI provider. v3 pairs with ai v6. Also needed as base for OpenAI-compatible |
| `@ai-sdk/openai-compatible` | 2.0.37 | OpenAI-compatible API layer | Covers DeepSeek, OpenRouter, Groq, xAI via shared interface. v2 pairs with ai v6 |

**Provider architecture:** Two provider factories:
1. **Gemini native** via `@ai-sdk/google` -- for Google models
2. **OpenAI-compatible** via `@ai-sdk/openai-compatible` -- covers OpenAI, DeepSeek, OpenRouter, Groq, xAI with custom `baseURL` per provider

**Not included (intentionally dropped):**
- `@ai-sdk/anthropic` -- dropped per project scope
- `@ai-sdk/azure` -- dropped per project scope
- `@ai-sdk/mistral` -- dropped per project scope
- `@ai-sdk/deepseek` -- covered by openai-compatible
- `@ai-sdk/xai` -- covered by openai-compatible
- `@openrouter/ai-sdk-provider` -- covered by openai-compatible
- `ollama-ai-provider` -- dropped for v1.0

### Validation & Data

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zod` | 4.3.6 | Schema validation for env vars, API inputs, config | Latest v4; supports `zod/v3` backward compat export. AI SDK 6.x accepts `^3.25.76 \|\| ^4.1.8` |
| `react-hook-form` | 7.72.0 | Form state management | Battle-tested, tiny bundle, works with Zod resolver |
| `@hookform/resolvers` | 5.2.2 | Zod integration for react-hook-form | Must match react-hook-form version |

**Note on Zod v4:** Zod v4 exports both `zod/v4` (new API) and `zod/v3` (backward compat). AI SDK 6.x peer dependency accepts `^3.25.76 || ^4.1.8`. Using Zod v4 gives access to the newer API for application code while maintaining AI SDK compatibility.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zustand` | 5.0.12 | Client-side state management | Lightweight, no boilerplate, built-in persistence middleware. v5 stable with improved TypeScript inference |
| `localforage` | 1.10.0 | Offline-first storage abstraction | Wraps IndexedDB/WebSQL/localStorage with async API. Used by Zustand persist middleware for large research data |

### Styling & UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `tailwindcss` | 4.2.2 | Utility-first CSS | v4 is a complete rewrite -- CSS-first config, no `tailwind.config.ts`, native `@theme` blocks, automatic content detection |
| `@tailwindcss/postcss` | 4.2.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 integration with PostCSS |
| `postcss` | 8.5.8 | CSS processing pipeline | Required by Tailwind |
| `@tailwindcss/typography` | 0.5.19 | Prose styling for markdown content | Essential for rendering research reports with proper typography |
| **shadcn/ui** | 2.x | Component library (Radix + Tailwind + CVA) | Full code ownership, no lock-in. Radix primitives for a11y (Dialog, Select, Dropdown, Tabs, Accordion, Popover, Tooltip). Supports Tailwind v4 natively. Apply Obsidian Deep design by overriding CSS variables and restyling component variants -- no need to build from scratch |
| `class-variance-authority` | 0.7.1 | Component variant system | Powers shadcn's variant patterns. Add custom Obsidian variants (gradient button, surface hierarchy, AI pulse) |
| `clsx` | 2.1.1 | Conditional class name utility | Lightweight, no deps, works perfectly with Tailwind |
| `tailwind-merge` | 3.5.0 | Intelligent Tailwind class merging | Prevents class conflicts when composing components |
| `lucide-react` | 1.7.0 | Icon library | Comprehensive, tree-shakeable, consistent design |
| `sonner` | 2.0.7 | Toast notifications | Beautiful, accessible, minimal API |

**Not included (intentionally):**
- `next-themes` -- The Obsidian Deep design is dark-only. No theme switching needed. Hardcode dark mode in Tailwind v4 config via `@variant dark { ... }` or use CSS custom properties.
- Building custom component primitives -- shadcn/ui provides Radix-based accessible components (Dialog, Select, Dropdown, Tabs, Accordion, Popover, Tooltip, etc.) with full code ownership. No reason to rebuild these from scratch. Add components via `npx shadcn@latest add <component>` then restyle to match Obsidian Deep.

**Design system integration strategy:**

The Obsidian Deep design system (see `/design/DESIGN.md`) is applied to shadcn components through CSS variable remapping and variant customization -- not by replacing shadcn. This avoids weeks of building accessible primitives from scratch.

Steps:
1. **Override CSS variables** -- Map Obsidian tokens to shadcn's variable names in `globals.css` (e.g. `--background` → `#131315`, `--card` → `#201f22`, `--primary` → `#c0c1ff`). Drop light mode entirely.
2. **Restyle components** -- Remove borders (tonal layering instead), apply glassmorphism to floating elements, use surface hierarchy colors.
3. **Add custom variants** -- Gradient primary button, AI pulse indicator, ghost border pattern via CVA.
4. **Dark-only config** -- Delete `:root` light theme variables. Obsidian Deep has no light mode.

**Tailwind v4 configuration approach for Obsidian Deep:**

Tailwind v4 uses CSS-first configuration. No `tailwind.config.ts` file needed. shadcn v2 supports Tailwind v4 natively.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Obsidian Deep surface hierarchy */
  --color-well: #08090d;
  --color-deck: #0d0f14;
  --color-sheet: #13161d;
  --color-raised: #1a1e27;
  --color-float: #222733;

  /* Primary accent */
  --color-primary: #6366f1;
  --color-primary-muted: #4f46e5;

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Spacing scale */
  --spacing-18: 4.5rem;
}
```

### Markdown / Content Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `react-markdown` | 10.1.0 | Markdown rendering component | De-facto standard, plugin ecosystem |
| `remark-gfm` | 4.0.1 | GitHub Flavored Markdown | Tables, strikethrough, task lists |
| `remark-math` | 6.0.0 | LaTeX math syntax support | Research content frequently contains math |
| `rehype-highlight` | 7.0.2 | Syntax highlighting in code blocks | Lightweight, uses highlight.js |
| `rehype-katex` | 7.0.1 | LaTeX rendering | Renders math notation beautifully |
| `rehype-raw` | 7.0.0 | Raw HTML in markdown | Needed for embedded content |
| `katex` | 0.16.44 | Math typesetting engine | Peer dep of rehype-katex |
| `mermaid` | 11.13.0 | Diagram and chart rendering | Flowcharts, sequence diagrams in research reports |

**Note:** `marked` was in the old codebase. Drop it -- `react-markdown` with remark/rehype plugins covers all use cases. Using two markdown parsers creates inconsistency.

### File Processing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `officeparser` | 6.0.7 | Office document parser | Handles DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF. Returns structured AST with tables, formatting, metadata, images, chart data. Replaces custom officeParser.ts (718 lines) |
| `file-saver` | 2.0.5 | Client-side file download trigger | Small utility for saving generated reports |

**PDF OCR via LLM (no pdfjs-dist needed):**

PDFs are NOT parsed with officeparser or pdfjs-dist. Instead, the PDF file is sent directly to an OpenAI-compatible vision/OCR model (e.g. GLM-OCR, GPT-4o, Gemini) that natively accepts PDF input. The model returns structured text preserving layout, tables, and reading order.

This leverages the existing OpenAI-compatible provider factory — no new dependency needed. The OCR endpoint is configured in settings as another OpenAI-compatible provider with a custom `baseURL` and `apiKey`. Benefits:
- Handles scanned documents, images with text, handwritten content, complex layouts
- No intermediate rendering step — model reads PDF natively
- Same API surface across all vision-capable models (GLM-OCR, GPT-4o, Gemini, etc.)
- Improves as models improve — no code changes needed

**Office docs** (DOCX, PPTX, XLSX, ODT, ODP, ODS, RTF) use `officeparser` v6 for structured AST extraction.
**Plain text** formats (text, JSON, XML, YAML, code) are handled by a lightweight `text.ts` parser in the engine layer.

### PWA / Offline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `serwist` | 9.5.7 | Service worker management | Successor to next-pwa. First-class Next.js integration |
| `@serwist/next` | 9.5.7 | Next.js Serwist integration | Works with Next.js 14+, App Router compatible |
| `@serwist/cli` | 9.5.7 | Serwist CLI tools | Required peer dep of @serwist/next v9.5.x |
| `react-use-pwa-install` | 1.0.3 | PWA install prompt hook | Custom install prompt for mobile browsers |

### Internationalization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next-intl` | 4.8.3 | Next.js i18n framework | Best i18n solution for Next.js App Router. Server Components support, type-safe, no `i18next` dependency needed |
| `typescript` | 6.0.2 | Required peer dep | next-intl requires TS >= 5.0 |

**Not included (intentionally):**
- `i18next` -- Drop in favor of `next-intl` which has its own message format. next-intl is purpose-built for Next.js App Router and handles Server Components natively. Using i18next with Next.js App Router requires workarounds.
- `react-i18next` -- Replaced by next-intl
- `i18next-browser-languagedetector` -- Replaced by next-intl's built-in detection
- `i18next-resources-to-backend` -- Replaced by next-intl's built-in lazy loading

### Logging & Observability

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `pino` | 10.3.1 | Structured JSON logging | Fastest Node.js logger (5x faster than Winston). Structured output, multiple transports, works in browser via `pino/browser` |
| `pino-pretty` | 13.1.3 | Dev-friendly log formatting | Readable logs during development, not for production |

**Architecture:** Pino runs on the server side (API routes, middleware). Client-side errors use a lightweight wrapper that sends to the server API route for structured logging. No need for heavy client-side logging libraries.

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

### Utilities

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `nanoid` | 5.1.7 | Unique ID generation | Small, fast, URL-safe. For research session IDs, request IDs |
| `dayjs` | 1.11.20 | Date manipulation | Lightweight moment.js alternative, immutable, chainable |
| `fuse.js` | 7.1.0 | Fuzzy search | Client-side fuzzy search for research history, settings |
| `radash` | 12.1.1 | Utility functions | Modern lodash alternative: `tryit`, `map`, `group`, `suspend`, `retry` |
| `p-limit` | 7.3.0 | Promise concurrency limiting | Rate limit concurrent API calls to providers |

**Note on `ts-md5`:** Drop it. Use the Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) for any hashing needs. MD5 is cryptographically broken and should not be used even for non-security purposes when alternatives exist.

### Dev Dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `eslint` | 10.1.0 | Linting | Flat config support, latest rules |
| `@eslint/js` | 10.0.1 | ESLint JS rules | Required for flat config |
| `typescript-eslint` | 8.58.0 | TypeScript ESLint integration | Official TS-aware linting |
| `@types/react` | 19.2.14 | React type definitions | Match React 19.x |
| `vitest` | 4.1.2 | Unit testing framework | Fast, Vite-native, TypeScript support out of box |
| `@testing-library/react` | 16.3.2 | React component testing | Standard for testing React components user-behavior-first |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AI SDK | ai@6.x | ai@4.x (project spec) | v4 EOL since July 2025. No bug fixes, no new model support. Starting fresh on EOL = instant debt |
| AI SDK | ai@6.x | ai@7.x (beta) | Beta, unstable API. Too risky for rewrite |
| Next.js | 15.5.14 | 16.2.1 | v16 just released, ecosystem still catching up. v15 is proven |
| i18n | next-intl | i18next + react-i18next | i18next requires workarounds for App Router / Server Components. next-intl is purpose-built |
| Logging | pino | winston | Pino is 5x faster, structured by default, better DX |
| Markdown | react-markdown | marked | Using both creates inconsistency. react-markdown + plugins covers everything |
| CSS | Tailwind v4 | Tailwind v3 | v4 is a ground-up rewrite with CSS-first config. Perfect for fresh project. v3 config format is deprecated |
| Theme | No next-themes | next-themes | Obsidian Deep is dark-only. No theme switching. Remove unnecessary dependency |
| Forms | react-hook-form | conform | RHF is more mature, larger community, better Zod integration |
| Utilities | radash | lodash | Tree-shakeable, modern API, no prototype pollution risk |
| Hashing | Web Crypto API | ts-md5 | MD5 is broken. Web Crypto is built-in, no dependency needed |

---

## Integration Points

### AI SDK Provider Factory Pattern

```typescript
// lib/ai/providers.ts
import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

type ProviderConfig = {
  type: 'gemini' | 'openai-compatible';
  apiKey: string;
  baseURL?: string;  // for openai-compatible providers
  modelId: string;
};

function createProvider(config: ProviderConfig) {
  switch (config.type) {
    case 'gemini':
      return google(config.modelId);
    case 'openai-compatible':
      return createOpenAICompatible({
        name: config.modelId,
        baseURL: config.baseURL!,
      })(config.modelId);
  }
}
```

### Zustand + LocalForage Persistence

```typescript
// stores/research-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';

export const useResearchStore = create(
  persist(
    (set) => ({ /* state + actions */ }),
    {
      name: 'deep-research-store',
      storage: createJSONStorage(() => localforage),
    }
  )
);
```

### Zod v4 + AI SDK v6 Compatibility

```typescript
// lib/validation/env.ts
import { z } from 'zod';  // Uses zod v4 API

// AI SDK v6 accepts both zod v3.25+ and v4.1+
// Zod v4 package exports both APIs:
// import { z } from 'zod/v4'  -- new API
// import { z } from 'zod/v3'  -- backward compat
```

### Pino in Next.js API Routes

```typescript
// app/api/research/route.ts
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  logger.info({ event: 'research_start', query: body.query });
  // ... research logic
  logger.info({ event: 'research_complete', sessionId, duration });
}
```

---

## Installation

```bash
# Core framework
npm install next@15.5.14 react@19.2.4 react-dom@19.2.4

# AI SDK v6 + providers
npm install ai@6 @ai-sdk/google@3 @ai-sdk/openai@3 @ai-sdk/openai-compatible@2

# Validation & forms
npm install zod@4 react-hook-form@7 @hookform/resolvers@5

# State management
npm install zustand@5 localforage@1

# Styling & UI
npm install tailwindcss@4 @tailwindcss/postcss@4 postcss@8 @tailwindcss/typography@0.5
npm install clsx@2 tailwind-merge@3 lucide-react@1 sonner@2 class-variance-authority@0.7
npx shadcn@latest init  # then add components: npx shadcn@latest add button dialog select tabs ...

# Markdown rendering
npm install react-markdown@10 remark-gfm@4 remark-math@6
npm install rehype-highlight@7 rehype-katex@7 rehype-raw@7 katex@0.16 mermaid@11

# File processing (officeparser for Office docs, LLM OCR for PDFs via existing provider factory)
npm install officeparser@6 file-saver@2

# PWA
npm install serwist@9 @serwist/next@9 @serwist/cli@9 react-use-pwa-install@1

# i18n
npm install next-intl@4

# Logging
npm install pino@10

# Utilities
npm install nanoid@5 dayjs@1 fuse.js@7 radash@12 p-limit@7

# Dev dependencies
npm install -D typescript@6 @types/react@19 eslint@10 @eslint/js@10 typescript-eslint@8
npm install -D vitest@4 @testing-library/react@16 pino-pretty@13
```

---

## Docker Deployment

The existing codebase already has Docker support. For the rewrite:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:standalone

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

---

## Sources

- npm registry (verified 2026-03-31): all package versions confirmed via `npm view`
- Vercel AI SDK docs: https://sdk.vercel.ai/docs/introduction -- banner states "AI SDK 4.2 is now available" but npm shows v6.0.141 as latest stable
- AI SDK version timeline: v4.3.19 (2025-07-15, last v4), v5.0.0 (2025-07-31), v6.0.0 (2025-12-22), v6.0.141 (2026-03-27)
- AI SDK v6 peer deps: `zod: "^3.25.76 || ^4.1.8"`, `react: "^18 || ^19 || ^19.0.0-rc"`
- AI SDK v4 peer deps: `zod: "^3.0.0"`, `react: "^18 || ^19 || ^19.0.0-rc"` -- v4 cannot use Zod v4
- Next.js 15.5.14 peer deps: `react: "^18.2.0 || 19.0.0-rc-* || ^19.0.0"`
- Serwist v9.5.7 peer deps: `next: ">=14.0.0"`, `@serwist/cli: "^9.5.7"`
- next-intl v4.8.3 peer deps: `next: "^12.0.0 || ^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0"`
- Tailwind CSS v4 uses CSS-first config (no tailwind.config.ts): https://tailwindcss.com/docs
- Pino is recommended as fastest Node.js logger: https://github.com/pinojs/pino
