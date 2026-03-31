import type { SearchProviderResult } from "./types";

// ---------------------------------------------------------------------------
// Domain utilities
// ---------------------------------------------------------------------------

/**
 * Normalize a domain string by stripping protocol, www prefix, leading
 * wildcards, port numbers, and trailing paths.
 */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^\*\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

/**
 * Split a raw string on whitespace, commas, and newlines, then normalize
 * each token. Returns an array of clean domain strings (empty strings
 * removed).
 */
export function parseDomainList(value: string): string[] {
  return value
    .split(/[\s,\n]+/g)
    .map((item) => normalizeDomain(item))
    .filter((item) => item.length > 0);
}

/**
 * Check whether `hostname` matches `domain` — either exactly or as a
 * subdomain (e.g. `docs.example.com` matches `example.com`).
 */
export function matchDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Determine whether a URL is allowed given include and exclude domain
 * lists. Exclude takes precedence over include. If no include domains are
 * specified, all non-excluded URLs are allowed.
 */
export function isUrlAllowed(
  url: string,
  includeDomains: string[],
  excludeDomains: string[],
): boolean {
  try {
    const hostname = normalizeDomain(new URL(url).hostname);
    if (excludeDomains.some((domain) => matchDomain(hostname, domain))) {
      return false;
    }
    if (includeDomains.length === 0) {
      return true;
    }
    return includeDomains.some((domain) => matchDomain(hostname, domain));
  } catch {
    return includeDomains.length === 0;
  }
}

/**
 * Filter a search result's sources and images based on include/exclude
 * domain lists. Exclude takes precedence. Returns the original object
 * reference when no filters are active.
 */
export function applyDomainFilters(
  result: SearchProviderResult,
  includeDomains: string[],
  excludeDomains: string[],
): SearchProviderResult {
  if (includeDomains.length === 0 && excludeDomains.length === 0) {
    return result;
  }

  return {
    sources: result.sources.filter((source) =>
      isUrlAllowed(source.url, includeDomains, excludeDomains),
    ),
    images: result.images.filter((image) =>
      isUrlAllowed(image.url, includeDomains, excludeDomains),
    ),
  };
}
