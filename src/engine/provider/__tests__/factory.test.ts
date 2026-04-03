import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be before any import that references the mocked modules
// ---------------------------------------------------------------------------

const mockGoogleProvider = vi.fn();
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn((...args: unknown[]) => {
    mockGoogleProvider(...args);
    return { __type: "google-provider", languageModel: vi.fn() };
  }),
}));

const mockOpenAIProvider = vi.fn();
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn((...args: unknown[]) => {
    mockOpenAIProvider(...args);
    return { __type: "openai-provider", chat: vi.fn() };
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
import { createOpenAI } from "@ai-sdk/openai";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import {
  createGoogleProvider,
  createOpenAICompatibleProvider,
  createProvider,
} from "../factory";

import type { ProviderConfig } from "../types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const googleConfig: ProviderConfig = {
  id: "google",
  apiKey: "google-api-key-123",
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
  ],
};

const googleConfigWithBaseURL: ProviderConfig = {
  ...googleConfig,
  baseURL: "https://custom-google-proxy.example.com",
};

const openaiConfig: ProviderConfig = {
  id: "openai",
  apiKey: "openai-api-key-456",
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
  apiKey: "deepseek-key",
  baseURL: "https://api.deepseek.com/v1",
  models: [
    {
      id: "deepseek-reasoner",
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

const openrouterConfig: ProviderConfig = {
  id: "openrouter",
  apiKey: "openrouter-key",
  baseURL: "https://openrouter.ai/api/v1",
  models: [
    {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
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

const groqConfig: ProviderConfig = {
  id: "groq",
  apiKey: "groq-key",
  baseURL: "https://api.groq.com/openai/v1",
  models: [],
};

const xaiConfig: ProviderConfig = {
  id: "xai",
  apiKey: "xai-key",
  baseURL: "https://api.x.ai/v1",
  models: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createGoogleProvider --------------------------------------------------

describe("createGoogleProvider", () => {
  it("creates a Google provider with apiKey", () => {
    const provider = createGoogleProvider(googleConfig);

    expect(createGoogleGenerativeAI).toHaveBeenCalledOnce();
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "google-api-key-123",
    });
    expect(provider).toBeDefined();
    expect((provider as unknown as Record<string, string>).__type).toBe("google-provider");
  });

  it("passes baseURL when provided", () => {
    createGoogleProvider(googleConfigWithBaseURL);

    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "google-api-key-123",
      baseURL: "https://custom-google-proxy.example.com",
    });
  });

  it("omits baseURL when not provided", () => {
    createGoogleProvider(googleConfig);

    const callArgs = (createGoogleGenerativeAI as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty("baseURL");
  });

  it("logs provider creation with providerId and modelCount (never apiKey)", () => {
    createGoogleProvider(googleConfig);

    expect(logger.info).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("Provider created", {
      providerId: "google",
      modelCount: 1,
    });

    // Verify apiKey is never logged
    const logCall = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
    const dataArg = logCall[1] as Record<string, unknown>;
    expect(Object.values(dataArg)).not.toContain("google-api-key-123");
  });

  it("wraps errors as AppError with AI_REQUEST_FAILED", () => {
    (createGoogleGenerativeAI as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => {
        throw new Error("SDK init failed");
      },
    );

    expect(() => createGoogleProvider(googleConfig)).toThrow(AppError);

    try {
      createGoogleProvider(googleConfig);
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("google");
      expect(err.context).toHaveProperty("providerId", "google");
    }
  });
});

// --- createOpenAICompatibleProvider ----------------------------------------

describe("createOpenAICompatibleProvider", () => {
  it("creates an OpenAI provider with apiKey, baseURL, and name", () => {
    createOpenAICompatibleProvider(deepseekConfig);

    expect(createOpenAI).toHaveBeenCalledOnce();
    expect(createOpenAI).toHaveBeenCalledWith({
      apiKey: "deepseek-key",
      baseURL: "https://api.deepseek.com/v1",
      name: "deepseek",
    });
  });

  it("creates an OpenAI provider for openai without baseURL", () => {
    createOpenAICompatibleProvider(openaiConfig);

    expect(createOpenAI).toHaveBeenCalledWith({
      apiKey: "openai-api-key-456",
      name: "openai",
    });

    const callArgs = (createOpenAI as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty("baseURL");
  });

  it("logs provider creation without apiKey", () => {
    createOpenAICompatibleProvider(deepseekConfig);

    expect(logger.info).toHaveBeenCalledWith("Provider created", {
      providerId: "deepseek",
      modelCount: 1,
    });
  });

  it("wraps errors as AppError with AI_REQUEST_FAILED", () => {
    (createOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("bad config");
    });

    expect(() => createOpenAICompatibleProvider(openaiConfig)).toThrow(AppError);

    try {
      createOpenAICompatibleProvider(openaiConfig);
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("openai");
    }
  });

  it("handles non-Error throws", () => {
    (createOpenAI as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw "string error";
    });

    expect(() => createOpenAICompatibleProvider(openaiConfig)).toThrow(AppError);
  });
});

// --- createProvider (dispatcher) -------------------------------------------

describe("createProvider", () => {
  it("dispatches to Google factory for 'google' id", () => {
    const provider = createProvider(googleConfig);

    expect(createGoogleGenerativeAI).toHaveBeenCalledOnce();
    expect(createOpenAI).not.toHaveBeenCalled();
    expect((provider as unknown as Record<string, string>).__type).toBe("google-provider");
  });

  it("dispatches to OpenAI factory for 'openai' id", () => {
    const provider = createProvider(openaiConfig);

    expect(createOpenAI).toHaveBeenCalledOnce();
    expect(createGoogleGenerativeAI).not.toHaveBeenCalled();
    expect((provider as unknown as Record<string, string>).__type).toBe("openai-provider");
  });

  it("dispatches to OpenAI factory for 'deepseek' id", () => {
    createProvider(deepseekConfig);
    expect(createOpenAI).toHaveBeenCalledOnce();
    expect(createGoogleGenerativeAI).not.toHaveBeenCalled();
  });

  it("dispatches to OpenAI factory for 'openrouter' id", () => {
    createProvider(openrouterConfig);
    expect(createOpenAI).toHaveBeenCalledOnce();
  });

  it("dispatches to OpenAI factory for 'groq' id", () => {
    createProvider(groqConfig);
    expect(createOpenAI).toHaveBeenCalledOnce();
  });

  it("dispatches to OpenAI factory for 'xai' id", () => {
    createProvider(xaiConfig);
    expect(createOpenAI).toHaveBeenCalledOnce();
  });

  it("throws AppError for an unknown provider id", () => {
    // Bypass type checking to test defensive branch
    const badConfig = { ...openaiConfig, id: "unknown" as never };

    expect(() => createProvider(badConfig)).toThrow(AppError);

    try {
      createProvider(badConfig);
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_REQUEST_FAILED");
      expect(err.message).toContain("unknown");
    }
  });
});
