/**
 * Research engine barrel export.
 *
 * Public API surface for the research module — types, prompts, search
 * provider interface, and the orchestrator.
 */

// Types
export type {
  ResearchState,
  Source,
  ImageSource,
  SearchTask,
  SearchResult,
  ReportStyle,
  ReportLength,
  PromptOverrideKey,
  PromptOverrides,
  ResearchConfig,
  ResearchEventMap,
  ResearchEventType,
  ResearchResult,
  ClarifyResult,
  PlanResult,
  ResearchPhaseResult,
  ReportResult,
} from "./types";

export {
  sourceSchema,
  imageSourceSchema,
  searchTaskSchema,
  researchConfigSchema,
} from "./types";

// Search provider
export type { SearchProvider } from "./search-provider";
export { NoOpSearchProvider } from "./search-provider";

// Prompts
export {
  getSystemPrompt,
  getClarifyPrompt,
  getPlanPrompt,
  getPlanWithContextPrompt,
  getSerpQueriesPrompt,
  getAnalyzePrompt,
  getSearchResultPrompt,
  getReviewPrompt,
  getReportPrompt,
  getOutputGuidelinesPrompt,
  DEFAULT_PROMPTS,
  resolvePrompt,
} from "./prompts";

// Orchestrator
export { ResearchOrchestrator } from "./orchestrator";

// Search module convenience re-exports
export type {
  SearchProviderId,
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";

export { createSearchProvider } from "@/engine/search/factory";
export {
  normalizeDomain,
  parseDomainList,
  matchDomain,
  isUrlAllowed,
  applyDomainFilters,
} from "@/engine/search/domain-filter";
export { filterCitationImages } from "@/engine/search/citation-images";
