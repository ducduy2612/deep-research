/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { exportReportAsPdf, sanitizeFilename } from "../export-pdf";

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
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = "Original";
  });

  afterEach(() => {
    document.title = originalTitle;
    vi.restoreAllMocks();
  });

  it("calls window.print with title set to sanitized report name", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {
      // While print is "running", the title should be the sanitized name
      expect(document.title).toBe("My-Research-Report");
    });

    exportReportAsPdf("My Research Report");

    expect(printSpy).toHaveBeenCalledTimes(1);
    // Title restored after print returns
    expect(document.title).toBe("Original");
  });

  it("sanitizes the title before setting it", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {
      expect(document.title).toBe("Hello-World-foo-bar");
    });

    exportReportAsPdf("Hello / World? foo=bar");

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("Original");
  });

  it("restores title even if print throws", () => {
    vi.spyOn(window, "print").mockImplementation(() => {
      throw new Error("User cancelled print");
    });

    expect(() => exportReportAsPdf("Test")).toThrow("User cancelled print");
    // Title should still be restored via finally
    expect(document.title).toBe("Original");
  });
});
