import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mocks — must be before any import that references the mocked modules
// ---------------------------------------------------------------------------

const mockStreamText = vi.fn<(...args: unknown[]) => unknown>();
const mockGenerateText = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: (...args: unknown[]) => mockStreamText(...args),
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { streamWithAbort, generateStructured } from "../streaming";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockModel = () =>
  ({ __type: "language-model" }) as unknown as import("ai").LanguageModel;
const createMockMessages = () => [{ role: "user" as const, content: "Hello!" }];

/** A real Zod schema used in tests (Output.object requires a real schema). */
const testSchema = z.object({ name: z.string() });

function stubStreamText(overrides?: Record<string, unknown>) {
  mockStreamText.mockReturnValue({
    textStream: (async function* () { yield "hi"; })(),
    usage: Promise.resolve({ promptTokens: 0, completionTokens: 0 }),
    toTextStreamResponse: vi.fn(),
    ...overrides,
  });
}

function captureCallback(name: string): (...args: unknown[]) => void {
  const opts = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
  return opts[name] as (...args: unknown[]) => void;
}

// ---------------------------------------------------------------------------
// streamWithAbort
// ---------------------------------------------------------------------------

describe("streamWithAbort", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes model, messages, and abortSignal to streamText", async () => {
    const model = createMockModel();
    const messages = createMockMessages();
    const abortSignal = new AbortController().signal;
    stubStreamText();

    await streamWithAbort({ model, messages, abortSignal });

    const args = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe(model);
    expect(args.messages).toBe(messages);
    expect(args.abortSignal).toBe(abortSignal);
  });

  it("fires onAbort and logs on AbortError via onError callback", async () => {
    const onAbort = vi.fn();
    const onError = vi.fn();
    stubStreamText();

    await streamWithAbort({
      model: createMockModel(),
      messages: createMockMessages(),
      onAbort,
      onError,
    });

    captureCallback("onError")({ error: new DOMException("Aborted", "AbortError") });

    expect(logger.info).toHaveBeenCalledWith("Stream aborted", { steps: 0 });
    expect(onAbort).toHaveBeenCalledWith(0);
    expect(onError).not.toHaveBeenCalled();
  });

  it("fires onError and logs on non-abort error", async () => {
    const onError = vi.fn();
    stubStreamText();

    await streamWithAbort({
      model: createMockModel(),
      messages: createMockMessages(),
      onError,
    });

    captureCallback("onError")({ error: new Error("Provider down") });

    expect(logger.error).toHaveBeenCalledWith("Stream error", {
      message: "Provider down",
      steps: 0,
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("wraps non-Error error objects in Error for onError", async () => {
    const onError = vi.fn();
    stubStreamText();

    await streamWithAbort({
      model: createMockModel(),
      messages: createMockMessages(),
      onError,
    });

    captureCallback("onError")({ error: "string error" });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect((onError.mock.calls[0][0] as Error).message).toBe("string error");
  });

  it("fires onFinish with usage data and logs", async () => {
    const onFinish = vi.fn();
    stubStreamText();

    await streamWithAbort({
      model: createMockModel(),
      messages: createMockMessages(),
      onFinish,
    });

    captureCallback("onFinish")({
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    expect(logger.info).toHaveBeenCalledWith("Stream finished", {
      inputTokens: 100,
      outputTokens: 50,
      steps: 0,
    });
    expect(onFinish).toHaveBeenCalledWith({
      promptTokens: 100,
      completionTokens: 50,
    });
  });

  it("returns the streamText result", async () => {
    const mockResult = { textStream: (async function* () {})(), usage: Promise.resolve({}) };
    mockStreamText.mockReturnValue(mockResult);

    const result = await streamWithAbort({
      model: createMockModel(),
      messages: createMockMessages(),
    });

    expect(result).toBe(mockResult);
  });
});

// ---------------------------------------------------------------------------
// generateStructured
// ---------------------------------------------------------------------------

describe("generateStructured", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls generateText with correct model, output config, and prompt", async () => {
    const model = createMockModel();
    mockGenerateText.mockResolvedValue({ output: { name: "test" } });

    const result = await generateStructured({ model, schema: testSchema, prompt: "Generate" });

    const args = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe(model);
    expect(args.prompt).toBe("Generate");
    // output should be an Output.object({ schema }) — just verify it exists
    expect(args.output).toBeDefined();
    expect(result).toEqual({ name: "test" });
  });

  it("passes abortSignal to generateText", async () => {
    const abortSignal = new AbortController().signal;
    mockGenerateText.mockResolvedValue({ output: { name: "x" } });

    await generateStructured({
      model: createMockModel(),
      schema: testSchema,
      prompt: "test",
      abortSignal,
    });

    const args = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(args.abortSignal).toBe(abortSignal);
  });

  it("logs with schema description when present", async () => {
    const schemaWithDesc = z.object({ value: z.number() }).describe("MySchema");
    mockGenerateText.mockResolvedValue({ output: { value: 1 } });

    await generateStructured({
      model: createMockModel(),
      schema: schemaWithDesc,
      prompt: "test",
    });

    expect(logger.info).toHaveBeenCalledWith("Structured output generated", {
      schemaType: "MySchema",
    });
  });

  it("uses 'unknown' for schemaType when no description", async () => {
    mockGenerateText.mockResolvedValue({ output: { name: "x" } });

    await generateStructured({
      model: createMockModel(),
      schema: testSchema,
      prompt: "test",
    });

    expect(logger.info).toHaveBeenCalledWith("Structured output generated", {
      schemaType: "unknown",
    });
  });

  it("throws AppError AI_STREAM_ABORTED on abort error", async () => {
    mockGenerateText.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    try {
      await generateStructured({
        model: createMockModel(),
        schema: testSchema,
        prompt: "test",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      const err = e as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe("AI_STREAM_ABORTED");
    }
  });

  it("throws AppError AI_INVALID_RESPONSE on other errors", async () => {
    mockGenerateText.mockRejectedValue(new Error("Schema validation failed"));

    try {
      await generateStructured({
        model: createMockModel(),
        schema: testSchema,
        prompt: "test",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      const err = e as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe("AI_INVALID_RESPONSE");
      expect(err.message).toContain("Schema validation failed");
    }
  });

  it("handles non-Error rejection in generateText", async () => {
    mockGenerateText.mockRejectedValue("string error");

    try {
      await generateStructured({
        model: createMockModel(),
        schema: testSchema,
        prompt: "test",
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe("AI_INVALID_RESPONSE");
      expect(err.message).toContain("string error");
    }
  });
});
