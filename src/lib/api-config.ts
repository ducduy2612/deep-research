/**
 * Shared provider and search configuration helpers for API routes.
 *
 * Extracted from route files to keep them under the 300-line limit
 * and to avoid duplicating default model lists.
 */

import { env } from "@/lib/env";
import type { ProviderConfig } from "@/engine/provider/types";
import type { SearchProviderConfig } from "@/engine/search/types";

// ---------------------------------------------------------------------------
// Model override helpers
// ---------------------------------------------------------------------------

/**
 * Apply env-based model ID overrides to a model list.
 * Only used in proxy mode — local mode uses user-selected model IDs from the client.
 */
function applyModelOverrides(
  models: ProviderConfig["models"]
): ProviderConfig["models"] {
  return models.map((m) => {
    if (m.role === "thinking" && env.MCP_THINKING_MODEL) {
      return { ...m, id: env.MCP_THINKING_MODEL, name: env.MCP_THINKING_MODEL };
    }
    if (m.role === "networking" && env.MCP_TASK_MODEL) {
      return { ...m, id: env.MCP_TASK_MODEL, name: env.MCP_TASK_MODEL };
    }
    return m;
  });
}

// ---------------------------------------------------------------------------
// Default model lists
// ---------------------------------------------------------------------------

export const DEFAULT_GOOGLE_MODELS: ProviderConfig["models"] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    role: "thinking",
    capabilities: {
      reasoning: true,
      searchGrounding: true,
      structuredOutput: true,
      maxTokens: 65536,
    },
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    role: "networking",
    capabilities: {
      reasoning: false,
      searchGrounding: true,
      structuredOutput: true,
      maxTokens: 8192,
    },
  },
];

export const DEFAULT_OPENAI_MODELS: ProviderConfig["models"] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    role: "thinking",
    capabilities: {
      reasoning: true,
      searchGrounding: false,
      structuredOutput: true,
      maxTokens: 16384,
    },
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    role: "networking",
    capabilities: {
      reasoning: false,
      searchGrounding: false,
      structuredOutput: true,
      maxTokens: 8192,
    },
  },
];

// ---------------------------------------------------------------------------
// Provider config builder
// ---------------------------------------------------------------------------

export function buildProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    configs.push({
      id: "google",
      apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      ...(env.GOOGLE_GENERATIVE_AI_API_BASE_URL && {
        baseURL: env.GOOGLE_GENERATIVE_AI_API_BASE_URL,
      }),
      models: applyModelOverrides(DEFAULT_GOOGLE_MODELS),
    });
  }

  if (env.OPENAI_API_KEY) {
    configs.push({
      id: "openai",
      apiKey: env.OPENAI_API_KEY,
      ...(env.OPENAI_API_BASE_URL && {
        baseURL: env.OPENAI_API_BASE_URL,
      }),
      models: applyModelOverrides(DEFAULT_OPENAI_MODELS),
    });
  }

  return configs;
}

// ---------------------------------------------------------------------------
// Search provider auto-detection
// ---------------------------------------------------------------------------

export function detectSearchProviderConfig(): SearchProviderConfig | undefined {
  if (env.TAVILY_API_KEY) {
    return {
      id: "tavily",
      apiKey: env.TAVILY_API_KEY,
      ...(env.TAVILY_API_BASE_URL && { baseURL: env.TAVILY_API_BASE_URL }),
    };
  }
  if (env.FIRECRAWL_API_KEY) {
    return {
      id: "firecrawl",
      apiKey: env.FIRECRAWL_API_KEY,
      ...(env.FIRECRAWL_API_BASE_URL && { baseURL: env.FIRECRAWL_API_BASE_URL }),
    };
  }
  if (env.EXA_API_KEY) {
    return {
      id: "exa",
      apiKey: env.EXA_API_KEY,
      ...(env.EXA_API_BASE_URL && { baseURL: env.EXA_API_BASE_URL }),
    };
  }
  if (env.BRAVE_API_KEY) {
    return {
      id: "brave",
      apiKey: env.BRAVE_API_KEY,
      ...(env.BRAVE_API_BASE_URL && { baseURL: env.BRAVE_API_BASE_URL }),
    };
  }
  if (env.SEARXNG_API_BASE_URL) {
    return { id: "searxng", baseURL: env.SEARXNG_API_BASE_URL };
  }

  return undefined;
}
