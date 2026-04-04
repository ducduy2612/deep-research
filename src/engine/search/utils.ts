/**
 * Sanitize an image URL that may be relative, protocol-relative, or malformed.
 *
 * SearXNG's `img_src` can return:
 * - Relative paths: `/image/proxy?url=...`
 * - Protocol-relative: `//example.com/img.jpg`
 * - Already valid: `https://example.com/img.jpg`
 * - Invalid/unparseable: fallback to empty string
 */
export function sanitizeImageUrl(
  url: string,
  baseURL?: string,
): string {
  if (!url) return "";

  const trimmed = url.trim();

  // Already a valid absolute URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Protocol-relative URL
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  // Relative URL — resolve against base if available
  if (baseURL && trimmed.startsWith("/")) {
    try {
      return new URL(trimmed, baseURL).href;
    } catch {
      return "";
    }
  }

  // Last resort: try to parse as-is
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return "";
  }
}
