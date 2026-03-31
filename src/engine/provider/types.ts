import { z } from "zod";

// ---------------------------------------------------------------------------
// Provider identity
// ---------------------------------------------------------------------------

/** Union of all supported provider IDs. */
export type ProviderId =
  | "google"
  | "openai"
  | "deepseek"
  | "openrouter"
  | "groq"
  | "xai";

/** Provider IDs that use the OpenAI-compatible API layer. */
export const OPENAI_COMPATIBLE_IDS: readonly ProviderId[] = [
  "openai",
  "deepseek",
  "openrouter",
  "groq",
  "xai",
] as const;

// ---------------------------------------------------------------------------
// Model role & research steps
// ---------------------------------------------------------------------------

/** Whether a model is used for deep reasoning or fast networking calls. */
export type ModelRole = "thinking" | "networking";

/** Steps in the research pipeline — each can be mapped to a model. */
export type ResearchStep =
  | "clarify"
  | "plan"
  | "search"
  | "analyze"
  | "review"
  | "report";

// ---------------------------------------------------------------------------
// Capability & model config
// ---------------------------------------------------------------------------

/** Capabilities a model may support. */
export interface ModelCapabilities {
  reasoning: boolean;
  searchGrounding: boolean;
  structuredOutput: boolean;
  maxTokens: number;
}

/** A single model within a provider. */
export interface ProviderModelConfig {
  id: string;
  name: string;
  role: ModelRole;
  capabilities: ModelCapabilities;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

/** Full configuration for a single provider instance. */
export interface ProviderConfig {
  id: ProviderId;
  apiKey: string;
  baseURL?: string;
  models: ProviderModelConfig[];
}

// ---------------------------------------------------------------------------
// Step-to-model mapping
// ---------------------------------------------------------------------------

/** Maps each research step to a specific provider + model. */
export type StepModelMap = Partial<
  Record<ResearchStep, { providerId: ProviderId; modelId: string }>
>;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const modelCapabilitiesSchema = z.object({
  reasoning: z.boolean(),
  searchGrounding: z.boolean(),
  structuredOutput: z.boolean(),
  maxTokens: z.number().int().positive(),
});

export const providerModelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["thinking", "networking"]),
  capabilities: modelCapabilitiesSchema,
});

export const providerConfigSchema = z.object({
  id: z.enum(["google", "openai", "deepseek", "openrouter", "groq", "xai"]),
  apiKey: z.string().min(1),
  baseURL: z.string().url().optional(),
  models: z.array(providerModelConfigSchema).min(1),
});

const stepModelEntrySchema = z.object({
  providerId: z.enum([
    "google",
    "openai",
    "deepseek",
    "openrouter",
    "groq",
    "xai",
  ]),
  modelId: z.string().min(1),
});

/** Validates a StepModelMap — a partial record mapping research steps to models. */
export const stepModelMapSchema: z.ZodType<StepModelMap> = z
  .object({
    clarify: stepModelEntrySchema.optional(),
    plan: stepModelEntrySchema.optional(),
    search: stepModelEntrySchema.optional(),
    analyze: stepModelEntrySchema.optional(),
    review: stepModelEntrySchema.optional(),
    report: stepModelEntrySchema.optional(),
  })
  .catchall(
    z.never().describe("Only valid ResearchStep keys are allowed"),
  );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the provider uses the OpenAI-compatible API layer. */
export function isOpenAICompatible(id: ProviderId): boolean {
  return (OPENAI_COMPATIBLE_IDS as readonly string[]).includes(id);
}

/** Filters a provider's models by role. */
export function getModelsByRole(
  config: ProviderConfig,
  role: ModelRole,
): ProviderModelConfig[] {
  return config.models.filter((m) => m.role === role);
}
