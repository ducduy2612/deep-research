// Types
export type {
  ProviderId,
  ModelRole,
  ResearchStep,
  ModelCapabilities,
  ProviderModelConfig,
  ProviderConfig,
  StepModelMap,
} from "./types";

export {
  OPENAI_COMPATIBLE_IDS,
  modelCapabilitiesSchema,
  providerModelConfigSchema,
  providerConfigSchema,
  stepModelMapSchema,
  isOpenAICompatible,
  getModelsByRole,
} from "./types";

// Factory
export {
  createGoogleProvider,
  createOpenAICompatibleProvider,
  createProvider,
} from "./factory";

// Registry
export type { ProviderRegistry } from "./registry";
export {
  createRegistry,
  resolveModel,
  getDefaultModel,
} from "./registry";

// Streaming
export type { StreamOptions, GenerateStructuredOptions } from "./streaming";
export {
  streamWithAbort,
  generateStructured,
} from "./streaming";
