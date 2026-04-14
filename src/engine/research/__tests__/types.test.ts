import { describe, it, expect } from "vitest";
import {
  sourceSchema,
  imageSourceSchema,
  searchTaskSchema,
  researchConfigSchema,
  type ResearchState,
} from "../../research/types";
import { NoOpSearchProvider } from "../../research/search-provider";

// ---------------------------------------------------------------------------
// sourceSchema
// ---------------------------------------------------------------------------

describe("sourceSchema", () => {
  it("validates a valid source with url and title", () => {
    const result = sourceSchema.safeParse({
      url: "https://example.com",
      title: "Example",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid source with url only", () => {
    const result = sourceSchema.safeParse({ url: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a source with missing url", () => {
    const result = sourceSchema.safeParse({ title: "No URL" });
    expect(result.success).toBe(false);
  });

  it("accepts any string as url (no format validation)", () => {
    const result = sourceSchema.safeParse({ url: "not-a-url" });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// imageSourceSchema
// ---------------------------------------------------------------------------

describe("imageSourceSchema", () => {
  it("validates a valid image source with url and description", () => {
    const result = imageSourceSchema.safeParse({
      url: "https://img.example.com/photo.jpg",
      description: "A diagram",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid image source with url only", () => {
    const result = imageSourceSchema.safeParse({
      url: "https://img.example.com/photo.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an image source without url", () => {
    const result = imageSourceSchema.safeParse({ description: "Missing URL" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// searchTaskSchema
// ---------------------------------------------------------------------------

describe("searchTaskSchema", () => {
  it("validates a valid search task", () => {
    const result = searchTaskSchema.safeParse({
      query: "quantum computing advances",
      researchGoal: "Understand recent breakthroughs",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a search task missing researchGoal", () => {
    const result = searchTaskSchema.safeParse({ query: "some query" });
    expect(result.success).toBe(false);
  });

  it("rejects a search task with empty query", () => {
    const result = searchTaskSchema.safeParse({
      query: "",
      researchGoal: "valid goal",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// researchConfigSchema
// ---------------------------------------------------------------------------

describe("researchConfigSchema", () => {
  const validConfig = {
    topic: "AI safety",
    providerConfigs: [
      {
        id: "google" as const,
        apiKey: "test-key",
        models: [
          {
            id: "gemini-2.5-pro",
            name: "Gemini 2.5 Pro",
            role: "thinking" as const,
            capabilities: {
              reasoning: true,
              searchGrounding: true,
              structuredOutput: true,
              maxOutputTokens: 65536,
            },
          },
        ],
      },
    ],
    stepModelMap: {
      clarify: { providerId: "google", modelId: "gemini-2.5-pro" },
    },
  };

  it("validates a full config with providerConfigs and stepModelMap", () => {
    const result = researchConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe("AI safety");
      expect(result.data.providerConfigs).toHaveLength(1);
    }
  });

  it("validates a config with all optional fields", () => {
    const fullConfig = {
      ...validConfig,
      language: "en",
      reportStyle: "technical" as const,
      reportLength: "comprehensive" as const,
      autoReviewRounds: 2,
      maxSearchQueries: 8,
      promptOverrides: {
        system: "Custom system prompt",
        analyze: "Custom analyze prompt",
      },
    };
    const result = researchConfigSchema.safeParse(fullConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reportStyle).toBe("technical");
      expect(result.data.reportLength).toBe("comprehensive");
      expect(result.data.autoReviewRounds).toBe(2);
      expect(result.data.maxSearchQueries).toBe(8);
      expect(result.data.promptOverrides?.system).toBe("Custom system prompt");
    }
  });

  it("rejects config missing required topic field", () => {
    const { topic: _topic, ...noTopic } = validConfig;
    void _topic;
    const result = researchConfigSchema.safeParse(noTopic);
    expect(result.success).toBe(false);
  });

  it("rejects config with empty topic", () => {
    const result = researchConfigSchema.safeParse({
      ...validConfig,
      topic: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects config with empty providerConfigs", () => {
    const result = researchConfigSchema.safeParse({
      ...validConfig,
      providerConfigs: [],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ResearchState values
// ---------------------------------------------------------------------------

describe("ResearchState", () => {
  it("has exactly 13 expected states including multi-phase intermediates", () => {
    const expectedStates: ResearchState[] = [
      "idle",
      "clarifying",
      "awaiting_feedback",
      "planning",
      "awaiting_plan_review",
      "searching",
      "analyzing",
      "reviewing",
      "awaiting_results_review",
      "reporting",
      "completed",
      "failed",
      "aborted",
    ];
    expect(expectedStates).toHaveLength(13);
    // Verify type-level correctness by assigning each string
    const _typeCheck: ResearchState[] = expectedStates;
    expect(_typeCheck).toBeDefined();
  });

  it("includes awaiting_feedback state for multi-phase clarify pause", () => {
    const state: ResearchState = "awaiting_feedback";
    expect(state).toBe("awaiting_feedback");
  });

  it("includes awaiting_plan_review state for multi-phase plan pause", () => {
    const state: ResearchState = "awaiting_plan_review";
    expect(state).toBe("awaiting_plan_review");
  });

  it("includes awaiting_results_review state for multi-phase research pause", () => {
    const state: ResearchState = "awaiting_results_review";
    expect(state).toBe("awaiting_results_review");
  });
});

// ---------------------------------------------------------------------------
// NoOpSearchProvider
// ---------------------------------------------------------------------------

describe("NoOpSearchProvider", () => {
  it("returns empty sources and images arrays", async () => {
    const provider = new NoOpSearchProvider();
    const result = await provider.search("anything");
    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("always returns empty arrays regardless of query", async () => {
    const provider = new NoOpSearchProvider();
    const result = await provider.search(
      "complex query with special chars: @#$%",
    );
    expect(result.sources).toEqual([]);
    expect(result.images).toEqual([]);
  });
});
