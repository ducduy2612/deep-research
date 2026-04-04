/* eslint-disable max-lines */
/**
 * SSE API route for research streaming — POST /api/research/stream
 *
 * Supports multi-phase streaming via a `phase` parameter:
 * - `clarify`: Generate clarification questions
 * - `plan`: Generate research plan with Q&A context
 * - `research`: Execute search+analyze from a plan
 * - `report`: Generate report from learnings
 * - `full` (default): Full pipeline (backward compat)
 *
 * Each phase creates a ResearchOrchestrator, calls the appropriate method,
 * subscribes to events, and streams them as SSE with a phase-specific
 * result event before closing.
 */

// Route config — max out Vercel serverless function duration.
// Hobby: 10s, Pro: 60s, Enterprise: 300s. This requests the plan maximum.
export const maxDuration = 300;
export const runtime = "nodejs";

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
  Source,
  ImageSource,
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
import { enforceResearchAuth } from "@/lib/proxy-auth";

// ---------------------------------------------------------------------------
// Phase type
// ---------------------------------------------------------------------------

type Phase = "clarify" | "plan" | "research" | "report" | "full";

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const providerEntrySchema = z.object({
  id: z.string(),
  apiKey: z.string().min(1),
  baseURL: z.string().optional(),
  thinkingModelId: z.string().optional(),
  networkingModelId: z.string().optional(),
});

const searchSchema = z.object({
  provider: searchProviderConfigSchema.optional(),
  includeDomains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
  citationImages: z.boolean().optional(),
});

/** Base fields shared across all phases. */
const baseFieldsSchema = z.object({
  providers: z.array(providerEntrySchema).optional(),
  search: searchSchema.optional(),
  language: z.string().min(1).optional(),
  reportStyle: z
    .enum(["balanced", "executive", "technical", "concise"])
    .optional(),
  reportLength: z.enum(["brief", "standard", "comprehensive"]).optional(),
  autoReviewRounds: z.number().int().min(0).optional(),
  maxSearchQueries: z.number().int().min(1).optional(),
  stepModelMap: z.record(z.string(), z.unknown()).optional(),
  promptOverrides: z.record(z.string(), z.string()).optional(),
  localOnly: z.boolean().optional(),
});

/** Full schema: when `phase` is absent or "full". */
const fullSchema = baseFieldsSchema.extend({
  phase: z.enum(["full"]).optional(),
  topic: z.string().min(1),
});

/** Clarify phase schema. */
const clarifySchema = baseFieldsSchema.extend({
  phase: z.literal("clarify"),
  topic: z.string().min(1),
});

/** Plan phase schema. */
const planSchema = baseFieldsSchema.extend({
  phase: z.literal("plan"),
  topic: z.string().min(1),
  questions: z.string().min(1),
  feedback: z.string().min(1),
});

/** Research phase schema. */
const searchTaskSchema = z.object({
  query: z.string().min(1),
  researchGoal: z.string().min(1),
});

const researchSchema = baseFieldsSchema.extend({
  phase: z.literal("research"),
  plan: z.string().min(1),
  /** Pre-generated queries to run directly, skipping generateSerpQueries. */
  queries: z.array(searchTaskSchema).optional(),
});

/** Report phase schema. */
const reportSchema = baseFieldsSchema.extend({
  phase: z.literal("report"),
  plan: z.string().min(1),
  learnings: z.array(z.string()),
  sources: z.array(z.object({ url: z.string(), title: z.string().optional() })),
  images: z.array(z.object({ url: z.string(), description: z.string().nullable().optional() })),
  feedback: z.string().optional(),
});

const requestSchema = z.union([
  fullSchema,
  clarifySchema,
  planSchema,
  researchSchema,
  reportSchema,
]);

type PhaseRequest = z.infer<typeof requestSchema> & { phase: Phase };

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

/** SSE comment line — ignored by clients but keeps the connection alive. */
function sseHeartbeat(): string {
  return `: heartbeat ${Date.now()}\n\n`;
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
// Heartbeat manager — sends periodic SSE comments to keep Vercel function alive
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 15_000; // 15s — well under Vercel's idle detection

function startHeartbeat(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): () => void {
  const id = setInterval(() => {
    try {
      controller.enqueue(encoder.encode(sseHeartbeat()));
    } catch {
      // Stream already closed
    }
  }, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(id);
}

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

/** Default models for provider IDs sent by the client. */
const CLIENT_PROVIDER_MODELS: Record<string, ProviderConfig["models"]> = {
  google: DEFAULT_GOOGLE_MODELS,
  openai: DEFAULT_OPENAI_MODELS,
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

/** Resolve provider configs from client-sent keys or server env. */
function resolveProviderConfigs(
  req: PhaseRequest,
): ProviderConfig[] {
  // Client explicitly sent providers array (local mode) — use client keys only.
  // An empty array means local mode with no keys configured → return [] to trigger
  // the "no providers" error rather than silently falling back to server env keys.
  if (req.providers !== undefined) {
    if (req.providers.length > 0) {
      return buildClientProviderConfigs(req.providers);
    }
    logger.warn("resolveProviderConfigs: local mode with no client keys, blocking server env fallback");
    return [];
  }

  // Proxy mode: no providers sent → use server env keys.
  // localOnly does NOT affect provider resolution — it only gates search.
  return buildProviderConfigs();
}

/** Create the FilteringSearchProvider from request config. */
function buildSearchProvider(
  req: PhaseRequest,
  providerConfigs: ProviderConfig[],
  registry: ReturnType<typeof createRegistry>,
): SearchProvider {
  const searchConfig = "search" in req ? req.search : undefined;
  const includeDomains = searchConfig?.includeDomains ?? [];
  const excludeDomains = searchConfig?.excludeDomains ?? [];
  const citationImages = searchConfig?.citationImages ?? true;

  // localOnlyMode = no web search at all. Return no-op immediately.
  const localOnly = "localOnly" in req && req.localOnly === true;
  if (localOnly) {
    logger.info("buildSearchProvider: localOnly mode — no-op search provider");
    return new FilteringSearchProvider(
      { search: async () => ({ sources: [], images: [] }) },
      includeDomains,
      excludeDomains,
      citationImages,
    );
  }

  // Resolve search provider config based on connection mode.
  // Proxy mode (no providers sent): use server env search config.
  // Local mode (providers sent): prefer client config, fall back to server env.
  const isProxyMode = req.providers === undefined;
  const detectedConfig: import("@/engine/search/types").SearchProviderConfig | undefined =
    isProxyMode
      ? detectSearchProviderConfig()
      : (searchConfig?.provider ?? detectSearchProviderConfig());

  logger.info("buildSearchProvider: resolved search config", {
    mode: isProxyMode ? "proxy" : "local",
    clientProviderId: searchConfig?.provider?.id ?? "none",
    resolvedProviderId: detectedConfig?.id ?? "none",
    hasApiKey: !!detectedConfig?.apiKey,
    apiKeyPrefix: detectedConfig?.apiKey?.slice(0, 6),
    baseURL: detectedConfig?.baseURL ?? "default",
    includeDomains,
    excludeDomains,
  });

  const base = detectedConfig
    ? createSearchProvider(detectedConfig, providerConfigs[0], registry)
    : { search: async () => ({ sources: [], images: [] }) };

  if (detectedConfig) {
    logger.info("Search provider created", {
      providerId: detectedConfig.id,
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
// SSE stream setup helpers
// ---------------------------------------------------------------------------

function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  stopHeartbeat: () => void;
} {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) { controller = ctrl; },
  });
  const stopHeartbeat = startHeartbeat(controller, encoder);
  return { stream, controller, encoder, stopHeartbeat };
}

/** Safely send final SSE events, stop heartbeat, and close the stream. No-ops if already closed. */
function finishStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  events: string[],
  stopHeartbeat?: () => void,
): void {
  try {
    stopHeartbeat?.();
    for (const event of events) {
      controller.enqueue(encoder.encode(event));
    }
    controller.close();
  } catch {
    // Stream already closed — client disconnected during research
    stopHeartbeat?.();
  }
}

function subscribeOrchestrator(
  orchestrator: ResearchOrchestrator,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): () => (() => void)[] {
  const eventTypes: ResearchEventType[] = [
    "step-start", "step-delta", "step-reasoning",
    "step-complete", "step-error", "progress",
    "search-task", "search-result",
  ];

  const unsubs = eventTypes.map((et) =>
    orchestrator.on(et, (payload) => {
      try {
        controller.enqueue(encoder.encode(sseEvent(et, payload)));
      } catch { /* stream closed */ }
    }),
  );

  return () => unsubs;
}

function cleanup(
  unsubsGetter: () => (() => void)[],
  orchestrator: ResearchOrchestrator,
  onAbort: () => void,
  request: Request,
  stopHeartbeat?: () => void,
) {
  stopHeartbeat?.();
  request.signal.removeEventListener("abort", onAbort);
  for (const u of unsubsGetter()) u();
  orchestrator.destroy();
}

// ---------------------------------------------------------------------------
// Phase handlers
// ---------------------------------------------------------------------------

async function handleClarifyPhase(
  req: z.infer<typeof clarifySchema>,
  request: Request,
  providerConfigs: ProviderConfig[],
): Promise<Response> {
  const registry = createRegistry(providerConfigs);
  const searchProvider = buildSearchProvider(req, providerConfigs, registry);

  const researchConfig: ResearchConfig = {
    topic: req.topic,
    providerConfigs,
    stepModelMap: {},
    language: req.language,
  };

  const { stream, controller, encoder, stopHeartbeat } = createSSEStream();
  const orchestrator = new ResearchOrchestrator(researchConfig, searchProvider);
  const unsubsGetter = subscribeOrchestrator(orchestrator, controller, encoder);

  const onAbort = () => { orchestrator.abort(); };
  request.signal.addEventListener("abort", onAbort);

  (async () => {
    try {
      controller.enqueue(encoder.encode(sseEvent("start", { topic: req.topic, phase: "clarify" })));
      const result = await orchestrator.clarifyOnly();
      const events: string[] = [];
      if (result) {
        events.push(sseEvent("clarify-result", result));
      }
      events.push(sseEvent("done", {}));
      finishStream(controller, encoder, events, stopHeartbeat);
    } catch (error) {
      const err = toAppError(error, "RESEARCH_STEP_FAILED");
      logger.error("Clarify stream error", { code: err.code, message: err.message });
      finishStream(controller, encoder, [sseError(err.code, err.message)], stopHeartbeat);
    } finally {
      cleanup(unsubsGetter, orchestrator, onAbort, request, stopHeartbeat);
    }
  })();

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

async function handlePlanPhase(
  req: z.infer<typeof planSchema>,
  request: Request,
  providerConfigs: ProviderConfig[],
): Promise<Response> {
  const researchConfig: ResearchConfig = {
    topic: req.topic,
    providerConfigs,
    stepModelMap: {},
    language: req.language,
    promptOverrides: req.promptOverrides as ResearchConfig["promptOverrides"],
  };

  const { stream, controller, encoder, stopHeartbeat } = createSSEStream();
  const orchestrator = new ResearchOrchestrator(researchConfig);
  const unsubsGetter = subscribeOrchestrator(orchestrator, controller, encoder);

  const onAbort = () => { orchestrator.abort(); };
  request.signal.addEventListener("abort", onAbort);

  (async () => {
    try {
      controller.enqueue(encoder.encode(sseEvent("start", { topic: req.topic, phase: "plan" })));
      const result = await orchestrator.planWithContext(req.topic, req.questions, req.feedback);
      const events: string[] = [];
      if (result) {
        events.push(sseEvent("plan-result", result));
      }
      events.push(sseEvent("done", {}));
      finishStream(controller, encoder, events, stopHeartbeat);
    } catch (error) {
      const err = toAppError(error, "RESEARCH_STEP_FAILED");
      logger.error("Plan stream error", { code: err.code, message: err.message });
      finishStream(controller, encoder, [sseError(err.code, err.message)], stopHeartbeat);
    } finally {
      cleanup(unsubsGetter, orchestrator, onAbort, request, stopHeartbeat);
    }
  })();

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

async function handleResearchPhase(
  req: z.infer<typeof researchSchema>,
  request: Request,
  providerConfigs: ProviderConfig[],
): Promise<Response> {
  const registry = createRegistry(providerConfigs);
  const searchProvider = buildSearchProvider(req, providerConfigs, registry);

  const researchConfig: ResearchConfig = {
    topic: "", // not needed for research-only phase
    providerConfigs,
    stepModelMap: {},
    language: req.language,
    maxSearchQueries: req.maxSearchQueries,
    promptOverrides: req.promptOverrides as ResearchConfig["promptOverrides"],
  };

  const { stream, controller, encoder, stopHeartbeat } = createSSEStream();
  const orchestrator = new ResearchOrchestrator(researchConfig, searchProvider);
  const unsubsGetter = subscribeOrchestrator(orchestrator, controller, encoder);

  const onAbort = () => { orchestrator.abort(); };
  request.signal.addEventListener("abort", onAbort);

  (async () => {
    try {
      controller.enqueue(encoder.encode(sseEvent("start", { phase: "research" })));
      const result = await orchestrator.researchFromPlan(req.plan, req.queries);
      const events: string[] = [];
      if (result) {
        events.push(sseEvent("research-result", result));
      }
      events.push(sseEvent("done", {}));
      finishStream(controller, encoder, events, stopHeartbeat);
    } catch (error) {
      const err = toAppError(error, "RESEARCH_STEP_FAILED");
      logger.error("Research stream error", { code: err.code, message: err.message });
      finishStream(controller, encoder, [sseError(err.code, err.message)], stopHeartbeat);
    } finally {
      cleanup(unsubsGetter, orchestrator, onAbort, request, stopHeartbeat);
    }
  })();

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

async function handleReportPhase(
  req: z.infer<typeof reportSchema>,
  request: Request,
  providerConfigs: ProviderConfig[],
): Promise<Response> {
  const researchConfig: ResearchConfig = {
    topic: "", // not needed for report-only phase
    providerConfigs,
    stepModelMap: {},
    reportStyle: req.reportStyle,
    reportLength: req.reportLength,
    language: req.language,
    promptOverrides: req.promptOverrides as ResearchConfig["promptOverrides"],
  };

  const { stream, controller, encoder, stopHeartbeat } = createSSEStream();
  const orchestrator = new ResearchOrchestrator(researchConfig);
  const unsubsGetter = subscribeOrchestrator(orchestrator, controller, encoder);

  const onAbort = () => { orchestrator.abort(); };
  request.signal.addEventListener("abort", onAbort);

  (async () => {
    try {
      controller.enqueue(encoder.encode(sseEvent("start", { phase: "report" })));
      const result = await orchestrator.reportFromLearnings(
        req.plan,
        req.learnings,
        req.sources as Source[],
        req.images as ImageSource[],
        req.feedback,
      );
      const events: string[] = [];
      if (result) {
        events.push(sseEvent("result", result));
      }
      events.push(sseEvent("done", {}));
      finishStream(controller, encoder, events, stopHeartbeat);
    } catch (error) {
      const err = toAppError(error, "RESEARCH_STEP_FAILED");
      logger.error("Report stream error", { code: err.code, message: err.message });
      finishStream(controller, encoder, [sseError(err.code, err.message)], stopHeartbeat);
    } finally {
      cleanup(unsubsGetter, orchestrator, onAbort, request, stopHeartbeat);
    }
  })();

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

async function handleFullPhase(
  req: z.infer<typeof fullSchema> & { phase: "full" },
  request: Request,
  providerConfigs: ProviderConfig[],
): Promise<Response> {
  const registry = createRegistry(providerConfigs);
  const searchProvider = buildSearchProvider(req, providerConfigs, registry);

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

  const { stream, controller, encoder, stopHeartbeat } = createSSEStream();
  const orchestrator = new ResearchOrchestrator(researchConfig, searchProvider);
  const unsubsGetter = subscribeOrchestrator(orchestrator, controller, encoder);

  const onAbort = () => {
    logger.info("Abort signal received from client");
    orchestrator.abort();
  };
  request.signal.addEventListener("abort", onAbort);

  (async () => {
    try {
      logger.info("Starting research orchestrator", { topic: req.topic });
      controller.enqueue(encoder.encode(sseEvent("start", { topic: req.topic })));

      const result = await orchestrator.start();
      const events: string[] = [];
      if (result) {
        events.push(sseEvent("result", result));
      }
      events.push(sseEvent("done", {}));
      finishStream(controller, encoder, events, stopHeartbeat);
    } catch (error) {
      const err = toAppError(error, "RESEARCH_STEP_FAILED");
      logger.error("Research stream error", { code: err.code, message: err.message });
      finishStream(controller, encoder, [sseError(err.code, err.message)], stopHeartbeat);
    } finally {
      cleanup(unsubsGetter, orchestrator, onAbort, request, stopHeartbeat);
    }
  })();

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return sseErrorResponse("VALIDATION_FAILED", `Invalid request: ${msg}`, 400);
  }

  const req = parsed.data as PhaseRequest;

  // 2. Enforce proxy auth when using server-side providers
  const authError = enforceResearchAuth(request, req.providers);
  if (authError) {
    return sseErrorResponse(authError.error, authError.message, authError.status);
  }

  // 3. Provider configs
  const providerConfigs = resolveProviderConfigs(req);
  if (providerConfigs.length === 0) {
    const message = "No AI providers configured. Add an API key in Settings (local mode) or set GOOGLE_GENERATIVE_AI_API_KEY / OPENAI_API_KEY on the server (proxy mode).";
    return sseErrorResponse("CONFIG_MISSING_KEY", message, 500);
  }

  // 4. Route to phase handler
  switch (req.phase) {
    case "clarify":
      return handleClarifyPhase(req, request, providerConfigs);
    case "plan":
      return handlePlanPhase(req, request, providerConfigs);
    case "research":
      return handleResearchPhase(req, request, providerConfigs);
    case "report":
      return handleReportPhase(req, request, providerConfigs);
    case "full":
    default:
      return handleFullPhase(req, request, providerConfigs);
  }
}
