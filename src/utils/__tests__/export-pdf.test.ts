/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { exportReportAsPdf, sanitizeFilename } from "../export-pdf";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock html2pdf.js — chainable API
const saveMock = vi.fn().mockResolvedValue(undefined);
const fromMock = vi.fn().mockReturnValue({ save: saveMock });
const setMock = vi.fn().mockReturnValue({ from: fromMock });
const html2pdfMock = vi.fn().mockReturnValue({ set: setMock });

vi.mock("html2pdf.js", () => ({
  default: () => html2pdfMock(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  saveMock.mockResolvedValue(undefined);
  fromMock.mockReturnValue({ save: saveMock });
  setMock.mockReturnValue({ from: fromMock });
  html2pdfMock.mockReturnValue({ set: setMock });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe("sanitizeFilename", () => {
  it("replaces special characters with dashes", () => {
    expect(sanitizeFilename("Hello / World? foo=bar")).toBe("Hello-World-foo-bar");
  });

  it("collapses multiple dashes", () => {
    expect(sanitizeFilename("a   ---   b")).toBe("a-b");
  });

  it("trims leading and trailing dashes", () => {
    expect(sanitizeFilename("---hello---")).toBe("hello");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(120);
    expect(sanitizeFilename(long)).toHaveLength(80);
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("preserves unicode-adjacent ASCII letters", () => {
    expect(sanitizeFilename("café au lait")).toBe("caf-au-lait");
  });
});

// ---------------------------------------------------------------------------
// exportReportAsPdf
// ---------------------------------------------------------------------------

describe("exportReportAsPdf", () => {
  it("creates a container, calls html2pdf, and cleans up DOM", async () => {
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tag: string) => origCreateElement(tag),
    );
    vi.spyOn(document.body, "appendChild").mockImplementation(
      (node: Node) => node,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      (node: Node) => node,
    );

    await exportReportAsPdf("# Hello World", "Test Report");

    expect(html2pdfMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalled();
    // Container was removed from DOM
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it("handles html2pdf errors gracefully", async () => {
    saveMock.mockRejectedValue(new Error("PDF engine crashed"));

    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should NOT throw
    await exportReportAsPdf("# Test", "Error Test");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[exportReportAsPdf] Failed to generate PDF:",
      expect.any(Error),
    );

    // Container still cleaned up
    expect(document.body.removeChild).toHaveBeenCalled();
  });
});
