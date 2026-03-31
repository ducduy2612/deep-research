import { z } from "zod";
import type { Source, ImageSource } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Provider identity
// ---------------------------------------------------------------------------

/** Unique identifier for each supported search provider. */
export type SearchProviderId =
  | "tavily"
  | "firecrawl"
  | "exa"
  | "brave"
  | "searxng"
  | "model-native";

// ---------------------------------------------------------------------------
// Provider configuration (stored in settings, passed to factory)
// ---------------------------------------------------------------------------

/** Configuration for instantiating a search provider. */
export interface SearchProviderConfig {
  id: SearchProviderId;
  apiKey?: string;
  baseURL?: string;
  scope?: string;
  maxResults?: number;
}

// ---------------------------------------------------------------------------
// Per-call options (passed at invocation time)
// ---------------------------------------------------------------------------

/** Options supplied per individual search call. */
export interface SearchProviderCallOptions {
  abortSignal?: AbortSignal;
  maxResults?: number;
  scope?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  includeImages?: boolean;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/** Uniform result shape returned by every search provider. */
export interface SearchProviderResult {
  sources: Source[];
  images: ImageSource[];
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const searchProviderConfigSchema = z.object({
  id: z.enum([
    "tavily",
    "firecrawl",
    "exa",
    "brave",
    "searxng",
    "model-native",
  ]),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  scope: z.string().optional(),
  maxResults: z.number().int().min(1).optional(),
});
