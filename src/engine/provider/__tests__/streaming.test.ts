import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be before any import that references the mocked modules
// ---------------------------------------------------------------------------

const mockStreamText = vi.fn<(...args: unknown[]) => unknown>();
const mockGenerateObject = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: (...args: unknown[]) => mockStreamText(...args),
    generateObject: (...args: unknown[]) => mockGenerateObject(...args),
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
  ({ __type: "language-model" }) as unknown as Parameters<typeof mockStreamText>[0];
const createMockMessages = () => [{ role: "user" as const, content: "Hello!" }];

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
      usage: { promptTokens: 100, completionTokens: 50 },
    });

    expect(logger.info).toHaveBeenCalledWith("Stream finished", {
      promptTokens: 100,
      completionTokens: 50,
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

  it("calls generateObject with correct model, schema, and prompt", async () => {
    const model = createMockModel();
    const schema = { description: "TestSchema" } as unknown as Parameters<typeof generateStructured>[0]["schema"];
    mockGenerateObject.mockResolvedValue({ object: { name: "test" } });

    const result = await generateStructured({ model, schema, prompt: "Generate" });

    const args = mockGenerateObject.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe(model);
    expect(args.schema).toBe(schema);
    expect(args.prompt).toBe("Generate");
    expect(result).toEqual({ name: "test" });
  });

  it("passes abortSignal to generateObject", async () => {
    const abortSignal = new AbortController().signal;
    mockGenerateObject.mockResolvedValue({ object: {} });

    await generateStructured({
      model: createMockModel(),
      schema: {} as Parameters<typeof generateStructured>[0]["schema"],
      prompt: "test",
      abortSignal,
    });

    const args = mockGenerateObject.mock.calls[0][0] as Record<string, unknown>;
    expect(args.abortSignal).toBe(abortSignal);
  });

  it("logs with schema description when present", async () => {
    const schema = { description: "MySchema" } as unknown as Parameters<typeof generateStructured>[0]["schema"];
    mockGenerateObject.mockResolvedValue({ object: {} });

    await generateStructured({
      model: createMockModel(),
      schema,
      prompt: "test",
    });

    expect(logger.info).toHaveBeenCalledWith("Structured output generated", {
      schemaType: "MySchema",
    });
  });

  it("uses 'unknown' for schemaType when no description", async () => {
    mockGenerateObject.mockResolvedValue({ object: {} });

    await generateStructured({
      model: createMockModel(),
      schema: {} as Parameters<typeof generateStructured>[0]["schema"],
      prompt: "test",
    });

    expect(logger.info).toHaveBeenCalledWith("Structured output generated", {
      schemaType: "unknown",
    });
  });

  it("throws AppError AI_STREAM_ABORTED on abort error", async () => {
    mockGenerateObject.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    try {
      await generateStructured({
        model: createMockModel(),
        schema: {} as Parameters<typeof generateStructured>[0]["schema"],
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
    mockGenerateObject.mockRejectedValue(new Error("Schema validation failed"));

    try {
      await generateStructured({
        model: createMockModel(),
        schema: {} as Parameters<typeof generateStructured>[0]["schema"],
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

  it("handles non-Error rejection in generateObject", async () => {
    mockGenerateObject.mockRejectedValue("string error");

    try {
      await generateStructured({
        model: createMockModel(),
        schema: {} as Parameters<typeof generateStructured>[0]["schema"],
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
