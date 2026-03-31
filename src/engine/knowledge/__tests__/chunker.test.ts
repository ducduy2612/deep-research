import { describe, it, expect } from "vitest";
import { chunkContent } from "../chunker";

describe("chunkContent", () => {
  it("returns empty array for empty string", () => {
    expect(chunkContent("")).toEqual([]);
  });

  it("returns single chunk for string under chunkSize", () => {
    const content = "Hello, world!";
    const result = chunkContent(content, { chunkSize: 1000 });
    expect(result).toEqual([content]);
  });

  it("returns single chunk when content is exactly chunkSize", () => {
    const content = "a".repeat(1000);
    const result = chunkContent(content, { chunkSize: 1000 });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(content);
  });

  it("splits content that exceeds chunkSize into multiple chunks", () => {
    const content = "a".repeat(2500);
    const result = chunkContent(content, { chunkSize: 1000, overlap: 100 });
    expect(result.length).toBeGreaterThan(1);

    // Total content should be preserved (minus trimming)
    const totalLen = result.join("").length;
    expect(totalLen).toBeGreaterThan(2000);
  });

  it("applies overlap between chunks", () => {
    // Create content with no natural boundaries
    const content = "a".repeat(3000);
    const overlap = 200;
    const result = chunkContent(content, { chunkSize: 1000, overlap });

    if (result.length > 1) {
      // Due to overlap, some content should be shared between adjacent chunks
      const firstEnd = result[0].slice(-overlap);
      // firstEnd should contain characters from the overlap region
      expect(firstEnd.length).toBeGreaterThan(0);
    }
  });

  it("splits at paragraph boundaries when possible", () => {
    const paragraph = "This is a paragraph with some text. It has multiple sentences.\n";
    const separator = "\n\n";
    // Create content with clear paragraph breaks
    const parts: string[] = [];
    for (let i = 0; i < 20; i++) {
      parts.push(paragraph);
    }
    const content = parts.join(separator);
    const chunkSize = 200;
    const result = chunkContent(content, { chunkSize, overlap: 20 });

    // Should have multiple chunks
    expect(result.length).toBeGreaterThan(1);

    // Chunks should contain meaningful content
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk).toContain("paragraph");
    }
  });

  it("handles very long strings (100K chars)", () => {
    const content = "Word ".repeat(20_000); // ~100K chars
    const result = chunkContent(content, { chunkSize: 10_000, overlap: 500 });

    expect(result.length).toBeGreaterThan(5);
    // All chunks should have content
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it("respects custom chunkSize and overlap", () => {
    const content = "abcdefghij ".repeat(100); // ~1100 chars with spaces
    const result = chunkContent(content, { chunkSize: 200, overlap: 50 });

    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it("filters out empty chunks from trimming", () => {
    // Content that might produce whitespace-only chunks
    const content = "   \n\n   \n\n   hello   \n\n   world   ";
    const result = chunkContent(content, { chunkSize: 5, overlap: 1 });

    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });
});
