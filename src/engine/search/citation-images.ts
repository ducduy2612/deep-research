import type { SearchProviderResult } from "./types";

/**
 * Conditionally strip images from a search result based on the
 * citation-images toggle. When disabled, returns the result with an empty
 * images array; when enabled, returns the result unchanged.
 */
export function filterCitationImages(
  result: SearchProviderResult,
  enabled: boolean,
): SearchProviderResult {
  if (enabled) {
    return result;
  }
  return { sources: result.sources, images: [] };
}
