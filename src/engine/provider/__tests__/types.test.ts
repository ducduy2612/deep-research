import { describe, it, expect } from "vitest";
import {
  providerConfigSchema,
  stepModelMapSchema,
  isOpenAICompatible,
  getModelsByRole,
  type ProviderConfig,
  type ProviderId,
} from "../types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const googleConfig: ProviderConfig = {
  id: "google",
  apiKey: "test-google-key",
  models: [
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      role: "thinking",
      capabilities: {
        reasoning: true,
        searchGrounding: true,
        structuredOutput: true,
        maxOutputTokens: 65536,
      },
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      role: "networking",
      capabilities: {
        reasoning: false,
        searchGrounding: true,
        structuredOutput: true,
        maxOutputTokens: 65536,
      },
    },
  ],
};

const openaiConfig: ProviderConfig = {
  id: "openai",
  apiKey: "test-openai-key",
  baseURL: "https://api.openai.com/v1",
  models: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      role: "thinking",
      capabilities: {
        reasoning: true,
        searchGrounding: false,
        structuredOutput: true,
        maxOutputTokens: 16384,
      },
    },
  ],
};

const deepseekConfig: ProviderConfig = {
  id: "deepseek",
  apiKey: "test-deepseek-key",
  baseURL: "https://api.deepseek.com",
  models: [
    {
      id: "deepseek-r1",
      name: "DeepSeek R1",
      role: "thinking",
      capabilities: {
        reasoning: true,
        searchGrounding: false,
        structuredOutput: false,
        maxOutputTokens: 8192,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// ProviderConfig schema
// ---------------------------------------------------------------------------

describe("providerConfigSchema", () => {
  it("validates a valid Google provider config", () => {
    const result = providerConfigSchema.safeParse(googleConfig);
    expect(result.success).toBe(true);
  });

  it("validates a valid OpenAI-compatible provider config with baseURL", () => {
    const result = providerConfigSchema.safeParse(openaiConfig);
    expect(result.success).toBe(true);
  });

  it("validates a valid DeepSeek provider config", () => {
    const result = providerConfigSchema.safeParse(deepseekConfig);
    expect(result.success).toBe(true);
  });

  it("rejects config with missing id", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...noId } = googleConfig;
    const result = providerConfigSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it("rejects config with missing apiKey", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey: _apiKey, ...noKey } = googleConfig;
    const result = providerConfigSchema.safeParse(noKey);
    expect(result.success).toBe(false);
  });

  it("rejects config with invalid ProviderId", () => {
    const result = providerConfigSchema.safeParse({
      ...googleConfig,
      id: "anthropic",
    });
    expect(result.success).toBe(false);
  });

  it("rejects config with empty models array", () => {
    const result = providerConfigSchema.safeParse({
      ...googleConfig,
      models: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects config with invalid baseURL", () => {
    const result = providerConfigSchema.safeParse({
      ...googleConfig,
      baseURL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StepModelMap schema
// ---------------------------------------------------------------------------

describe("stepModelMapSchema", () => {
  it("validates a partial step model map", () => {
    const map = {
      clarify: { providerId: "google", modelId: "gemini-2.5-flash" },
      search: { providerId: "openai", modelId: "gpt-4o" },
    };
    const result = stepModelMapSchema.safeParse(map);
    expect(result.success).toBe(true);
  });

  it("validates a full step model map", () => {
    const map = {
      clarify: { providerId: "google", modelId: "gemini-2.5-flash" },
      plan: { providerId: "google", modelId: "gemini-2.5-pro" },
      search: { providerId: "openai", modelId: "gpt-4o" },
      analyze: { providerId: "deepseek", modelId: "deepseek-r1" },
      review: { providerId: "google", modelId: "gemini-2.5-pro" },
      report: { providerId: "google", modelId: "gemini-2.5-pro" },
    };
    const result = stepModelMapSchema.safeParse(map);
    expect(result.success).toBe(true);
  });

  it("validates an empty map", () => {
    const result = stepModelMapSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid provider ID in step mapping", () => {
    const map = {
      search: { providerId: "anthropic", modelId: "claude-3" },
    };
    const result = stepModelMapSchema.safeParse(map);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isOpenAICompatible
// ---------------------------------------------------------------------------

describe("isOpenAICompatible", () => {
  const compatibleIds: ProviderId[] = [
    "openai",
    "deepseek",
    "openrouter",
    "groq",
    "xai",
  ];

  it.each(compatibleIds)("returns true for '%s'", (id) => {
    expect(isOpenAICompatible(id)).toBe(true);
  });

  it("returns false for 'google'", () => {
    expect(isOpenAICompatible("google")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getModelsByRole
// ---------------------------------------------------------------------------

describe("getModelsByRole", () => {
  it("returns only thinking models", () => {
    const result = getModelsByRole(googleConfig, "thinking");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gemini-2.5-pro");
  });

  it("returns only networking models", () => {
    const result = getModelsByRole(googleConfig, "networking");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gemini-2.5-flash");
  });

  it("returns empty array when no models match the role", () => {
    const result = getModelsByRole(openaiConfig, "networking");
    expect(result).toHaveLength(0);
  });
});
