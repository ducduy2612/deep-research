import { nanoid } from "nanoid";

import type { SearchResult } from "@/engine/research/types";
import type { KnowledgeItem } from "@/engine/knowledge/types";

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/**
 * Serialize a single SearchResult as readable Markdown.
 *
 * Includes query heading, research goal, learning section, and a numbered
 * source list. The Sources section is omitted when the array is empty.
 */
export function serializeSearchResultAsMd(result: SearchResult): string {
  const lines: string[] = [
    `# ${result.query}`,
    "",
    `**Research Goal:** ${result.researchGoal}`,
    "",
    "## Learning",
    "",
    result.learning,
  ];

  if (result.sources.length > 0) {
    lines.push("", "## Sources", "");
    lines.push(
      ...result.sources.map(
        (s, i) => `${i + 1}. [${s.title ?? s.url}](${s.url})`,
      ),
    );
  }

  return lines.join("\n");
}

/**
 * Serialize an array of SearchResults as pretty-printed JSON.
 * Includes the full SearchResult shape (query, researchGoal, learning, sources, images).
 */
export function serializeSearchResultsAsJson(results: SearchResult[]): string {
  return JSON.stringify(results, null, 2);
}

// ---------------------------------------------------------------------------
// Knowledge-base converter
// ---------------------------------------------------------------------------

/**
 * Convert a SearchResult into a KnowledgeItem suitable for the knowledge store.
 * Uses "file" type as a generic container — no "research" type exists.
 */
export function searchResultToKnowledgeItem(
  result: SearchResult,
): KnowledgeItem {
  const sourceLines = result.sources
    .map((s) => `- ${s.title ?? s.url}: ${s.url}`)
    .join("\n");

  return {
    id: nanoid(),
    title: result.query,
    content:
      result.learning +
      "\n\nSources:\n" +
      (sourceLines || "(none)"),
    type: "file",
    chunkCount: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
