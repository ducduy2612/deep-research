---
estimated_steps: 7
estimated_files: 5
skills_used: []
---

# T01: Install Serwist and configure PWA with service worker

**Slice:** S09 — PWA, i18n, and Polish
**Milestone:** M001

## Description

Install @serwist/next, create the service worker entry point (copying the pattern from the old v0 codebase), wrap next.config.ts with withSerwistInit(), add PWA manifest metadata via Next.js metadata API in layout.tsx, and add SerwistProvider to providers.tsx. Theme colors must use Obsidian Deep values (#0e0e10 background, #c0c1ff theme_color) — not the old v0's #FFFFFF.

## Steps

1. Install the Serwist package: `pnpm add @serwist/next` (serwist core is bundled with @serwist/next)
2. Create `src/app/sw.ts` — copy the pattern from `_archive/src-v0/app/sw.ts`. The service worker should use `defaultCache` from `@serwist/next/worker`, set `skipWaiting: true` and `clientsClaim: true` for Docker redeployments, and use `navigationPreload: true`
3. Modify `next.config.ts` — import `withSerwistInit` from `@serwist/next`, wrap the config. Use `swSrc: "src/app/sw.ts"` and `swDest: "public/sw.js"`. The `withSerwistInit()` call MUST wrap the inner config BEFORE the BUILD_MODE conditional logic. Structure: `const withSerwist = withSerwistInit({...sw options...}); export default withSerwist(nextConfig);`
4. Modify `src/app/layout.tsx` — add PWA manifest metadata to the `metadata` export. Include: `applicationName: "Deep Research"`, `appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Deep Research" }`, `manifest` pointing to a manifest route or inline metadata, `themeColor: "#c0c1ff"`, `icons` array referencing `/logo.png` (512x512, maskable) and `/logo.svg` (any). Also set `lang` attribute on `<html>` dynamically.
5. Create the web app manifest. Use Next.js metadata API's `manifest` property — either inline in layout.tsx metadata or as a `src/app/manifest.ts` file that exports a manifest object. The manifest should have: `name: "Deep Research"`, `short_name: "Deep Research"`, `theme_color: "#c0c1ff"`, `background_color: "#0e0e10"`, `display: "standalone"`, `start_url: "/"`, `orientation: "portrait"`, icons for `/logo.png` (512x512, purpose: "maskable") and `/logo.svg` (any, purpose: "any").
6. Modify `src/app/providers.tsx` — import SerwistProvider from `@serwist/next/react` (use dynamic import with `{ ssr: false }` since service worker only works client-side), wrap `{children}` with `<SerwistProvider swUrl="/sw.js">`. Note: SerwistProvider may not exist as a named export in newer versions — if so, skip this step; the SW will self-register via `clientsClaim: true`.
7. Verify: `pnpm build` succeeds with SW compilation in build output, `pnpm test` passes (498+ tests)

## Must-Haves

- [ ] `src/app/sw.ts` created with Serwist service worker (skipWaiting, clientsClaim, defaultCache, navigationPreload)
- [ ] `next.config.ts` wrapped with `withSerwistInit()` — swSrc: "src/app/sw.ts", swDest: "public/sw.js"
- [ ] Web app manifest with Obsidian Deep colors (#0e0e10 background, #c0c1ff theme_color)
- [ ] Manifest references existing icons: public/logo.png (512x512) and public/logo.svg
- [ ] `pnpm build` succeeds — build output shows SW compilation step
- [ ] `pnpm test` passes — all 498+ existing tests green
- [ ] No regressions in BUILD_MODE=export — SW config must not break the ignore-loader pattern

## Verification

- `pnpm build` succeeds with SW compilation step in output
- `pnpm test` — all 498+ tests pass
- `grep -q 'withSerwist' next.config.ts` — confirms Serwist wrapper applied
- Build output includes `public/sw.js` or equivalent compiled service worker

## Observability Impact

- Signals added/changed: Service worker registration status logged to browser console on page load
- How a future agent inspects this: Chrome DevTools > Application > Service Workers shows registration state and cached assets
- Failure state exposed: SW registration failures appear as console errors; build failures show missing SW compilation step

## Inputs

- `next.config.ts` — current Next.js config to be wrapped with Serwist
- `src/app/layout.tsx` — root layout where PWA metadata is added
- `src/app/providers.tsx` — client providers where SerwistProvider may be added
- `_archive/src-v0/app/sw.ts` — old v0 service worker pattern to copy
- `public/logo.png` — 512x512 PNG icon for manifest
- `public/logo.svg` — SVG icon for manifest

## Expected Output

- `src/app/sw.ts` — service worker entry point with precache + runtime caching
- `src/app/manifest.ts` — web app manifest with Obsidian Deep theme colors
- `src/app/layout.tsx` — updated with PWA metadata (themeColor, appleWebApp, icons)
- `src/app/providers.tsx` — SerwistProvider wrapping (if supported by installed version)
- `next.config.ts` — wrapped with withSerwistInit()
