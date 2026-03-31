/**
 * Search engine barrel export.
 *
 * Public API surface for the search module — types, provider classes,
 * factory, domain filtering, and citation images.
 */

// Types
export type {
  SearchProviderId,
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "./types";

export { searchProviderConfigSchema } from "./types";

// Provider classes
export { TavilyProvider } from "./providers/tavily";
export { FirecrawlProvider } from "./providers/firecrawl";
export { ExaProvider } from "./providers/exa";
export { BraveProvider } from "./providers/brave";
export { SearXNGProvider } from "./providers/searxng";
export { ModelNativeSearchProvider } from "./providers/model-native";
export type { ModelNativeSearchProviderOptions } from "./providers/model-native";

// Factory
export { createSearchProvider } from "./factory";

// Domain filtering
export {
  normalizeDomain,
  parseDomainList,
  matchDomain,
  isUrlAllowed,
  applyDomainFilters,
} from "./domain-filter";

// Citation images
export { filterCitationImages } from "./citation-images";

// Re-export SearchProvider interface + NoOp for convenience
export type { SearchProvider } from "@/engine/research/search-provider";
export { NoOpSearchProvider } from "@/engine/research/search-provider";
