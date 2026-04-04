import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import { logger } from "@/lib/logger";

const DEFAULT_BASE_URL = "https://api.search.brave.com/res/v1";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveImageResult {
  url: string;
  title: string;
}

interface BraveWebResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

interface BraveImageResponse {
  results?: BraveImageResult[];
}

export class BraveProvider implements SearchProvider {
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

    const params = new URLSearchParams({
      q: query,
      count: String(maxResults),
    });

    const webUrl = `${this.baseURL}/web/search?${params.toString()}`;
    const imageUrl = `${this.baseURL}/images/search?${params.toString()}`;

    logger.info("BraveProvider: searching", { query, maxResults });

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": this.config.apiKey ?? "",
    };

    const signal = options?.abortSignal;

    const [webResponse, imageResponse] = await Promise.all([
      fetch(webUrl, {
        method: "GET",
        headers,
        credentials: "omit",
        signal,
      }),
      fetch(imageUrl, {
        method: "GET",
        headers,
        credentials: "omit",
        signal,
      }),
    ]);

    const [webData, imageData]: [BraveWebResponse, BraveImageResponse] =
      await Promise.all([webResponse.json(), imageResponse.json()]);

    const webResults = webData?.web?.results ?? [];
    const imageResults = imageData?.results ?? [];

    const sources = webResults
      .filter((item) => item.description && item.url)
      .map((result) => ({
        title: result.title,
        url: result.url,
        content: result.description,
      }));

    const images = imageResults.map((item) => ({
      url: item.url,
      description: item.title,
    }));

    logger.info("BraveProvider: results", {
      sourceCount: sources.length,
      imageCount: images.length,
    });

    return { sources, images };
  }
}
