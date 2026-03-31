/* eslint-disable max-lines */
/**
 * Tests for the SSE API route at /api/research/stream.
 *
 * Uses module-level mocking of the orchestrator, search factory, domain
 * filters, and provider registry so the route never touches real AI APIs
 * or search services. Tests validate request parsing, SSE event streaming,
 * abort handling, error events, and the domain/citation-image decorator.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockOrchestratorInstance = {
  start: vi.fn(),
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
): Promise<Array<{ event: string; data: unknown }>> {
  if (!response.body) throw new Error("No body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: Array<{ event: string; data: unknown }> = [];
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
      if (event) events.push({ event, data: JSON.parse(data) });
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SSE Research Stream Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrchestratorInstance.on.mockReturnValue(vi.fn());
    mockOrchestratorInstance.start.mockResolvedValue(null);
  });

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
      (c: [string]) => c[0],
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

  it("uses client-provided search config", async () => {
    setupHappyPath();
    await POST(createRequest(validBody({
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
    expect(unsub).toHaveBeenCalledTimes(6);
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
