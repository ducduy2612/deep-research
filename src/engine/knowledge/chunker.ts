/** Default chunking options. */
const DEFAULT_CHUNK_SIZE = 10_000;
const DEFAULT_OVERLAP = 500;
const BOUNDARY_TOLERANCE = 0.2; // ±20% of chunkSize

/**
 * Split content into chunks at paragraph or sentence boundaries.
 *
 * Tries to split at:
 * 1. Double-newline (paragraph boundary)
 * 2. Single newline
 * 3. Sentence-ending punctuation (`. `, `! `, `? `)
 *
 * Falls back to an exact split if no boundary is found within the tolerance window.
 */
export function chunkContent(
  content: string,
  options?: { chunkSize?: number; overlap?: number },
): string[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;

  if (content.length === 0) return [];
  if (content.length <= chunkSize) return [content];

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);

    // If we're at the last chunk, take everything remaining
    if (end === content.length) {
      chunks.push(content.slice(start).trim());
      break;
    }

    // Look for a split boundary within the tolerance window
    const splitAt = findSplitBoundary(content, end, chunkSize);

    chunks.push(content.slice(start, splitAt).trim());

    // Advance with overlap
    start = splitAt - overlap;
    if (start < 0) start = 0;

    // Prevent infinite loop if overlap puts us back before splitAt
    if (start >= content.length) break;
  }

  // Filter out empty chunks that may result from trimming
  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Find the best boundary to split at, within a tolerance window around the target position.
 * Searches backwards for paragraph, newline, or sentence boundaries.
 */
function findSplitBoundary(
  content: string,
  targetPos: number,
  chunkSize: number,
): number {
  const tolerance = Math.floor(chunkSize * BOUNDARY_TOLERANCE);
  const searchStart = targetPos - tolerance;
  const searchEnd = targetPos + tolerance;

  // Define boundary patterns to search for (in priority order)
  const boundaries = [
    { pattern: "\n\n", minLen: 2 }, // Paragraph boundary
    { pattern: "\n", minLen: 1 },   // Line boundary
    { pattern: ". ", minLen: 2 },   // Sentence boundary
    { pattern: "! ", minLen: 2 },
    { pattern: "? ", minLen: 2 },
  ];

  let bestPos = -1;
  let bestDistance = Infinity;

  for (const boundary of boundaries) {
    // Search backwards from targetPos first (prefer earlier split)
    const pos = findLastOccurrence(
      content,
      boundary.pattern,
      Math.max(searchStart, 0),
      Math.min(searchEnd, content.length),
    );

    if (pos !== -1) {
      const splitPos = pos + boundary.minLen;
      const distance = Math.abs(splitPos - targetPos);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPos = splitPos;
      }
    }
  }

  // If we found a boundary within tolerance, use it
  if (bestPos !== -1 && bestPos > 0) {
    return bestPos;
  }

  // No boundary found — split at exact target position
  return targetPos;
}

/**
 * Find the last occurrence of a pattern within a range, searching backwards.
 */
function findLastOccurrence(
  content: string,
  pattern: string,
  rangeStart: number,
  rangeEnd: number,
): number {
  const searchStart = Math.max(0, rangeStart);
  const searchEnd = Math.min(content.length, rangeEnd);

  // Search from the end of the range backwards
  let pos = content.lastIndexOf(pattern, searchEnd);
  while (pos !== -1 && pos < searchStart) {
    pos = content.lastIndexOf(pattern, pos - 1);
  }

  return pos >= searchStart && pos <= searchEnd ? pos : -1;
}
