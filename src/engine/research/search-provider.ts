import type { Source, ImageSource } from "./types";

// ---------------------------------------------------------------------------
// SearchProvider interface
// ---------------------------------------------------------------------------

/** Abstraction over search execution — real implementation lives in S04. */
export interface SearchProvider {
  search(
    query: string,
  ): Promise<{ sources: Source[]; images: ImageSource[] }>;
}

// ---------------------------------------------------------------------------
// NoOpSearchProvider
// ---------------------------------------------------------------------------

/** Stub search provider used during engine development (S03). */
export class NoOpSearchProvider implements SearchProvider {
  async search(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: string,
  ): Promise<{ sources: Source[]; images: ImageSource[] }> {
    return { sources: [], images: [] };
  }
}
