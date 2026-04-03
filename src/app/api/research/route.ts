import { z } from "zod";
import { streamText } from "ai";

import { env } from "@/lib/env";
import { createRegistry, resolveModel } from "@/engine/provider";
import type { ProviderConfig } from "@/engine/provider";

// ---------------------------------------------------------------------------
// Default model lists
// ---------------------------------------------------------------------------

const DEFAULT_GOOGLE_MODELS: ProviderConfig["models"] = [
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
];

const DEFAULT_OPENAI_MODELS: ProviderConfig["models"] = [
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
];

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  modelId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .min(1),
});

// ---------------------------------------------------------------------------
// Helper: build provider configs from env
// ---------------------------------------------------------------------------

function buildProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    configs.push({
      id: "google",
      apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      ...(env.GOOGLE_GENERATIVE_AI_API_BASE_URL && {
        baseURL: env.GOOGLE_GENERATIVE_AI_API_BASE_URL,
      }),
      models: DEFAULT_GOOGLE_MODELS,
    });
  }

  if (env.OPENAI_API_KEY) {
    configs.push({
      id: "openai",
      apiKey: env.OPENAI_API_KEY,
      ...(env.OPENAI_API_BASE_URL && {
        baseURL: env.OPENAI_API_BASE_URL,
      }),
      models: DEFAULT_OPENAI_MODELS,
    });
  }

  return configs;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        isError: true,
        code: "VALIDATION_FAILED",
        message: "Invalid JSON in request body",
      },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        isError: true,
        code: "VALIDATION_FAILED",
        message: "Invalid request body",
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { modelId, messages } = parsed.data;

  // 2. Build registry from env
  const configs = buildProviderConfigs();

  if (configs.length === 0) {
    return Response.json(
      {
        isError: true,
        code: "CONFIG_MISSING_KEY",
        message: "No AI providers configured. Set GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY.",
      },
      { status: 500 },
    );
  }

  const registry = createRegistry(configs);

  // 3. Resolve model
  let model;
  try {
    model = resolveModel(registry, modelId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown model resolution error";
    return Response.json(
      { isError: true, code: "AI_REQUEST_FAILED", message },
      { status: 500 },
    );
  }

  // 4. Stream response — forward abort signal from the HTTP request
  try {
    const result = streamText({
      model,
      messages,
      abortSignal: request.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown streaming error";
    return Response.json(
      { isError: true, code: "AI_REQUEST_FAILED", message },
      { status: 500 },
    );
  }
}
