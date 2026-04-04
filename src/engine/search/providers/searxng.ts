import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import { logger } from "@/lib/logger";

import { sanitizeImageUrl } from "@/engine/search/utils";

const DEFAULT_BASE_URL = "http://localhost:8080";

interface SearXNGResult {
  url: string;
  title: string;
  content?: string;
  score: number;
  category: string;
  img_src?: string;
}

interface SearXNGResponse {
  results?: SearXNGResult[];
}

/** Map a scope to SearXNG categories. */
function scopeToCategories(scope?: string): string {
  return scope === "academic" ? "science,images" : "general,images";
}

/** Map a scope to SearXNG engines. */
function scopeToEngines(scope?: string): string {
  if (scope === "academic") {
    return "arxiv,google scholar,pubmed,wikispecies,google_images";
  }
  return "google,bing,duckduckgo,brave,wikipedia,bing_images,google_images";
}

export class SearXNGProvider implements SearchProvider {
  private readonly config: SearchProviderConfig;
  private readonly baseURL: string;

  constructor(config: SearchProviderConfig) {
    this.config = config;
    this.baseURL = config.baseURL || DEFAULT_BASE_URL;
  }

  async search(
    query: string,
    options?: SearchProviderCallOptions,
  ): Promise<SearchProviderResult> {
    const maxResults = options?.maxResults ?? this.config.maxResults ?? 5;
    const scope = options?.scope ?? this.config.scope;

    const params = new URLSearchParams({
      q: query,
      format: "json",
      categories: scopeToCategories(scope),
      engines: scopeToEngines(scope),
      lang: "auto",
    });

    const url = `${this.baseURL}/search?${params.toString()}`;

    logger.info("SearXNGProvider: searching", { query, maxResults, scope });

    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      signal: options?.abortSignal,
    });

    const data: SearXNGResponse = await response.json();
    const allResults = (data.results ?? [])
      .slice()
      .sort((a, b) => b.score - a.score);

    const sources = allResults
      .filter((item) => item.content && item.url && item.score >= 0.5)
      .slice(0, maxResults * 5)
      .map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
      }));

    const images = allResults
      .filter((item) => item.category === "images" && item.score >= 0.5)
      .slice(0, maxResults)
      .filter((item) => item.img_src)
      .map((result) => ({
        url: sanitizeImageUrl(result.img_src!, this.baseURL),
        description: result.title,
      }));

    logger.info("SearXNGProvider: results", {
      sourceCount: sources.length,
      imageCount: images.length,
    });

    return { sources, images };
  }
}
