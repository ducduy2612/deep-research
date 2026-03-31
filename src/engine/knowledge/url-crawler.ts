import type { CrawlResult } from "./types";

/** Timeout for local crawl fetch requests (10 seconds). */
const LOCAL_CRAWL_TIMEOUT_MS = 10_000;

/** Timeout for Jina Reader API requests (30 seconds). */
const JINA_TIMEOUT_MS = 30_000;

/**
 * Crawl a URL using Jina Reader API.
 * POSTs to https://r.jina.ai with the URL, returns structured title + content.
 * No API key needed for basic usage.
 */
export async function crawlJina(url: string): Promise<CrawlResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);

  try {
    const response = await fetch("https://r.jina.ai", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jina Reader returned HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const data = json?.data;

    if (!data || typeof data.content !== "string") {
      throw new Error("Unexpected response format from Jina Reader");
    }

    return {
      url,
      title: data.title ?? "",
      content: data.content,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Jina Reader request timed out after ${JINA_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Crawl a URL locally via server-side fetch.
 * Extracts the <title> tag and returns the HTML content.
 */
export async function crawlLocal(url: string): Promise<CrawlResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCAL_CRAWL_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DeepResearch/1.0 (Knowledge Crawler)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extract <title> tag content
    const titleRegex = /<title>(.*?)<\/title>/i;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1].trim() : "";

    return {
      url,
      title,
      content: html,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Local crawl request timed out after ${LOCAL_CRAWL_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
