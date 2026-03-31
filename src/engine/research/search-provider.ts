import type { Source, ImageSource } from "./types";
import type {
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";

// ---------------------------------------------------------------------------
// SearchProvider interface
// ---------------------------------------------------------------------------

/** Abstraction over search execution — pluggable provider interface. */
export interface SearchProvider {
  search(
    query: string,
    options?: SearchProviderCallOptions,
  ): Promise<SearchProviderResult>;
}

// ---------------------------------------------------------------------------
// NoOpSearchProvider
// ---------------------------------------------------------------------------

/** Stub search provider used during engine development (S03). */
export class NoOpSearchProvider implements SearchProvider {
  async search(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: SearchProviderCallOptions,
  ): Promise<{ sources: Source[]; images: ImageSource[] }> {
    return { sources: [], images: [] };
  }
}
