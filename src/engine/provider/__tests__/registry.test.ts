import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be before any import that references the mocked modules
// ---------------------------------------------------------------------------

const mockProviderInstances: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => {
    const call = vi.fn().mockReturnValue({ __type: "language-model" });
    const provider = function (modelId: string) {
      return call(modelId);
    };
    provider.languageModel = call;
    provider.__type = "google-provider";
    mockProviderInstances["google"] = { call, provider } as never;
    return provider;
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn((opts: Record<string, unknown>) => {
    const id = (opts as { name?: string }).name ?? "openai";
    const chat = vi.fn().mockReturnValue({ __type: "chat-language-model" });
    const provider = { languageModel: vi.fn(), chat, __type: "openai-provider" };
    mockProviderInstances[id] = { chat, provider } as never;
    return provider;
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (resolved after mocks)
// ---------------------------------------------------------------------------

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { createRegistry, resolveModel, getDefaultModel } from "../registry";
import type { ProviderConfig } from "../index";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const googleConfig: ProviderConfig = {
  id: "google",
  apiKey: "google-key",
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
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      role: "networking",
      capabilities: {
        reasoning: false,
        searchGrounding: true,
        structuredOutput: true,
        maxOutputTokens: 8192,
      },
    },
  ],
};

const openaiConfig: ProviderConfig = {
  id: "openai",
  apiKey: "openai-key",
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
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      role: "networking",
      capabilities: {
        reasoning: false,
        searchGrounding: false,
        structuredOutput: true,
        maxOutputTokens: 8192,
      },
    },
  ],
};

const configs = [googleConfig, openaiConfig];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createRegistry --------------------------------------------------------

describe("createRegistry", () => {
  it("creates a registry with Google + OpenAI providers", () => {
    const registry = createRegistry(configs);

    expect(registry.providers).toHaveProperty("google");
    expect(registry.providers).toHaveProperty("openai");
    expect(Object.keys(registry.providers)).toHaveLength(2);
    expect(registry).toBeDefined();
  });

  it("creates an empty registry with empty array", () => {
    const registry = createRegistry([]);

    expect(Object.keys(registry.providers)).toHaveLength(0);
    expect(registry).toBeDefined();
  });

  it("stores the original configs", () => {
    const registry = createRegistry(configs);

    expect(registry.configs).toBe(configs);
  });

  it("logs registry creation with provider count and ids", () => {
    createRegistry(configs);

    expect(logger.info).toHaveBeenCalledWith("Registry created", {
      providerCount: 2,
      providers: ["google", "openai"],
    });
  });

  it("propagates AppError when factory fails", () => {
    (createGoogleGenerativeAI as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => {
        throw new Error("SDK init failed");
      },
    );

    expect(() => createRegistry([googleConfig])).toThrow(AppError);

    try {
      createRegistry([googleConfig]);
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("google");
    }
  });
});

// --- resolveModel ----------------------------------------------------------

describe("resolveModel", () => {
  it("resolves a Google model via provider function call", () => {
    const registry = createRegistry(configs);
    const model = resolveModel(registry, "google:gemini-2.5-pro");

    expect(model).toBeDefined();
    // Google provider is called as a function
    expect(mockProviderInstances["google"].call).toHaveBeenCalledWith("gemini-2.5-pro");
    expect(logger.debug).toHaveBeenCalledWith("Model resolved", {
      modelString: "google:gemini-2.5-pro",
    });
  });

  it("resolves an OpenAI model via provider.chat()", () => {
    const registry = createRegistry(configs);
    const model = resolveModel(registry, "openai:gpt-4o");

    expect(model).toBeDefined();
    // OpenAI-compatible providers use .chat() not the default Responses API
    expect(mockProviderInstances["openai"].chat).toHaveBeenCalledWith("gpt-4o");
    expect(logger.debug).toHaveBeenCalledWith("Model resolved", {
      modelString: "openai:gpt-4o",
    });
  });

  it("throws AppError for unknown provider", () => {
    const registry = createRegistry(configs);

    expect(() => resolveModel(registry, "anthropic:claude-3")).toThrow(AppError);

    try {
      resolveModel(registry, "anthropic:claude-3");
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.context).toHaveProperty("modelString", "anthropic:claude-3");
    }
  });

  it("throws AppError for malformed string with no colon", () => {
    const registry = createRegistry(configs);

    expect(() => resolveModel(registry, "noprovider")).toThrow(AppError);

    try {
      resolveModel(registry, "noprovider");
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("noprovider");
    }
  });
});

// --- getDefaultModel -------------------------------------------------------

describe("getDefaultModel", () => {
  it("returns the default thinking model for a provider", () => {
    const registry = createRegistry(configs);
    const model = getDefaultModel(registry, configs, "google", "thinking");

    expect(model).toBeDefined();
  });

  it("returns the default networking model for a provider", () => {
    const registry = createRegistry(configs);
    const model = getDefaultModel(registry, configs, "openai", "networking");

    expect(model).toBeDefined();
    // OpenAI-compatible → resolved via .chat()
    expect(mockProviderInstances["openai"].chat).toHaveBeenCalledWith("gpt-4o-mini");
  });

  it("throws AppError when provider is not in configs", () => {
    const registry = createRegistry(configs);

    expect(() =>
      getDefaultModel(registry, configs, "deepseek" as never, "thinking"),
    ).toThrow(AppError);

    try {
      getDefaultModel(registry, configs, "deepseek" as never, "thinking");
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("deepseek");
    }
  });

  it("throws AppError when no model matches the role", () => {
    const registry = createRegistry(configs);

    // googleConfig has both thinking and networking, so create a config
    // with only thinking models and ask for networking
    const thinkingOnly: ProviderConfig = {
      id: "openai",
      apiKey: "key",
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

    expect(() =>
      getDefaultModel(registry, [thinkingOnly], "openai", "networking"),
    ).toThrow(AppError);

    try {
      getDefaultModel(registry, [thinkingOnly], "openai", "networking");
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("networking");
    }
  });
});

// --- Barrel export ---------------------------------------------------------

describe("barrel export", () => {
  it("exports all public types and functions", async () => {
    const mod = await import("../index");

    // Types are type-only exports, so we check the runtime values
    const expectedFunctions = [
      "OPENAI_COMPATIBLE_IDS",
      "modelCapabilitiesSchema",
      "providerModelConfigSchema",
      "providerConfigSchema",
      "stepModelMapSchema",
      "isOpenAICompatible",
      "getModelsByRole",
      "createGoogleProvider",
      "createOpenAICompatibleProvider",
      "createProvider",
      "createRegistry",
      "resolveModel",
      "getDefaultModel",
    ];

    for (const name of expectedFunctions) {
      expect(mod, `Expected '${name}' to be exported`).toHaveProperty(name);
    }
  });
});
