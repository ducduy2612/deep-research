import { describe, it, expect } from "vitest";
import { parseTextContent, getParserCategory } from "../file-parser";

describe("parseTextContent", () => {
  it("decodes UTF-8 text from ArrayBuffer", () => {
    const text = "Hello, world!";
    const buffer = new TextEncoder().encode(text).buffer;
    expect(parseTextContent(buffer, "text/plain")).toBe(text);
  });

  it("handles text/plain MIME type", () => {
    const text = "plain text content";
    const buffer = new TextEncoder().encode(text).buffer;
    expect(parseTextContent(buffer, "text/plain")).toBe(text);
  });

  it("handles text/csv MIME type", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    const buffer = new TextEncoder().encode(csv).buffer;
    expect(parseTextContent(buffer, "text/csv")).toBe(csv);
  });

  it("handles application/json MIME type", () => {
    const json = '{"key": "value", "number": 42}';
    const buffer = new TextEncoder().encode(json).buffer;
    expect(parseTextContent(buffer, "application/json")).toBe(json);
  });

  it("handles application/xml MIME type", () => {
    const xml = "<root><item>test</item></root>";
    const buffer = new TextEncoder().encode(xml).buffer;
    expect(parseTextContent(buffer, "application/xml")).toBe(xml);
  });

  it("handles text/markdown MIME type", () => {
    const md = "# Title\n\nSome **bold** text.";
    const buffer = new TextEncoder().encode(md).buffer;
    expect(parseTextContent(buffer, "text/markdown")).toBe(md);
  });

  it("handles image/svg+xml MIME type", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    const buffer = new TextEncoder().encode(svg).buffer;
    expect(parseTextContent(buffer, "image/svg+xml")).toBe(svg);
  });

  it("handles application/x-yaml MIME type", () => {
    const yaml = "key:\n  nested: value\n  list:\n    - item1\n    - item2";
    const buffer = new TextEncoder().encode(yaml).buffer;
    expect(parseTextContent(buffer, "application/x-yaml")).toBe(yaml);
  });

  it("throws for unsupported MIME type", () => {
    const buffer = new TextEncoder().encode("data").buffer;
    expect(() => parseTextContent(buffer, "application/pdf")).toThrow(
      "Unsupported text MIME type",
    );
  });

  it("handles empty file content", () => {
    const buffer = new ArrayBuffer(0);
    expect(parseTextContent(buffer, "text/plain")).toBe("");
  });

  it("preserves Unicode characters", () => {
    const unicode = "Hello 世界 🌍 مرحبا Привет";
    const buffer = new TextEncoder().encode(unicode).buffer;
    expect(parseTextContent(buffer, "text/plain")).toBe(unicode);
  });
});

describe("getParserCategory", () => {
  it("returns 'text' for text/* MIME types", () => {
    expect(getParserCategory("text/plain")).toBe("text");
    expect(getParserCategory("text/csv")).toBe("text");
    expect(getParserCategory("text/html")).toBe("text");
  });

  it("returns 'text' for known text-based application types", () => {
    expect(getParserCategory("application/json")).toBe("text");
    expect(getParserCategory("application/xml")).toBe("text");
    expect(getParserCategory("image/svg+xml")).toBe("text");
  });

  it("returns 'pdf' for application/pdf", () => {
    expect(getParserCategory("application/pdf")).toBe("pdf");
  });

  it("returns 'office' for Office MIME types", () => {
    expect(
      getParserCategory(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("office");
    expect(
      getParserCategory("application/vnd.oasis.opendocument.text"),
    ).toBe("office");
  });

  it("throws for unsupported MIME types", () => {
    expect(() => getParserCategory("image/png")).toThrow("Unsupported file type");
    expect(() => getParserCategory("video/mp4")).toThrow("Unsupported file type");
  });
});
