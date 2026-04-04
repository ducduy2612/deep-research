/* eslint-disable max-lines */
/**
 * Tests for the SSE API route at /api/research/stream.
 *
 * Uses module-level mocking of the orchestrator, search factory, domain
 * filters, and provider registry so the route never touches real AI APIs
 * or search services. Tests validate request parsing, SSE event streaming,
 * abort handling, error events, and the domain/citation-image decorator.
 *
 * Covers both the legacy full-pipeline mode and the new multi-phase
 * streaming endpoints (clarify, plan, research, report).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockOrchestratorInstance = {
  start: vi.fn(),
  clarifyOnly: vi.fn(),
  planWithContext: vi.fn(),
  researchFromPlan: vi.fn(),
  reportFromLearnings: vi.fn(),
  abort: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn().mockReturnValue(vi.fn()),
};

vi.mock("@/engine/research/orchestrator", () => ({
  ResearchOrchestrator: vi.fn(function () {
    return mockOrchestratorInstance;
  }),
}));

vi.mock("@/engine/search/factory", () => ({
  createSearchProvider: vi.fn().mockReturnValue({
    search: vi.fn().mockResolvedValue({ sources: [], images: [] }),
  }),
}));

vi.mock("@/engine/search/domain-filter", () => ({
  applyDomainFilters: vi.fn((result: unknown) => result),
}));

vi.mock("@/engine/search/citation-images", () => ({
  filterCitationImages: vi.fn((result: unknown) => result),
}));

vi.mock("@/engine/provider/registry", () => ({
  createRegistry: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/env", () => ({
  env: {
    GOOGLE_GENERATIVE_AI_API_KEY: "test-google-key",
    OPENAI_API_KEY: "test-openai-key",
    TAVILY_API_KEY: "test-tavily-key",
  },
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
// Imports — after vi.mock calls
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/research/stream/route";
import { ResearchOrchestrator } from "@/engine/research/orchestrator";
import { createSearchProvider } from "@/engine/search/factory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function collectSSEEvents(
  response: Response,
): Promise<Array<{ event: string; data: Record<string, unknown> }>> {
  if (!response.body) throw new Error("No body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      let event = "";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (event) events.push({ event, data: JSON.parse(data) as Record<string, unknown> });
    }
  }
  return events;
}

function createRequest(body: Record<string, unknown>, signal?: AbortSignal) {
  return new Request("http://localhost:3000/api/research/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

function validBody(overrides?: Record<string, unknown>) {
  return { topic: "Test research topic", ...overrides };
}

function setupHappyPath(
  events: Array<{ type: string; payload: unknown }> = [
    { type: "step-start", payload: { step: "clarify", state: "clarifying" } },
    { type: "step-delta", payload: { step: "clarify", text: "text" } },
    { type: "step-complete", payload: { step: "clarify", duration: 100 } },
  ],
) {
  mockOrchestratorInstance.on.mockImplementation(
    (_eventType: string, handler: (p: unknown) => void) => {
      for (const evt of events) {
        if (evt.type === _eventType) handler(evt.payload);
      }
      return vi.fn();
    },
  );
  mockOrchestratorInstance.start.mockImplementation(async () => {
    for (const [et, handler] of mockOrchestratorInstance.on.mock.calls) {
      for (const evt of events) {
        if (evt.type === et) handler(evt.payload);
      }
    }
    return {
      title: "Test Report",
      report: "# Test Report\nContent here.",
      learnings: ["learning 1"],
      sources: [{ url: "https://example.com" }],
      images: [],
    };
  });
}

function getOrchestratorConfig() {
  return (ResearchOrchestrator as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

function resetMocks() {
  vi.clearAllMocks();
  mockOrchestratorInstance.on.mockReturnValue(vi.fn());
  mockOrchestratorInstance.start.mockResolvedValue(null);
  mockOrchestratorInstance.clarifyOnly.mockResolvedValue(null);
  mockOrchestratorInstance.planWithContext.mockResolvedValue(null);
  mockOrchestratorInstance.researchFromPlan.mockResolvedValue(null);
  mockOrchestratorInstance.reportFromLearnings.mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SSE Research Stream Route", () => {
  beforeEach(resetMocks);

  // =========================================================================
  // Full pipeline (backward compat)
  // =========================================================================

  describe("full pipeline (default)", () => {
    // --- Validation ---
    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/api/research/stream", {
        method: "POST",
        body: "not json{",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const evts = await collectSSEEvents(res);
      expect(evts[0].event).toBe("error");
      expect(evts[0].data.code).toBe("VALIDATION_FAILED");
    });

    it("returns 400 when topic is missing", async () => {
      const res = await POST(createRequest({}));
      expect(res.status).toBe(400);
    });

    it("returns 400 when topic is empty", async () => {
      const res = await POST(createRequest({ topic: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid reportStyle", async () => {
      const res = await POST(createRequest({ topic: "t", reportStyle: "bad" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 for negative autoReviewRounds", async () => {
      const res = await POST(createRequest({ topic: "t", autoReviewRounds: -1 }));
      expect(res.status).toBe(400);
    });

    // --- SSE streaming ---
    it("returns SSE with correct headers", async () => {
      setupHappyPath();
      const res = await POST(createRequest(validBody()));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
      expect(res.headers.get("Cache-Control")).toBe("no-cache");
    });

    it("streams start, result, and done events", async () => {
      setupHappyPath();
      const evts = await collectSSEEvents(await POST(createRequest(validBody())));
      const types = evts.map((e) => e.event);
      expect(types).toContain("start");
      expect(types).toContain("result");
      expect(types).toContain("done");
      expect(evts.find((e) => e.event === "start")?.data).toMatchObject({
        topic: "Test research topic",
      });
      expect(evts[evts.length - 1].event).toBe("done");
    });

    it("forwards orchestrator step events", async () => {
      setupHappyPath();
      const evts = await collectSSEEvents(await POST(createRequest(validBody())));
      const types = evts.map((e) => e.event);
      expect(types).toContain("step-start");
      expect(types).toContain("step-delta");
      expect(types).toContain("step-complete");
    });

    it("subscribes to all 6 event types", async () => {
      setupHappyPath();
      await POST(createRequest(validBody()));
      const subs = mockOrchestratorInstance.on.mock.calls.map(
        (c: any[]) => c[0] as string,
      );
      expect(subs).toEqual(
        expect.arrayContaining([
          "step-start", "step-delta", "step-reasoning",
          "step-complete", "step-error", "progress",
        ]),
      );
    });

    // --- Config construction ---
    it("passes correct config to orchestrator", async () => {
      setupHappyPath();
      await POST(createRequest(validBody({
        language: "en",
        reportStyle: "technical",
        autoReviewRounds: 2,
      })));
      const cfg = getOrchestratorConfig();
      expect(cfg.topic).toBe("Test research topic");
      expect(cfg.language).toBe("en");
      expect(cfg.reportStyle).toBe("technical");
      expect(cfg.autoReviewRounds).toBe(2);
      expect(cfg.providerConfigs.length).toBeGreaterThan(0);
    });

    it("passes stepModelMap and promptOverrides", async () => {
      setupHappyPath();
      await POST(createRequest(validBody({
        stepModelMap: { clarify: { providerId: "google", modelId: "gemini-2.5-pro" } },
        promptOverrides: { system: "Custom" },
      })));
      const cfg = getOrchestratorConfig();
      expect(cfg.stepModelMap).toMatchObject({
        clarify: { providerId: "google", modelId: "gemini-2.5-pro" },
      });
    });

    // --- Search provider ---
    it("creates search provider from env", async () => {
      setupHappyPath();
      await POST(createRequest(validBody()));
      expect(createSearchProvider).toHaveBeenCalled();
    });

    it("uses client-provided search config in local mode", async () => {
      // In local mode (providers sent), client search config takes priority
      // over server env search config.
      setupHappyPath();
      await POST(createRequest(validBody({
        providers: [{ id: "google", apiKey: "key" }],
        search: { provider: { id: "brave", apiKey: "key" } },
      })));
      expect(createSearchProvider).toHaveBeenCalledWith(
        expect.objectContaining({ id: "brave" }),
        expect.anything(),
        expect.anything(),
      );
    });

    it("passes FilteringSearchProvider wrapper to orchestrator", async () => {
      setupHappyPath();
      await POST(createRequest(validBody({
        search: { includeDomains: ["wikipedia.org"], excludeDomains: ["spam.com"] },
      })));
      expect(ResearchOrchestrator).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ search: expect.any(Function) }),
      );
    });

    // --- Local-only mode ---
    describe("localOnly mode", () => {
      it("does NOT block server env providers — localOnly only gates search", async () => {
        // localOnly is about search, not provider keys. Proxy mode without
        // providers should still use server env keys regardless of localOnly.
        setupHappyPath();
        await POST(createRequest(validBody({
          localOnly: true,
          // No providers field → proxy mode → server env keys
        })));
        expect(ResearchOrchestrator).toHaveBeenCalledWith(
          expect.objectContaining({
            providerConfigs: expect.arrayContaining([
              expect.objectContaining({ id: "google" }),
            ]),
          }),
          expect.anything(),
        );
      });

      it("blocks server env providers when client sends empty providers array (local mode, no keys)", async () => {
        // Regression: proxy OFF, localOnly OFF, but no API keys configured.
        // Client sends providers: [] — should NOT fall through to server env.
        setupHappyPath();
        const res = await POST(createRequest(validBody({
          providers: [],
        })));
        const events = await collectSSEEvents(res);
        expect(events).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              event: "error",
              data: expect.objectContaining({
                code: "CONFIG_MISSING_KEY",
                message: expect.stringContaining("Add an API key in Settings"),
              }),
            }),
          ]),
        );
      });

      it("uses client providers when localOnly is true and client sends them", async () => {
        setupHappyPath();
        await POST(createRequest(validBody({
          localOnly: true,
          providers: [{ id: "google", apiKey: "client-key" }],
        })));
        expect(ResearchOrchestrator).toHaveBeenCalledWith(
          expect.objectContaining({
            providerConfigs: expect.arrayContaining([
              expect.objectContaining({ id: "google", apiKey: "client-key" }),
            ]),
          }),
          expect.anything(),
        );
      });

      it("returns no-op search provider when localOnly is true — no search calls made", async () => {
        // localOnly means no web search at all. The search provider should
        // be a no-op returning empty results, regardless of configured providers.
        setupHappyPath();
        await POST(createRequest(validBody({
          localOnly: true,
          providers: [{ id: "google", apiKey: "key" }],
          search: { provider: { id: "brave", apiKey: "brave-key" } },
        })));
        // Should NOT call createSearchProvider — localOnly bypasses search entirely
        expect(createSearchProvider).not.toHaveBeenCalled();
      });
    });

    // --- Abort ---
    it("calls abort when request signal fires", async () => {
      let resolveStart: (v: null) => void;
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.start.mockReturnValue(
        new Promise<null>((r) => { resolveStart = r; }),
      );
      const ac = new AbortController();
      const p = POST(createRequest(validBody(), ac.signal));
      await new Promise((r) => setTimeout(r, 10));
      ac.abort();
      await new Promise((r) => setTimeout(r, 10));
      resolveStart!(null);
      const res = await p;
      expect(mockOrchestratorInstance.abort).toHaveBeenCalled();
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    });

    // --- Error handling ---
    it("streams error when start throws", async () => {
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.start.mockRejectedValue(new Error("timeout"));
      const evts = await collectSSEEvents(await POST(createRequest(validBody())));
      const err = evts.find((e) => e.event === "error");
      expect(err).toBeDefined();
      expect(err?.data.message).toContain("timeout");
    });

    it("streams error with AppError code", async () => {
      const { AppError } = await import("@/lib/errors");
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.start.mockRejectedValue(
        new AppError("AI_REQUEST_FAILED", "connection refused", { category: "ai" }),
      );
      const evts = await collectSSEEvents(await POST(createRequest(validBody())));
      expect(evts.find((e) => e.event === "error")?.data.code).toBe("AI_REQUEST_FAILED");
    });

    it("calls destroy in finally block", async () => {
      setupHappyPath();
      await POST(createRequest(validBody()));
      expect(mockOrchestratorInstance.destroy).toHaveBeenCalled();
    });

    it("calls destroy even when start throws", async () => {
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.start.mockRejectedValue(new Error("fail"));
      await POST(createRequest(validBody()));
      expect(mockOrchestratorInstance.destroy).toHaveBeenCalled();
    });

    it("unsubscribes all 6 event handlers on cleanup", async () => {
      const unsub = vi.fn();
      mockOrchestratorInstance.on.mockReturnValue(unsub);
      mockOrchestratorInstance.start.mockResolvedValue(null);
      await POST(createRequest(validBody()));
      expect(unsub).toHaveBeenCalledTimes(8);
    });

    it("streams done without result when null returned", async () => {
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.start.mockResolvedValue(null);
      const evts = await collectSSEEvents(await POST(createRequest(validBody())));
      const types = evts.map((e) => e.event);
      expect(types).toContain("start");
      expect(types).toContain("done");
      expect(types).not.toContain("result");
    });

    // --- Provider config ---
    it("builds provider configs from GOOGLE and OPENAI env", async () => {
      setupHappyPath();
      await POST(createRequest(validBody()));
      const cfg = getOrchestratorConfig();
      const ids = cfg.providerConfigs.map((c: { id: string }) => c.id);
      expect(ids).toContain("google");
      expect(ids).toContain("openai");
    });
  });

  // =========================================================================
  // Clarify phase
  // =========================================================================

  describe("clarify phase", () => {
    const clarifyBody = (overrides?: Record<string, unknown>) => ({
      phase: "clarify",
      topic: "Quantum computing",
      ...overrides,
    });

    it("returns 200 with SSE headers", async () => {
      setupHappyPath();
      mockOrchestratorInstance.clarifyOnly.mockResolvedValue({
        questions: "Q1?",
      });
      const res = await POST(createRequest(clarifyBody()));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("calls clarifyOnly on the orchestrator", async () => {
      setupHappyPath();
      mockOrchestratorInstance.clarifyOnly.mockResolvedValue({
        questions: "Q1? Q2?",
      });
      await POST(createRequest(clarifyBody()));
      expect(mockOrchestratorInstance.clarifyOnly).toHaveBeenCalled();
    });

    it("emits clarify-result event with questions", async () => {
      setupHappyPath();
      mockOrchestratorInstance.clarifyOnly.mockResolvedValue({
        questions: "What is quantum entanglement?",
      });
      const evts = await collectSSEEvents(
        await POST(createRequest(clarifyBody())),
      );
      const types = evts.map((e) => e.event);
      expect(types).toContain("start");
      expect(types).toContain("clarify-result");
      expect(types).toContain("done");

      const result = evts.find((e) => e.event === "clarify-result");
      expect(result?.data).toMatchObject({
        questions: "What is quantum entanglement?",
      });
    });

    it("includes phase in start event", async () => {
      setupHappyPath();
      mockOrchestratorInstance.clarifyOnly.mockResolvedValue({
        questions: "Q1?",
      });
      const evts = await collectSSEEvents(
        await POST(createRequest(clarifyBody({ topic: "AI safety" }))),
      );
      const startEvt = evts.find((e) => e.event === "start");
      expect(startEvt?.data).toMatchObject({
        topic: "AI safety",
        phase: "clarify",
      });
    });

    it("omits clarify-result when result is null", async () => {
      setupHappyPath();
      mockOrchestratorInstance.clarifyOnly.mockResolvedValue(null);
      const evts = await collectSSEEvents(
        await POST(createRequest(clarifyBody())),
      );
      const types = evts.map((e) => e.event);
      expect(types).not.toContain("clarify-result");
      expect(types).toContain("done");
    });

    it("returns 400 when topic is missing", async () => {
      const res = await POST(createRequest({ phase: "clarify" }));
      expect(res.status).toBe(400);
    });

    it("calls destroy on cleanup", async () => {
      setupHappyPath();
      mockOrchestratorInstance.clarifyOnly.mockResolvedValue({
        questions: "Q1?",
      });
      await POST(createRequest(clarifyBody()));
      expect(mockOrchestratorInstance.destroy).toHaveBeenCalled();
    });

    it("streams error when clarifyOnly throws", async () => {
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.clarifyOnly.mockRejectedValue(
        new Error("model timeout"),
      );
      const evts = await collectSSEEvents(
        await POST(createRequest(clarifyBody())),
      );
      const err = evts.find((e) => e.event === "error");
      expect(err).toBeDefined();
      expect(err?.data.message).toContain("model timeout");
    });
  });

  // =========================================================================
  // Plan phase
  // =========================================================================

  describe("plan phase", () => {
    const planBody = (overrides?: Record<string, unknown>) => ({
      phase: "plan",
      topic: "AI alignment",
      questions: "What are the main approaches?",
      feedback: "Focus on technical approaches",
      ...overrides,
    });

    it("calls planWithContext on the orchestrator", async () => {
      setupHappyPath();
      mockOrchestratorInstance.planWithContext.mockResolvedValue({
        plan: "# Research Plan\n1. ...",
      });
      await POST(createRequest(planBody()));
      expect(mockOrchestratorInstance.planWithContext).toHaveBeenCalledWith(
        "AI alignment",
        "What are the main approaches?",
        "Focus on technical approaches",
      );
    });

    it("emits plan-result event", async () => {
      setupHappyPath();
      mockOrchestratorInstance.planWithContext.mockResolvedValue({
        plan: "# Research Plan\n1. Step one\n2. Step two",
      });
      const evts = await collectSSEEvents(
        await POST(createRequest(planBody())),
      );
      const types = evts.map((e) => e.event);
      expect(types).toContain("plan-result");
      const result = evts.find((e) => e.event === "plan-result");
      expect(result?.data).toMatchObject({
        plan: "# Research Plan\n1. Step one\n2. Step two",
      });
    });

    it("includes phase in start event", async () => {
      setupHappyPath();
      mockOrchestratorInstance.planWithContext.mockResolvedValue({
        plan: "plan text",
      });
      const evts = await collectSSEEvents(
        await POST(createRequest(planBody())),
      );
      const startEvt = evts.find((e) => e.event === "start");
      expect(startEvt?.data).toMatchObject({
        topic: "AI alignment",
        phase: "plan",
      });
    });

    it("returns 400 when questions is missing", async () => {
      const res = await POST(createRequest({
        phase: "plan",
        topic: "t",
        feedback: "f",
      }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when feedback is missing", async () => {
      const res = await POST(createRequest({
        phase: "plan",
        topic: "t",
        questions: "q",
      }));
      expect(res.status).toBe(400);
    });

    it("omits plan-result when result is null", async () => {
      setupHappyPath();
      mockOrchestratorInstance.planWithContext.mockResolvedValue(null);
      const evts = await collectSSEEvents(
        await POST(createRequest(planBody())),
      );
      expect(evts.map((e) => e.event)).not.toContain("plan-result");
      expect(evts.map((e) => e.event)).toContain("done");
    });

    it("streams error when planWithContext throws", async () => {
      mockOrchestratorInstance.on.mockReturnValue(vi.fn());
      mockOrchestratorInstance.planWithContext.mockRejectedValue(
        new Error("model error"),
      );
      const evts = await collectSSEEvents(
        await POST(createRequest(planBody())),
      );
      expect(evts.find((e) => e.event === "error")).toBeDefined();
    });
  });

  // =========================================================================
  // Research phase
  // =========================================================================

  describe("research phase", () => {
    const researchBody = (overrides?: Record<string, unknown>) => ({
      phase: "research",
      plan: "# Step 1\nSearch for X",
      ...overrides,
    });

    it("calls researchFromPlan on the orchestrator", async () => {
      setupHappyPath();
      mockOrchestratorInstance.researchFromPlan.mockResolvedValue({
        learnings: ["L1"],
        sources: [{ url: "https://example.com" }],
        images: [],
      });
      await POST(createRequest(researchBody()));
      expect(mockOrchestratorInstance.researchFromPlan).toHaveBeenCalledWith(
        "# Step 1\nSearch for X",
      );
    });

    it("emits research-result event", async () => {
      setupHappyPath();
      mockOrchestratorInstance.researchFromPlan.mockResolvedValue({
        learnings: ["learning 1", "learning 2"],
        sources: [{ url: "https://example.com" }],
        images: [{ url: "https://img.com/a.jpg" }],
      });
      const evts = await collectSSEEvents(
        await POST(createRequest(researchBody())),
      );
      const types = evts.map((e) => e.event);
      expect(types).toContain("research-result");
      const result = evts.find((e) => e.event === "research-result");
      expect(result?.data).toMatchObject({
        learnings: ["learning 1", "learning 2"],
        sources: [{ url: "https://example.com" }],
        images: [{ url: "https://img.com/a.jpg" }],
      });
    });

    it("passes maxSearchQueries to config", async () => {
      setupHappyPath();
      mockOrchestratorInstance.researchFromPlan.mockResolvedValue({
        learnings: [],
        sources: [],
        images: [],
      });
      await POST(createRequest(researchBody({ maxSearchQueries: 8 })));
      const cfg = getOrchestratorConfig();
      expect(cfg.maxSearchQueries).toBe(8);
    });

    it("returns 400 when plan is missing", async () => {
      const res = await POST(createRequest({ phase: "research" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when plan is empty", async () => {
      const res = await POST(createRequest({ phase: "research", plan: "" }));
      expect(res.status).toBe(400);
    });

    it("omits research-result when result is null", async () => {
      setupHappyPath();
      mockOrchestratorInstance.researchFromPlan.mockResolvedValue(null);
      const evts = await collectSSEEvents(
        await POST(createRequest(researchBody())),
      );
      expect(evts.map((e) => e.event)).not.toContain("research-result");
      expect(evts.map((e) => e.event)).toContain("done");
    });

    it("creates search provider for research phase", async () => {
      setupHappyPath();
      mockOrchestratorInstance.researchFromPlan.mockResolvedValue({
        learnings: [],
        sources: [],
        images: [],
      });
      await POST(createRequest(researchBody({
        search: { provider: { id: "tavily", apiKey: "key" } },
      })));
      expect(createSearchProvider).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Report phase
  // =========================================================================

  describe("report phase", () => {
    const reportBody = (overrides?: Record<string, unknown>) => ({
      phase: "report",
      plan: "# Plan",
      learnings: ["L1", "L2"],
      sources: [{ url: "https://example.com", title: "Example" }],
      images: [{ url: "https://img.com/a.jpg", description: "Diagram" }],
      ...overrides,
    });

    it("calls reportFromLearnings on the orchestrator", async () => {
      setupHappyPath();
      mockOrchestratorInstance.reportFromLearnings.mockResolvedValue({
        title: "Report",
        report: "# Report\nContent",
        learnings: ["L1", "L2"],
        sources: [{ url: "https://example.com", title: "Example" }],
        images: [{ url: "https://img.com/a.jpg", description: "Diagram" }],
      });
      await POST(createRequest(reportBody()));
      expect(mockOrchestratorInstance.reportFromLearnings).toHaveBeenCalledWith(
        "# Plan",
        ["L1", "L2"],
        [{ url: "https://example.com", title: "Example" }],
        [{ url: "https://img.com/a.jpg", description: "Diagram" }],
        undefined, // feedback — not provided in basic report request
      );
    });

    it("emits result event with full report", async () => {
      setupHappyPath();
      mockOrchestratorInstance.reportFromLearnings.mockResolvedValue({
        title: "Final Report",
        report: "# Final Report\nDetailed content here.",
        learnings: ["L1"],
        sources: [{ url: "https://example.com" }],
        images: [],
      });
      const evts = await collectSSEEvents(
        await POST(createRequest(reportBody())),
      );
      const types = evts.map((e) => e.event);
      expect(types).toContain("result");
      const result = evts.find((e) => e.event === "result");
      expect(result?.data).toMatchObject({
        title: "Final Report",
        report: "# Final Report\nDetailed content here.",
      });
    });

    it("passes reportStyle and reportLength to config", async () => {
      setupHappyPath();
      mockOrchestratorInstance.reportFromLearnings.mockResolvedValue({
        title: "R",
        report: "r",
        learnings: [],
        sources: [],
        images: [],
      });
      await POST(createRequest(reportBody({
        reportStyle: "executive",
        reportLength: "brief",
      })));
      const cfg = getOrchestratorConfig();
      expect(cfg.reportStyle).toBe("executive");
      expect(cfg.reportLength).toBe("brief");
    });

    it("returns 400 when learnings is missing", async () => {
      const res = await POST(createRequest({
        phase: "report",
        plan: "p",
        sources: [],
        images: [],
      }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when sources is missing", async () => {
      const res = await POST(createRequest({
        phase: "report",
        plan: "p",
        learnings: [],
        images: [],
      }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when images is missing", async () => {
      const res = await POST(createRequest({
        phase: "report",
        plan: "p",
        learnings: [],
        sources: [],
      }));
      expect(res.status).toBe(400);
    });

    it("omits result when reportFromLearnings returns null", async () => {
      setupHappyPath();
      mockOrchestratorInstance.reportFromLearnings.mockResolvedValue(null);
      const evts = await collectSSEEvents(
        await POST(createRequest(reportBody())),
      );
      expect(evts.map((e) => e.event)).not.toContain("result");
      expect(evts.map((e) => e.event)).toContain("done");
    });

    it("does not create search provider for report phase", async () => {
      setupHappyPath();
      mockOrchestratorInstance.reportFromLearnings.mockResolvedValue({
        title: "R",
        report: "r",
        learnings: [],
        sources: [],
        images: [],
      });
      await POST(createRequest(reportBody()));
      // The report phase handler doesn't call buildSearchProvider
      // since it doesn't need search. The orchestrator is created
      // without a search provider argument.
      expect(createSearchProvider).not.toHaveBeenCalled();
    });
  });
});
