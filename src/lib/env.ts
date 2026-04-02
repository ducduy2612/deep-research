import { z } from "zod";

const envSchema = z.object({
  // Server-only env vars (Phase 8 proxy mode)
  ACCESS_PASSWORD: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_BASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_BASE_URL: z.string().url().optional(),

  // Search provider keys (Phase 4)
  TAVILY_API_KEY: z.string().optional(),
  TAVILY_API_BASE_URL: z.string().url().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  FIRECRAWL_API_BASE_URL: z.string().url().optional(),
  EXA_API_KEY: z.string().optional(),
  EXA_API_BASE_URL: z.string().url().optional(),
  BRAVE_API_KEY: z.string().optional(),
  BRAVE_API_BASE_URL: z.string().url().optional(),
  SEARXNG_API_BASE_URL: z.string().url().optional(),

  // Model overrides (proxy mode — server-side model selection)
  MCP_THINKING_MODEL: z.string().optional(),
  MCP_TASK_MODEL: z.string().optional(),

  // Client-exposed env vars
  NEXT_PUBLIC_DISABLED_AI_PROVIDER: z.string().optional(),
  NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER: z.string().optional(),
  NEXT_PUBLIC_MODEL_LIST: z.string().optional(),
  NEXT_PUBLIC_VERSION: z.string().optional(),
  NEXT_PUBLIC_BUILD_MODE: z.enum(["export", "standalone"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "[env] Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Invalid environment variables. Check console for details."
    );
  }
  return parsed.data;
}

/** Validated environment variables. Evaluated once at import time. */
export const env = loadEnv();
