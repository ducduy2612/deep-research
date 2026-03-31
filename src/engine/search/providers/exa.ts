import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import { logger } from "@/lib/logger";

const DEFAULT_BASE_URL = "https://api.exa.ai";

interface ExaSearchResult {
  title: string;
  url: string;
  summary?: string;
  text?: string;
  extras?: {
    imageLinks?: string[];
  };
}

interface ExaResponse {
  results?: ExaSearchResult[];
}

export class ExaProvider implements SearchProvider {
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
    const scope = options?.scope ?? this.config.scope ?? "research paper";

    const url = `${this.baseURL}/search`;

    logger.info("ExaProvider: searching", { query, maxResults, scope });

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
        category: scope || "research paper",
        contents: {
          text: true,
          summary: {
            query,
          },
          numResults: maxResults * 5,
          livecrawl: "auto",
          extras: {
            imageLinks: 3,
          },
        },
      }),
    });

    const data: ExaResponse = await response.json();
    const results = data.results ?? [];

    const images: { url: string; description?: string }[] = [];

    const sources = results
      .filter((item) => (item.summary || item.text) && item.url)
      .map((result) => {
        if (result.extras?.imageLinks && result.extras.imageLinks.length > 0) {
          for (const imgUrl of result.extras.imageLinks) {
            images.push({ url: imgUrl, description: result.text });
          }
        }
        return {
          title: result.title,
          url: result.url,
        };
      });

    logger.info("ExaProvider: results", {
      sourceCount: sources.length,
      imageCount: images.length,
    });

    return { sources, images };
  }
}
