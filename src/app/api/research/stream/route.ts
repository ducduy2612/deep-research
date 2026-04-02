/**
 * SSE API route for research streaming — POST /api/research/stream
 *
 * Instantiates ResearchOrchestrator server-side with real SearchProvider
 * from env, subscribes to all orchestrator events, and streams them as
 * Server-Sent Events (SSE) to the client.
 *
 * - Handles abort via `request.signal`
 * - Builds provider configs + registry from env vars at request time
 * - Applies domain filters + citation images post-search
 */

import { z } from "zod";

import { logger } from "@/lib/logger";
import { toAppError } from "@/lib/errors";
import {
  buildProviderConfigs,
  detectSearchProviderConfig,
} from "@/lib/api-config";

import { ResearchOrchestrator } from "@/engine/research/orchestrator";
import type {
  ResearchConfig,
  ResearchEventType,
} from "@/engine/research/types";
import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import { searchProviderConfigSchema } from "@/engine/search/types";
import { createSearchProvider } from "@/engine/search/factory";
import { applyDomainFilters } from "@/engine/search/domain-filter";
import { filterCitationImages } from "@/engine/search/citation-images";
import { createRegistry } from "@/engine/provider/registry";
import type { ProviderConfig, ProviderId } from "@/engine/provider/types";
import { DEFAULT_GOOGLE_MODELS, DEFAULT_OPENAI_MODELS } from "@/lib/api-config";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const streamRequestSchema = z.object({
  topic: z.string().min(1),
  language: z.string().min(1).optional(),
  reportStyle: z
    .enum(["balanced", "executive", "technical", "concise"])
    .optional(),
  reportLength: z.enum(["brief", "standard", "comprehensive"]).optional(),
  autoReviewRounds: z.number().int().min(0).optional(),
  maxSearchQueries: z.number().int().min(1).optional(),
  stepModelMap: z.record(z.string(), z.unknown()).optional(),
  promptOverrides: z.record(z.string(), z.string()).optional(),
  // Local mode: client sends provider keys from browser settings.
  // Proxy mode: omitted — server uses env vars instead.
  providers: z.array(z.object({
    id: z.string(),
    apiKey: z.string().min(1),
    baseURL: z.string().optional(),
    thinkingModelId: z.string().optional(),
    networkingModelId: z.string().optional(),
  })).optional(),
  search: z
    .object({
      provider: searchProviderConfigSchema.optional(),
      includeDomains: z.array(z.string()).optional(),
      excludeDomains: z.array(z.string()).optional(),
      citationImages: z.boolean().optional(),
    })
    .optional(),
});

type StreamRequest = z.infer<typeof streamRequestSchema>;

// ---------------------------------------------------------------------------
// Decorating search provider
// ---------------------------------------------------------------------------

class FilteringSearchProvider implements SearchProvider {
  constructor(
    private readonly inner: SearchProvider,
    private readonly includeDomains: string[],
    private readonly excludeDomains: string[],
    private readonly citationImages: boolean,
  ) {}

  async search(
    query: string,
    options?: SearchProviderCallOptions,
  ): Promise<SearchProviderResult> {
    const raw = await this.inner.search(query, options);
    const filtered = applyDomainFilters(
      raw,
      this.includeDomains,
      this.excludeDomains,
    );
    return filterCitationImages(filtered, this.citationImages);
  }
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseError(code: string, message: string): string {
  return sseEvent("error", { code, message });
}

function sseErrorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return new Response(sseError(code, message), {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

// ---------------------------------------------------------------------------
// Build search provider
// ---------------------------------------------------------------------------

function buildSearchProvider(
  req: StreamRequest,
  providerConfigs: ResearchConfig["providerConfigs"],
  registry: ReturnType<typeof createRegistry>,
): SearchProvider {
  const includeDomains = req.search?.includeDomains ?? [];
  const excludeDomains = req.search?.excludeDomains ?? [];
  const citationImages = req.search?.citationImages ?? true;
  const searchConfig = req.search?.provider ?? detectSearchProviderConfig();

  const base = searchConfig
    ? createSearchProvider(searchConfig, providerConfigs[0], registry)
    : { search: async () => ({ sources: [], images: [] }) };

  if (searchConfig) {
    logger.info("Search provider created", {
      providerId: searchConfig.id,
      includeDomains,
      excludeDomains,
    });
  } else {
    logger.info("No search provider configured — using no-op fallback");
  }

  return new FilteringSearchProvider(
    base,
    includeDomains,
    excludeDomains,
    citationImages,
  );
}

// ---------------------------------------------------------------------------
// Build provider configs from client-sent keys (local mode)
// ---------------------------------------------------------------------------

/** Default models for provider IDs sent by the client. */
const CLIENT_PROVIDER_MODELS: Record<string, ProviderConfig["models"]> = {
  google: DEFAULT_GOOGLE_MODELS,
  openai: DEFAULT_OPENAI_MODELS,
  // OpenAI-compatible providers share the same model list
  deepseek: DEFAULT_OPENAI_MODELS,
  openrouter: DEFAULT_OPENAI_MODELS,
  groq: DEFAULT_OPENAI_MODELS,
  xai: DEFAULT_OPENAI_MODELS,
};

function buildClientProviderConfigs(
  providers: { id: string; apiKey: string; baseURL?: string; thinkingModelId?: string; networkingModelId?: string }[],
): ProviderConfig[] {
  return providers
    .filter((p) => CLIENT_PROVIDER_MODELS[p.id])
    .map((p) => {
      const defaultModels = CLIENT_PROVIDER_MODELS[p.id]!;
      const models = defaultModels.map((m) => {
        // Override model IDs if the client specified custom ones
        if (m.role === "thinking" && p.thinkingModelId) {
          return { ...m, id: p.thinkingModelId, name: p.thinkingModelId };
        }
        if (m.role === "networking" && p.networkingModelId) {
          return { ...m, id: p.networkingModelId, name: p.networkingModelId };
        }
        return m;
      });
      return {
        id: p.id as ProviderId,
        apiKey: p.apiKey,
        ...(p.baseURL && { baseURL: p.baseURL }),
        models,
      };
    });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  logger.info("SSE research stream request received");

  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sseErrorResponse(
      "VALIDATION_FAILED", "Invalid JSON in request body", 400,
    );
  }

  const parsed = streamRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return sseErrorResponse("VALIDATION_FAILED", `Invalid request: ${msg}`, 400);
  }

  const req = parsed.data;

  // 2. Provider configs — local mode uses client keys, proxy mode uses env
  const providerConfigs = req.providers && req.providers.length > 0
    ? buildClientProviderConfigs(req.providers)
    : buildProviderConfigs();
  if (providerConfigs.length === 0) {
    return sseErrorResponse(
      "CONFIG_MISSING_KEY",
      "No AI providers configured. Add an API key in Settings (local mode) or set GOOGLE_GENERATIVE_AI_API_KEY / OPENAI_API_KEY on the server (proxy mode).",
      500,
    );
  }

  // 3. Registry
  let registry: ReturnType<typeof createRegistry>;
  try {
    registry = createRegistry(providerConfigs);
  } catch (error) {
    return sseErrorResponse(
      "AI_REQUEST_FAILED",
      error instanceof Error ? error.message : "Registry creation failed",
      500,
    );
  }

  // 4. Search provider
  let searchProvider: SearchProvider;
  try {
    searchProvider = buildSearchProvider(req, providerConfigs, registry);
  } catch (error) {
    return sseErrorResponse(
      "AI_REQUEST_FAILED",
      error instanceof Error ? error.message : "Search provider creation failed",
      500,
    );
  }

  // 5. Research config
  const researchConfig: ResearchConfig = {
    topic: req.topic,
    providerConfigs,
    stepModelMap: (req.stepModelMap as ResearchConfig["stepModelMap"]) ?? {},
    language: req.language,
    reportStyle: req.reportStyle,
    reportLength: req.reportLength,
    autoReviewRounds: req.autoReviewRounds,
    maxSearchQueries: req.maxSearchQueries,
    promptOverrides: req.promptOverrides as ResearchConfig["promptOverrides"],
  };

  // 6. SSE stream
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) { controller = ctrl; },
  });

  // 7. Orchestrator + subscriptions
  const orchestrator = new ResearchOrchestrator(researchConfig, searchProvider);
  const eventTypes: ResearchEventType[] = [
    "step-start", "step-delta", "step-reasoning",
    "step-complete", "step-error", "progress",
  ];

  const unsubs = eventTypes.map((et) =>
    orchestrator.on(et, (payload) => {
      try {
        controller.enqueue(encoder.encode(sseEvent(et, payload)));
      } catch { /* stream closed */ }
    }),
  );

  // 8. Abort from client
  const onAbort = () => {
    logger.info("Abort signal received from client");
    orchestrator.abort();
  };
  request.signal.addEventListener("abort", onAbort);

  // 9. Run pipeline
  (async () => {
    try {
      logger.info("Starting research orchestrator", { topic: req.topic });
      controller.enqueue(encoder.encode(sseEvent("start", { topic: req.topic })));

      const result = await orchestrator.start();
      if (result) {
        controller.enqueue(encoder.encode(sseEvent("result", result)));
      }
      controller.enqueue(encoder.encode(sseEvent("done", {})));
      controller.close();
    } catch (error) {
      const err = toAppError(error, "RESEARCH_STEP_FAILED");
      logger.error("Research stream error", { code: err.code, message: err.message });
      try {
        controller.enqueue(encoder.encode(sseError(err.code, err.message)));
        controller.close();
      } catch { /* already closed */ }
    } finally {
      request.signal.removeEventListener("abort", onAbort);
      for (const u of unsubs) u();
      orchestrator.destroy();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
