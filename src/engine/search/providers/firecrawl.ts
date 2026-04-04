import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import { logger } from "@/lib/logger";

const DEFAULT_BASE_URL = "https://api.firecrawl.dev";

interface FirecrawlDocument {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

interface FirecrawlResponse {
  data?: FirecrawlDocument[];
}

export class FirecrawlProvider implements SearchProvider {
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

    const url = `${this.baseURL}/v1/search`;

    logger.info("FirecrawlProvider: searching", { query, maxResults });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey ?? ""}`,
      },
      credentials: "omit",
      signal: options?.abortSignal,
      body: JSON.stringify({
        query,
        limit: maxResults,
        tbs: "qdr:w",
        origin: "api",
        scrapeOptions: {
          formats: ["markdown"],
        },
        timeout: 60000,
      }),
    });

    const data: FirecrawlResponse = await response.json();
    const results = data.data ?? [];

    const sources = results
      .filter((item) => item.description && item.url)
      .map((result) => ({
        title: result.title,
        url: result.url!,
        content: result.markdown || result.description,
      }));

    logger.info("FirecrawlProvider: results", {
      sourceCount: sources.length,
    });

    return { sources, images: [] };
  }
}
