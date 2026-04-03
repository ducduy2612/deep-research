import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SearchResult } from "@/engine/research/types";

// Mock nanoid for deterministic test output
vi.mock("nanoid", () => ({
  nanoid: () => "test-id-123",
}));

import {
  serializeSearchResultAsMd,
  serializeSearchResultsAsJson,
  searchResultToKnowledgeItem,
} from "@/utils/export-search";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const typicalResult: SearchResult = {
  query: "What is quantum computing?",
  researchGoal: "Understand the basics of quantum computing",
  learning: "Quantum computing uses qubits which can be in superposition.",
  sources: [
    { url: "https://example.com/quantum", title: "Quantum Basics" },
    { url: "https://example.com/qubits", title: "Qubits Explained" },
  ],
  images: [],
};

const noSourcesResult: SearchResult = {
  query: "empty search",
  researchGoal: "Find nothing",
  learning: "No results found.",
  sources: [],
  images: [],
};

const untitledSourceResult: SearchResult = {
  query: "untitled sources",
  researchGoal: "Test fallback",
  learning: "Some learning",
  sources: [
    { url: "https://example.com/a" },
    { url: "https://example.com/b" },
  ],
  images: [],
};

// ---------------------------------------------------------------------------
// serializeSearchResultAsMd
// ---------------------------------------------------------------------------

describe("serializeSearchResultAsMd", () => {
  it("formats typical result with all sections", () => {
    const md = serializeSearchResultAsMd(typicalResult);

    expect(md).toContain("# What is quantum computing?");
    expect(md).toContain("**Research Goal:** Understand the basics of quantum computing");
    expect(md).toContain("## Learning");
    expect(md).toContain("Quantum computing uses qubits");
    expect(md).toContain("## Sources");
    expect(md).toContain('1. [Quantum Basics](https://example.com/quantum)');
    expect(md).toContain('2. [Qubits Explained](https://example.com/qubits)');
  });

  it("omits Sources section when sources array is empty", () => {
    const md = serializeSearchResultAsMd(noSourcesResult);

    expect(md).not.toContain("## Sources");
    expect(md).toContain("# empty search");
    expect(md).toContain("## Learning");
    expect(md).toContain("No results found.");
  });

  it("falls back to URL when source has no title", () => {
    const md = serializeSearchResultAsMd(untitledSourceResult);

    expect(md).toContain('1. [https://example.com/a](https://example.com/a)');
    expect(md).toContain('2. [https://example.com/b](https://example.com/b)');
  });
});

// ---------------------------------------------------------------------------
// serializeSearchResultsAsJson
// ---------------------------------------------------------------------------

describe("serializeSearchResultsAsJson", () => {
  it("round-trips a single result through JSON parse", () => {
    const json = serializeSearchResultsAsJson([typicalResult]);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].query).toBe(typicalResult.query);
    expect(parsed[0].researchGoal).toBe(typicalResult.researchGoal);
    expect(parsed[0].learning).toBe(typicalResult.learning);
    expect(parsed[0].sources).toEqual(typicalResult.sources);
    expect(parsed[0].images).toEqual(typicalResult.images);
  });

  it("serializes empty array as '[]'", () => {
    const json = serializeSearchResultsAsJson([]);
    expect(json).toBe("[]");
  });

  it("handles multiple results with correct length", () => {
    const results = [typicalResult, noSourcesResult, untitledSourceResult];
    const json = serializeSearchResultsAsJson(results);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].query).toBe("What is quantum computing?");
    expect(parsed[1].query).toBe("empty search");
    expect(parsed[2].query).toBe("untitled sources");
  });
});

// ---------------------------------------------------------------------------
// searchResultToKnowledgeItem
// ---------------------------------------------------------------------------

describe("searchResultToKnowledgeItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a valid KnowledgeItem with correct types", () => {
    const item = searchResultToKnowledgeItem(typicalResult);

    expect(typeof item.id).toBe("string");
    expect(item.id).toBe("test-id-123");
    expect(item.type).toBe("file");
    expect(item.chunkCount).toBe(1);
    expect(typeof item.createdAt).toBe("number");
    expect(typeof item.updatedAt).toBe("number");
  });

  it("includes learning and formatted sources in content", () => {
    const item = searchResultToKnowledgeItem(typicalResult);

    expect(item.content).toContain("Quantum computing uses qubits");
    expect(item.content).toContain("Sources:");
    expect(item.content).toContain("- Quantum Basics: https://example.com/quantum");
    expect(item.content).toContain("- Qubits Explained: https://example.com/qubits");
  });

  it("uses query as title", () => {
    const item = searchResultToKnowledgeItem(typicalResult);
    expect(item.title).toBe("What is quantum computing?");
  });

  it("handles empty sources with fallback text", () => {
    const item = searchResultToKnowledgeItem(noSourcesResult);
    expect(item.content).toContain("(none)");
  });
});
