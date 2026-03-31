import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  parseDomainList,
  matchDomain,
  isUrlAllowed,
  applyDomainFilters,
} from "../domain-filter";
import { filterCitationImages } from "../citation-images";
import type { SearchProviderResult } from "../types";

// ---------------------------------------------------------------------------
// normalizeDomain
// ---------------------------------------------------------------------------

describe("normalizeDomain", () => {
  it("strips http:// protocol", () => {
    expect(normalizeDomain("http://example.com")).toBe("example.com");
  });

  it("strips https:// protocol", () => {
    expect(normalizeDomain("https://example.com")).toBe("example.com");
  });

  it("strips www. prefix", () => {
    expect(normalizeDomain("www.example.com")).toBe("example.com");
  });

  it("strips leading wildcard dot", () => {
    expect(normalizeDomain("*.example.com")).toBe("example.com");
  });

  it("strips port number", () => {
    expect(normalizeDomain("example.com:8080")).toBe("example.com");
  });

  it("strips trailing path", () => {
    expect(normalizeDomain("example.com/path/to/page")).toBe("example.com");
  });

  it("strips all decorations at once", () => {
    expect(
      normalizeDomain("https://www.*.sub.example.com:3000/path?q=1"),
    ).toBe("sub.example.com");
  });

  it("lowercases the domain", () => {
    expect(normalizeDomain("HTTPS://WWW.EXAMPLE.COM")).toBe("example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeDomain("  example.com  ")).toBe("example.com");
  });

  it("returns bare domain unchanged", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });
});

// ---------------------------------------------------------------------------
// parseDomainList
// ---------------------------------------------------------------------------

describe("parseDomainList", () => {
  it("splits comma-separated domains", () => {
    expect(parseDomainList("example.com, test.org, docs.io")).toEqual([
      "example.com",
      "test.org",
      "docs.io",
    ]);
  });

  it("splits newline-separated domains", () => {
    expect(parseDomainList("example.com\ntest.org\ndocs.io")).toEqual([
      "example.com",
      "test.org",
      "docs.io",
    ]);
  });

  it("splits whitespace-separated domains", () => {
    expect(parseDomainList("example.com   test.org   docs.io")).toEqual([
      "example.com",
      "test.org",
      "docs.io",
    ]);
  });

  it("handles mixed separators", () => {
    expect(parseDomainList("example.com, test.org\ndocs.io  other.net")).toEqual(
      ["example.com", "test.org", "docs.io", "other.net"],
    );
  });

  it("normalizes each domain", () => {
    expect(
      parseDomainList("https://www.example.com, *.test.org:8080"),
    ).toEqual(["example.com", "test.org"]);
  });

  it("returns empty array for empty string", () => {
    expect(parseDomainList("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(parseDomainList("   \n  \t  ")).toEqual([]);
  });

  it("filters out empty tokens", () => {
    expect(parseDomainList("example.com,, ,test.org")).toEqual([
      "example.com",
      "test.org",
    ]);
  });
});

// ---------------------------------------------------------------------------
// matchDomain
// ---------------------------------------------------------------------------

describe("matchDomain", () => {
  it("matches exact domain", () => {
    expect(matchDomain("example.com", "example.com")).toBe(true);
  });

  it("matches subdomain", () => {
    expect(matchDomain("docs.example.com", "example.com")).toBe(true);
  });

  it("matches deeply nested subdomain", () => {
    expect(matchDomain("a.b.c.example.com", "example.com")).toBe(true);
  });

  it("does not match unrelated domain", () => {
    expect(matchDomain("notexample.com", "example.com")).toBe(false);
  });

  it("does not match partial suffix without dot", () => {
    // "xexample.com" ends with "example.com" but not ".example.com"
    expect(matchDomain("xexample.com", "example.com")).toBe(false);
  });

  it("is case-sensitive (domains should be pre-normalized)", () => {
    // After normalization, both will be lowercase, but test raw behavior
    expect(matchDomain("Example.com", "example.com")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isUrlAllowed
// ---------------------------------------------------------------------------

describe("isUrlAllowed", () => {
  it("allows any URL when no filters are active", () => {
    expect(isUrlAllowed("https://example.com", [], [])).toBe(true);
  });

  it("allows URL matching include domain", () => {
    expect(
      isUrlAllowed("https://docs.example.com/page", ["example.com"], []),
    ).toBe(true);
  });

  it("blocks URL not in include list", () => {
    expect(
      isUrlAllowed("https://other.com/page", ["example.com"], []),
    ).toBe(false);
  });

  it("blocks URL matching exclude domain even if in include list", () => {
    // Exclude takes precedence
    expect(
      isUrlAllowed("https://bad.example.com", ["example.com"], ["example.com"]),
    ).toBe(false);
  });

  it("blocks excluded subdomain", () => {
    expect(
      isUrlAllowed("https://spam.other.com", [], ["other.com"]),
    ).toBe(false);
  });

  it("allows URL when excluded domain does not match", () => {
    expect(
      isUrlAllowed("https://safe.com", [], ["other.com"]),
    ).toBe(true);
  });

  it("handles include-only filtering", () => {
    expect(
      isUrlAllowed("https://docs.example.com", ["example.com"], []),
    ).toBe(true);
    expect(
      isUrlAllowed("https://other.com", ["example.com"], []),
    ).toBe(false);
  });

  it("handles exclude-only filtering", () => {
    expect(
      isUrlAllowed("https://example.com", [], ["blocked.com"]),
    ).toBe(true);
    expect(
      isUrlAllowed("https://blocked.com", [], ["blocked.com"]),
    ).toBe(false);
  });

  it("returns false for invalid URL when include domains are set", () => {
    expect(isUrlAllowed("not-a-url", ["example.com"], [])).toBe(false);
  });

  it("returns true for invalid URL when include domains are empty", () => {
    expect(isUrlAllowed("not-a-url", [], [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyDomainFilters
// ---------------------------------------------------------------------------

describe("applyDomainFilters", () => {
  const result: SearchProviderResult = {
    sources: [
      { url: "https://example.com/page1", title: "Example 1" },
      { url: "https://docs.example.com/page2", title: "Docs" },
      { url: "https://other.com/page3", title: "Other" },
    ],
    images: [
      { url: "https://img.example.com/photo.jpg", description: "Photo" },
      { url: "https://cdn.other.com/logo.png", description: "Logo" },
    ],
  };

  it("returns same reference when no filters are active", () => {
    const filtered = applyDomainFilters(result, [], []);
    expect(filtered).toBe(result);
  });

  it("filters sources and images to include domain only", () => {
    const filtered = applyDomainFilters(result, ["example.com"], []);
    expect(filtered.sources).toHaveLength(2);
    expect(filtered.images).toHaveLength(1);
    expect(filtered.sources[0]?.url).toBe("https://example.com/page1");
    expect(filtered.images[0]?.url).toBe("https://img.example.com/photo.jpg");
  });

  it("excludes domains from sources and images", () => {
    const filtered = applyDomainFilters(result, [], ["other.com"]);
    expect(filtered.sources).toHaveLength(2);
    expect(filtered.images).toHaveLength(1);
    expect(filtered.sources.every((s) => !s.url.includes("other.com"))).toBe(
      true,
    );
  });

  it("exclude takes precedence over include", () => {
    const filtered = applyDomainFilters(result, ["example.com"], ["example.com"]);
    expect(filtered.sources).toHaveLength(0);
    expect(filtered.images).toHaveLength(0);
  });

  it("filters both sources and images independently", () => {
    const mixed: SearchProviderResult = {
      sources: [{ url: "https://allowed.com/a" }],
      images: [{ url: "https://blocked.com/img.png" }],
    };
    const filtered = applyDomainFilters(mixed, ["allowed.com"], ["blocked.com"]);
    expect(filtered.sources).toHaveLength(1);
    expect(filtered.images).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterCitationImages
// ---------------------------------------------------------------------------

describe("filterCitationImages", () => {
  const result: SearchProviderResult = {
    sources: [{ url: "https://example.com", title: "Example" }],
    images: [
      { url: "https://img.example.com/photo.jpg", description: "Photo" },
    ],
  };

  it("returns result unchanged when enabled", () => {
    const filtered = filterCitationImages(result, true);
    expect(filtered).toBe(result);
  });

  it("strips images when disabled", () => {
    const filtered = filterCitationImages(result, false);
    expect(filtered.sources).toEqual(result.sources);
    expect(filtered.images).toEqual([]);
  });

  it("preserves sources when disabled", () => {
    const filtered = filterCitationImages(result, false);
    expect(filtered.sources).toHaveLength(1);
    expect(filtered.sources[0]?.url).toBe("https://example.com");
  });

  it("returns empty images array (not undefined) when disabled", () => {
    const filtered = filterCitationImages(result, false);
    expect(Array.isArray(filtered.images)).toBe(true);
    expect(filtered.images).toHaveLength(0);
  });
});
