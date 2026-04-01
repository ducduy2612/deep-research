---
estimated_steps: 31
estimated_files: 5
skills_used: []
---

# T01: Search types, domain filtering, and expanded SearchProvider interface

Create the search module's type foundation and utility layer:

1. Create `src/engine/search/types.ts`:
   - `SearchProviderId` union type: 'tavily' | 'firecrawl' | 'exa' | 'brave' | 'searxng' | 'model-native'
   - `SearchProviderConfig` interface: `{ id: SearchProviderId; apiKey?: string; baseURL?: string; scope?: string; maxResults?: number }`
   - `SearchProviderCallOptions` interface: `{ abortSignal?: AbortSignal; maxResults?: number; scope?: string; includeDomains?: string[]; excludeDomains?: string[]; includeImages?: boolean }`
   - `SearchProviderResult` interface: `{ sources: Source[]; images: ImageSource[] }`
   - Zod schema for SearchProviderConfig

2. Create `src/engine/search/domain-filter.ts` — port from `_archive/src-v0/hooks/useWebSearch.ts` lines 1-50:
   - `normalizeDomain(input: string)` — strip protocol, www, wildcards, port, path
   - `parseDomainList(value: string)` — split on whitespace/comma/newline, normalize each
   - `matchDomain(hostname: string, domain: string)` — exact or subdomain match
   - `isUrlAllowed(url: string, includeDomains: string[], excludeDomains: string[])` — exclude takes precedence
   - `applyDomainFilters(result: SearchProviderResult, includeDomains: string[], excludeDomains: string[])` — filter both sources and images

3. Create `src/engine/search/citation-images.ts`:
   - `filterCitationImages(result: SearchProviderResult, enabled: boolean)` — returns empty images array when disabled, passthrough when enabled

4. Update `src/engine/research/search-provider.ts`:
   - Expand `SearchProvider` interface to accept optional `SearchProviderCallOptions`
   - Keep backward compatibility — `search(query: string, options?: SearchProviderCallOptions)`
   - Update `NoOpSearchProvider` to accept (and ignore) options
   - Import `SearchProviderCallOptions` and `SearchProviderResult` from search types

5. Create `src/engine/search/__tests__/domain-filter.test.ts`:
   - Test normalizeDomain with various inputs (http, https, www, wildcards, ports, paths)
   - Test parseDomainList with comma-separated, newline-separated, whitespace-separated, empty
   - Test matchDomain with exact match, subdomain match, non-match
   - Test isUrlAllowed with include-only, exclude-only, both, neither
   - Test applyDomainFilters filters both sources and images, exclude takes precedence
   - Test filterCitationImages toggle behavior

Constraints:
- Import Source and ImageSource from `src/engine/research/types.ts` (they already exist)
- Do NOT move Source/ImageSource types — they stay in research/types.ts
- SearchProviderCallOptions is defined in search/types.ts and imported by research/search-provider.ts

## Inputs

- `src/engine/research/types.ts`
- `src/engine/research/search-provider.ts`
- `_archive/src-v0/hooks/useWebSearch.ts`

## Expected Output

- `src/engine/search/types.ts`
- `src/engine/search/domain-filter.ts`
- `src/engine/search/citation-images.ts`
- `src/engine/research/search-provider.ts`
- `src/engine/search/__tests__/domain-filter.test.ts`

## Verification

pnpm vitest run src/engine/search/__tests__/domain-filter.test.ts && pnpm vitest run src/engine/research/__tests__/types.test.ts && pnpm build
