# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript 5 - All application code, React components, and API routes

**Secondary:**
- JSON - Configuration files and locale data
- CSS - Tailwind CSS for styling

## Runtime

**Environment:**
- Node.js >= 18.18.0
- npm >= 9.8.0

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present, lockfileVersion: 3)

## Frameworks

**Core:**
- Next.js 15.5.12 - React framework with App Router, API routes, and middleware
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering

**Testing:**
- Not detected

**Build/Dev:**
- Turbopack - Next.js dev server (via `next dev --turbopack`)
- TypeScript 5 - Type checking and compilation
- PostCSS 8 - CSS processing
- Tailwind CSS 3.4.1 - Utility-first CSS framework

## Key Dependencies

**AI/LLM Integration:**
- `ai` 4.3.12 - Vercel AI SDK core for streaming and text generation
- `@ai-sdk/anthropic` 1.2.10 - Anthropic Claude provider
- `@ai-sdk/azure` 1.3.23 - Azure OpenAI provider
- `@ai-sdk/deepseek` 0.2.13 - DeepSeek provider
- `@ai-sdk/google` 1.2.14 - Google Gemini provider
- `@ai-sdk/google-vertex` 2.2.27 - Google Vertex AI provider
- `@ai-sdk/mistral` 1.2.8 - Mistral AI provider
- `@ai-sdk/openai` 1.3.21 - OpenAI provider
- `@ai-sdk/openai-compatible` 0.2.14 - OpenAI-compatible API provider
- `@ai-sdk/xai` 1.2.15 - xAI Grok provider
- `@ai-sdk/ui-utils` 1.2.9 - UI utilities for AI SDK
- `@openrouter/ai-sdk-provider` 0.4.5 - OpenRouter provider
- `ollama-ai-provider` 1.2.0 - Local Ollama provider

**UI Components:**
- Radix UI - Headless UI components (`@radix-ui/react-*`)
- `next-themes` 0.4.4 - Theme switching (dark/light mode)
- `sonner` 2.0.1 - Toast notifications
- `lucide-react` 0.475.0 - Icon library

**State Management:**
- `zustand` 5.0.3 - Lightweight state management with persistence
- `localforage` 1.10.0 - Offline storage with better browser API support

**Data Processing:**
- `zod` 3.24.2 - Schema validation
- `zod-to-json-schema` 3.24.3 - Zod to JSON schema conversion
- `radash` 12.1.0 - Utility library
- `fuse.js` 7.1.0 - Fuzzy search

**Markdown/Content:**
- `react-markdown` 10.1.0 - Markdown rendering
- `marked` 15.0.12 - Markdown parser
- `rehype-highlight` 7.0.2 - Syntax highlighting
- `rehype-katex` 7.0.1 - LaTeX math rendering
- `rehype-raw` 7.0.0 - HTML in markdown
- `remark-gfm` 4.0.1 - GitHub Flavored Markdown
- `remark-math` 6.0.0 - Math in markdown
- `katex` 0.16.22 - Math rendering engine
- `mermaid` 11.6.0 - Diagrams and charts

**File Handling:**
- `@zip.js/zip.js` 2.7.60 - ZIP file creation/extraction
- `file-saver` 2.0.5 - File saving utility
- `pdfjs-dist` 5.1.91 - PDF parsing

**PWA/Offline:**
- `@serwist/next` 9.0.14 - Service worker for Next.js (PWA)
- `serwist` 9.0.14 - Service worker management
- `react-use-pwa-install` 1.0.3 - PWA install prompt

**Internationalization:**
- `i18next` 24.2.3 - i18n framework
- `react-i18next` 15.4.1 - React integration
- `i18next-browser-languagedetector` 8.0.4 - Language detection
- `i18next-resources-to-backend` 1.2.1 - Dynamic locale loading

**Other:**
- `react-hook-form` 7.54.2 - Form handling
- `@hookform/resolvers` 4.1.2 - Form validation resolvers
- `dayjs` 1.11.13 - Date manipulation
- `nanoid` 5.1.5 - Unique ID generation
- `ts-md5` 1.3.1 - MD5 hashing
- `p-limit` 6.2.0 - Promise concurrency limiting

## Configuration

**Environment:**
- Environment variables for API keys and base URLs
- Default fallback URLs configured in `next.config.ts`
- Runtime API proxy via Next.js rewrites

**Build:**
- `next.config.ts` - Next.js configuration with Serwist PWA integration
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*`)
- `tailwind.config.ts` - Tailwind CSS with custom theme
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration

**Special Build Modes:**
- Standalone: `npm run build:standalone` (for containerized deployment)
- Export: `npm run build:export` (static site, disables API routes)
- Default: `npm run build` (full Next.js app)

## Platform Requirements

**Development:**
- Node.js >= 18.18.0
- npm >= 9.8.0
- Modern browser with ES2017+ support

**Production:**
- Docker support (via `docker-compose.yml`)
- Vercel deployment ready (via `vercel.json`)
- Standalone server mode
- Static export capability (limited features)

---

*Stack analysis: 2026-03-31*
