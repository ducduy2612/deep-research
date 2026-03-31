import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { crawlJina, crawlLocal } from "../url-crawler";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("crawlLocal", () => {
  it("extracts title from HTML and returns content", async () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body><p>Hello, world!</p></body>
</html>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve(html),
    });

    const result = await crawlLocal("https://example.com");

    expect(result).toEqual({
      url: "https://example.com",
      title: "Test Page",
      content: html,
    });
  });

  it("returns empty title when no <title> tag", async () => {
    const html = "<html><body>No title here</body></html>";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve(html),
    });

    const result = await crawlLocal("https://example.com/notitle");
    expect(result.title).toBe("");
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(crawlLocal("https://example.com/missing")).rejects.toThrow(
      "Failed to fetch URL: HTTP 404",
    );
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(crawlLocal("https://unreachable.example")).rejects.toThrow(
      "Network error",
    );
  });

  it("throws on timeout", async () => {
    // Simulate AbortError
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(crawlLocal("https://slow.example")).rejects.toThrow("timed out");
  });
});

describe("crawlJina", () => {
  it("returns structured result from Jina Reader API", async () => {
    const jinaResponse = {
      data: {
        title: "Example Article",
        content: "This is the article content from Jina Reader.",
        url: "https://example.com/article",
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(jinaResponse),
    });

    const result = await crawlJina("https://example.com/article");

    expect(result).toEqual({
      url: "https://example.com/article",
      title: "Example Article",
      content: "This is the article content from Jina Reader.",
    });

    // Verify fetch was called with correct endpoint and body
    expect(mockFetch).toHaveBeenCalledWith(
      "https://r.jina.ai",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ url: "https://example.com/article" }),
      }),
    );
  });

  it("throws on non-OK HTTP response from Jina", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    await expect(crawlJina("https://example.com")).rejects.toThrow(
      "Jina Reader returned HTTP 429",
    );
  });

  it("throws on unexpected response format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ data: { title: "No content here" } }),
    });

    await expect(crawlJina("https://example.com")).rejects.toThrow(
      "Unexpected response format",
    );
  });

  it("throws on timeout", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(crawlJina("https://slow.example")).rejects.toThrow("timed out");
  });
});
