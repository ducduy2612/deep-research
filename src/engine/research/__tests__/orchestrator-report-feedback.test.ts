/**
 * Tests for orchestrator report-phase feedback threading.
 *
 * Verifies that feedback passed to reportFromLearnings() is forwarded
 * through resolvePrompt into the generated report prompt.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — reuse mockContainer pattern from orchestrator.test.ts
// ---------------------------------------------------------------------------

const mockContainer = {
  model: null as unknown,
  streamFn: vi.fn(),
  generateFn: vi.fn(),
};

vi.mock("@/engine/provider/registry", () => ({
  createRegistry: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
  resolveModel: vi.fn().mockImplementation(() => mockContainer.model),
  getDefaultModel: vi.fn().mockImplementation(() => mockContainer.model),
}));

vi.mock("@/engine/provider/streaming", () => ({
  streamWithAbort: vi.fn().mockImplementation((...args: unknown[]) =>
    mockContainer.streamFn(...args),
  ),
  generateStructured: vi.fn().mockImplementation((...args: unknown[]) =>
    mockContainer.generateFn(...args),
  ),
}));

vi.mock("@/engine/provider/factory", () => ({
  createProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
  createGoogleProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
  createOpenAICompatibleProvider: vi.fn().mockReturnValue({
    languageModel: vi.fn().mockImplementation(() => mockContainer.model),
  }),
}));

// Imports after mocks
import { ResearchOrchestrator } from "../orchestrator";
import type { ResearchConfig } from "../types";
import type { ProviderConfig } from "@/engine/provider/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PROVIDER_CONFIG: ProviderConfig = {
  id: "google",
  apiKey: "test-key",
  models: [{
    id: "gemini-test", name: "Gemini Test", role: "thinking",
    capabilities: { reasoning: true, searchGrounding: false, structuredOutput: true, maxOutputTokens: 8192 },
  }],
};

function createTestConfig(overrides?: Partial<ResearchConfig>): ResearchConfig {
  return { topic: "Test", providerConfigs: [TEST_PROVIDER_CONFIG], stepModelMap: {}, ...overrides };
}

/** Simulates an AI SDK StreamTextResult with a fullStream async iterable. */
function fakeStreamResponse(textChunks: string[] = ["response text"]) {
  const fullStream = (async function* () {
    for (const chunk of textChunks) {
      yield { type: "text-delta" as const, text: chunk };
    }
    yield {
      type: "finish" as const, finishReason: "stop" as const,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };
  })();
  return { fullStream };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockContainer.streamFn.mockResolvedValue(fakeStreamResponse(["# Report\nContent"]));
});

describe("reportFromLearnings() feedback threading", () => {
  it("passes feedback string to resolvePrompt as requirements argument", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    const feedback = "Focus on cost analysis and provide more quantitative data";

    await orchestrator.reportFromLearnings("plan", ["l1"], [], [], feedback);

    // Verify streamWithAbort was called (meaning resolvePrompt ran successfully)
    expect(mockContainer.streamFn).toHaveBeenCalledOnce();

    // Extract the messages passed to the model and check the prompt contains feedback
    const callArgs = mockContainer.streamFn.mock.calls[0][0] as { messages: { content: string | Array<{ type: string; text?: string }> }[] };
    const userMessage = callArgs.messages.find((m: { content: string | Array<{ type: string; text?: string }> }) => {
      const text = typeof m.content === "string" ? m.content : m.content.find((p): p is { type: string; text: string } => p.type === "text")?.text ?? "";
      return text.includes("cost analysis");
    });

    expect(userMessage).toBeDefined();
    const content = typeof userMessage!.content === "string" ? userMessage!.content : userMessage!.content.find((p): p is { type: string; text: string } => p.type === "text")!.text;
    expect(content).toContain("cost analysis");
    expect(content).toContain("REQUIREMENT");
  });

  it("works without feedback (backward compat)", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    const result = await orchestrator.reportFromLearnings("plan", ["l1"], [], []);

    expect(result).not.toBeNull();
    expect(result!.report).toContain("Content");
    expect(orchestrator.getState()).toBe("completed");
  });

  it("works with empty feedback string (treated as no feedback)", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    const result = await orchestrator.reportFromLearnings("plan", [], [], [], "");

    expect(result).not.toBeNull();
    expect(orchestrator.getState()).toBe("completed");
  });

  it("includes feedback text in the streamed report prompt", async () => {
    const config = createTestConfig();
    const orchestrator = new ResearchOrchestrator(config);

    const feedback = "Add more sections about environmental impact";

    await orchestrator.reportFromLearnings("plan", ["learning 1"], [], [], feedback);

    const callArgs = mockContainer.streamFn.mock.calls[0][0] as { messages: { content: string | Array<{ type: string; text?: string }> }[] };
    const rawContent = callArgs.messages[1].content;
    const prompt = typeof rawContent === "string" ? rawContent : rawContent.find((p): p is { type: string; text: string } => p.type === "text")!.text;

    // The getReportPrompt template wraps requirements in <REQUIREMENT> tags
    expect(prompt).toContain("<REQUIREMENT>");
    expect(prompt).toContain("environmental impact");
    expect(prompt).toContain("</REQUIREMENT>");
  });
});
