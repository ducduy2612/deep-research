import { NextResponse } from "next/server";
import { z } from "zod";
import { crawlJina, crawlLocal } from "@/engine/knowledge/url-crawler";
import { chunkContent } from "@/engine/knowledge/chunker";

export const runtime = "nodejs";

const crawlRequestSchema = z.object({
  url: z.string().url(),
  crawler: z.enum(["jina", "local"]),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = crawlRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json(
        { error: `Validation failed: ${issues}` },
        { status: 400 },
      );
    }

    const { url, crawler } = parsed.data;

    let result;
    try {
      if (crawler === "jina") {
        result = await crawlJina(url);
      } else {
        result = await crawlLocal(url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Crawl failed";

      // Distinguish timeout vs upstream errors
      if (message.includes("timed out")) {
        console.error(`[knowledge:crawl] Timeout for ${url}: ${message}`);
        return NextResponse.json(
          { error: message },
          { status: 504 },
        );
      }

      console.error(`[knowledge:crawl] Error for ${url}: ${message}`);
      return NextResponse.json(
        { error: message },
        { status: 502 },
      );
    }

    const chunks = chunkContent(result.content);

    console.info(
      `[knowledge:crawl] Crawled "${result.title}" (${url}): ${result.content.length} chars → ${chunks.length} chunks`,
    );

    return NextResponse.json({
      url: result.url,
      title: result.title,
      content: result.content,
      chunkCount: chunks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl error";
    console.error("[knowledge:crawl] Unexpected error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
