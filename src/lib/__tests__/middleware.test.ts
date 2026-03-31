import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareHandler } from "@/lib/middleware/compose";
import { runMiddleware } from "@/lib/middleware/compose";
import { createVerifySignatureHandler } from "@/lib/middleware/verify-signature";
import { createInjectKeysHandler } from "@/lib/middleware/inject-keys";
import { createCheckDisabledHandler } from "@/lib/middleware/check-disabled";
import { createCheckModelFilterHandler } from "@/lib/middleware/check-model-filter";

function mockRequest(
  url = "http://localhost:3000/api/test",
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(new Request(url, { headers }));
}

const passthrough: MiddlewareHandler = async (_req, next) => next();

// ---------------------------------------------------------------------------
// compose()
// ---------------------------------------------------------------------------

describe("compose", () => {
  it("calls handlers in order", async () => {
    const order: number[] = [];
    const h = (n: number): MiddlewareHandler => async (_req, next) => { order.push(n); return next(); };
    await runMiddleware(mockRequest(), [h(1), h(2), h(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("short-circuits when a handler returns a Response", async () => {
    const order: number[] = [];
    const h1: MiddlewareHandler = async (_req, next) => { order.push(1); return next(); };
    const h2: MiddlewareHandler = async () => { order.push(2); return new Response("blocked", { status: 403 }); };
    const h3: MiddlewareHandler = async (_req, next) => { order.push(3); return next(); };
    const response = await runMiddleware(mockRequest(), [h1, h2, h3]);
    expect(order).toEqual([1, 2]);
    expect(response.status).toBe(403);
  });

  it("returns NextResponse.next() when no handler short-circuits", async () => {
    expect(await runMiddleware(mockRequest(), [passthrough])).toBeInstanceOf(NextResponse);
  });

  it("works with empty handler list", async () => {
    expect(await runMiddleware(mockRequest(), [])).toBeInstanceOf(NextResponse);
  });

  it("works with a single handler", async () => {
    const handler: MiddlewareHandler = async () => new Response("single", { status: 200 });
    const res = await runMiddleware(mockRequest(), [handler]);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("single");
  });
});

// ---------------------------------------------------------------------------
// verify-signature handler
// ---------------------------------------------------------------------------

describe("createVerifySignatureHandler", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z")); });
  afterEach(() => { vi.useRealTimers(); });

  const NOW = 1705320000000;
  const PASSWORD = "test-access-password";

  it("passthrough when no password configured", async () => {
    expect(await runMiddleware(mockRequest(), [createVerifySignatureHandler(() => undefined)])).toBeInstanceOf(NextResponse);
  });

  it("returns 401 when Authorization header missing", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { "X-Timestamp": NOW.toString() }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-Timestamp header missing", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: "sig" }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid timestamp format", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: "sig", "X-Timestamp": "not-a-number" }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong signature", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: "wrong", "X-Timestamp": NOW.toString() }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(401);
  });

  it("passthrough for valid signature", async () => {
    const { generateSignature } = await import("@/lib/signature");
    const sig = generateSignature(PASSWORD, NOW);
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: sig, "X-Timestamp": NOW.toString() }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(200);
  });

  it("returns 401 for expired timestamp", async () => {
    const { generateSignature } = await import("@/lib/signature");
    const expiredTs = NOW - 31_000;
    const sig = generateSignature(PASSWORD, expiredTs);
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: sig, "X-Timestamp": expiredTs.toString() }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(401);
  });

  it("returns 401 for negative timestamp", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: "sig", "X-Timestamp": "-1000" }), [createVerifySignatureHandler(() => PASSWORD)]);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// inject-keys handler
// ---------------------------------------------------------------------------

describe("createInjectKeysHandler", () => {
  it("passthrough when no provider configs", async () => {
    expect(await runMiddleware(mockRequest(), [createInjectKeysHandler(() => [])])).toBeInstanceOf(NextResponse);
  });

  it("injects X-Provider-Configs header when configs exist", async () => {
    const configs = [
      { id: "google" as const, apiKey: "test-key", models: [] },
      { id: "openai" as const, apiKey: "test-key-2", models: [] },
    ];
    const res = await runMiddleware(mockRequest(), [createInjectKeysHandler(() => configs)]);
    const header = res.headers.get("X-Provider-Configs");
    expect(header).toBeTruthy();
    const parsed = JSON.parse(header!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe("google");
  });
});

// ---------------------------------------------------------------------------
// check-disabled handler
// ---------------------------------------------------------------------------

describe("createCheckDisabledHandler", () => {
  it("passthrough when no providers disabled", async () => {
    expect(await runMiddleware(mockRequest(), [createCheckDisabledHandler(() => new Set())])).toBeInstanceOf(NextResponse);
  });

  it("returns 403 when provider in URL path is disabled", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/chat/google"), [createCheckDisabledHandler(() => new Set(["google"]))]);
    expect(res.status).toBe(403);
  });

  it("returns 403 when X-Provider-Id matches disabled provider", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { "X-Provider-Id": "openai" }), [createCheckDisabledHandler(() => new Set(["openai"]))]);
    expect(res.status).toBe(403);
  });

  it("passthrough when provider not disabled", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/chat/openai"), [createCheckDisabledHandler(() => new Set(["google"]))]);
    expect(res.status).toBe(200);
  });

  it("passthrough when no provider determined from path", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/"), [createCheckDisabledHandler(() => new Set(["google"]))]);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// check-model-filter handler
// ---------------------------------------------------------------------------

describe("createCheckModelFilterHandler", () => {
  it("passthrough when no model list configured", async () => {
    expect(await runMiddleware(mockRequest(), [createCheckModelFilterHandler(() => new Set())])).toBeInstanceOf(NextResponse);
  });

  it("returns 403 when model not in allowed list", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test?model=gpt-4o"), [createCheckModelFilterHandler(() => new Set(["gemini-2.5-pro"]))]);
    expect(res.status).toBe(403);
  });

  it("passthrough when model is allowed", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test?model=gpt-4o"), [createCheckModelFilterHandler(() => new Set(["gemini-2.5-pro", "gpt-4o"]))]);
    expect(res.status).toBe(200);
  });

  it("checks X-Model-Id header before query param", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test?model=gemini-2.5-pro", { "X-Model-Id": "gpt-4o" }), [createCheckModelFilterHandler(() => new Set(["gemini-2.5-pro"]))]);
    expect(res.status).toBe(403);
  });

  it("passthrough when no model specified", async () => {
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test"), [createCheckModelFilterHandler(() => new Set(["gemini-2.5-pro"]))]);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Full chain integration
// ---------------------------------------------------------------------------

describe("full middleware chain", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z")); });
  afterEach(() => { vi.useRealTimers(); });

  const NOW = 1705320000000;
  const PASSWORD = "chain-password";

  it("blocks at signature verification, later handlers not called", async () => {
    const disabledCalled = vi.fn();
    const handlers: MiddlewareHandler[] = [
      createVerifySignatureHandler(() => PASSWORD),
      async (_req, next) => { disabledCalled(); return next(); },
    ];
    const res = await runMiddleware(mockRequest(), handlers);
    expect(res.status).toBe(401);
    expect(disabledCalled).not.toHaveBeenCalled();
  });

  it("allows request through full chain with valid signature", async () => {
    const { generateSignature } = await import("@/lib/signature");
    const sig = generateSignature(PASSWORD, NOW);
    const handlers: MiddlewareHandler[] = [
      createVerifySignatureHandler(() => PASSWORD),
      createCheckDisabledHandler(() => new Set()),
      createCheckModelFilterHandler(() => new Set()),
    ];
    const res = await runMiddleware(mockRequest("http://localhost:3000/api/test", { Authorization: sig, "X-Timestamp": NOW.toString() }), handlers);
    expect(res.status).toBe(200);
  });
});
