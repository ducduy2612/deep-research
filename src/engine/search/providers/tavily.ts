import type { SearchProvider } from "@/engine/research/search-provider";
import type {
  SearchProviderConfig,
  SearchProviderCallOptions,
  SearchProviderResult,
} from "@/engine/search/types";
import { logger } from "@/lib/logger";

const DEFAULT_BASE_URL = "https://api.tavily.com";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  score: number;
  publishedDate: string;
}

interface TavilyResponse {
  results?: TavilySearchResult[];
  images?: string[];
}

export class TavilyProvider implements SearchProvider {
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
    const scope = options?.scope ?? this.config.scope ?? "general";

    const url = `${this.baseURL}/search`;

    logger.info("TavilyProvider: searching", { query, maxResults, scope });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey ?? ""}`,
      },
      credentials: "omit",
      signal: options?.abortSignal,
      body: JSON.stringify({
        query: query.replaceAll("\\", "").replaceAll('"', ""),
        search_depth: "advanced",
        topic: scope || "general",
        max_results: maxResults,
        include_images: true,
        include_image_descriptions: true,
        include_answer: false,
        include_raw_content: "markdown",
      }),
    });

    const data: TavilyResponse = await response.json();
    const results = data.results ?? [];
    const images = data.images ?? [];

    const sources = results
      .filter((item) => item.content && item.url)
      .map((result) => ({
        title: result.title,
        url: result.url,
      }));

    const imageSources = images.map((img) => ({
      url: typeof img === "string" ? img : String(img),
    }));

    logger.info("TavilyProvider: results", {
      sourceCount: sources.length,
      imageCount: imageSources.length,
    });

    return { sources, images: imageSources };
  }
}
