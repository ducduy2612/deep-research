/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { downloadBlob } from "../download";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockObjectUrl() {
  const createObjectURL = vi.fn(() => "blob:http://localhost/fake");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", {
    createObjectURL,
    revokeObjectURL,
  });
  return { createObjectURL, revokeObjectURL };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("downloadBlob", () => {
  it("creates a Blob from string content with default MIME type", () => {
    const { revokeObjectURL } = mockObjectUrl();
    const clickSpy = vi.fn();

    const anchorSpy = vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      style: { display: "" },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    vi.spyOn(document.body, "appendChild").mockImplementation(() => null as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => null as unknown as HTMLAnchorElement);

    downloadBlob("test.md", "# Hello");

    expect(anchorSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled(); // deferred via setTimeout
  });

  it("uses the provided Blob directly without wrapping", () => {
    mockObjectUrl();
    const clickSpy = vi.fn();

    const blob = new Blob(["data"], { type: "application/pdf" });

    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      style: { display: "" },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    vi.spyOn(document.body, "appendChild").mockImplementation(() => null as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => null as unknown as HTMLAnchorElement);

    downloadBlob("report.pdf", blob);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("uses custom mimeType for string content", () => {
    const { createObjectURL } = mockObjectUrl();
    const clickSpy = vi.fn();

    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      style: { display: "" },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    vi.spyOn(document.body, "appendChild").mockImplementation(() => null as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => null as unknown as HTMLAnchorElement);

    downloadBlob("data.json", '{"key":"val"}', "application/json");

    // The blob was created with custom mimeType, so createObjectURL was called
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalled();
  });
});
