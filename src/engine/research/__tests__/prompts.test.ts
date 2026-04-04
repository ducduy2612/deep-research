import { describe, it, expect } from "vitest";
import {
  getSystemPrompt,
  getClarifyPrompt,
  getPlanPrompt,
  getPlanWithContextPrompt,
  getSerpQueriesPrompt,
  getAnalyzePrompt,
  getSearchResultPrompt,
  getReviewPrompt,
  getReportPrompt,
  getOutputGuidelinesPrompt,
  getReportPreferenceRequirement,
  resolvePrompt,
  DEFAULT_PROMPTS,
} from "../prompts";
import type { PromptOverrideKey } from "../types";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Assert that a value is a non-empty string. */
function expectNonEmptyString(value: unknown): void {
  expect(typeof value).toBe("string");
  expect((value as string).length).toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// Individual prompt functions
// ---------------------------------------------------------------------------

describe("getSystemPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(getSystemPrompt());
  });

  it("includes today's date", () => {
    const today = new Date().toLocaleDateString();
    expect(getSystemPrompt()).toContain(today);
  });

  it("includes the expert researcher persona", () => {
    expect(getSystemPrompt()).toContain("expert researcher");
  });

  it("appends language instruction when language is provided", () => {
    const result = getSystemPrompt("Vietnamese");
    expect(result).toContain("Respond in Vietnamese");
  });

  it("does not include language instruction when no language provided", () => {
    const result = getSystemPrompt();
    expect(result).not.toContain("Respond in");
  });
});

describe("getClarifyPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(getClarifyPrompt("quantum computing"));
  });

  it("includes the topic", () => {
    expect(getClarifyPrompt("quantum computing")).toContain("quantum computing");
  });

  it("mentions follow-up questions", () => {
    expect(getClarifyPrompt("test topic")).toContain("follow-up questions");
  });
});

describe("getPlanPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(getPlanPrompt("AI safety"));
  });

  it("includes the topic", () => {
    expect(getPlanPrompt("AI safety")).toContain("AI safety");
  });

  it("includes integration guidelines", () => {
    expect(getPlanPrompt("test")).toContain("GUIDELINES");
  });

  it("requires sections to be directly relevant to the main topic", () => {
    expect(getPlanPrompt("test")).toContain(
      "Every section MUST be directly relevant to the main topic",
    );
  });
});

describe("getPlanWithContextPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(
      getPlanWithContextPrompt("quantum computing", "Q1?", "Focus on hardware"),
    );
  });

  it("includes the topic", () => {
    const result = getPlanWithContextPrompt("quantum computing", "Q?", "F");
    expect(result).toContain("quantum computing");
  });

  it("includes the questions", () => {
    const result = getPlanWithContextPrompt("topic", "What are the risks?", "F");
    expect(result).toContain("What are the risks?");
  });

  it("includes the feedback", () => {
    const result = getPlanWithContextPrompt("topic", "Q?", "Focus on practical applications");
    expect(result).toContain("Focus on practical applications");
  });

  it("includes integration guidelines", () => {
    const result = getPlanWithContextPrompt("topic", "Q?", "F");
    expect(result).toContain("GUIDELINES");
  });

  it("requires sections to be directly relevant to the main topic", () => {
    const result = getPlanWithContextPrompt("topic", "Q?", "F");
    expect(result).toContain(
      "Every section MUST be directly relevant to the main topic",
    );
  });
});

describe("getSerpQueriesPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(getSerpQueriesPrompt("plan text", 5));
  });

  it("includes the plan", () => {
    expect(getSerpQueriesPrompt("my detailed plan", 5)).toContain(
      "my detailed plan",
    );
  });

  it("mentions the max queries count", () => {
    expect(getSerpQueriesPrompt("plan", 3)).toContain("3");
  });

  it("instructs JSON format", () => {
    expect(getSerpQueriesPrompt("plan", 5)).toContain("JSON");
  });

  it("includes query and researchGoal fields", () => {
    const result = getSerpQueriesPrompt("plan", 5);
    expect(result).toContain("query");
    expect(result).toContain("researchGoal");
  });

  it("appends language instruction for non-English language", () => {
    const result = getSerpQueriesPrompt("plan", 5, "Japanese");
    expect(result).toContain("Generate search queries in Japanese");
  });

  it("omits language instruction for English", () => {
    const result = getSerpQueriesPrompt("plan", 5, "English");
    expect(result).not.toContain("Generate search queries in");
  });

  it("omits language instruction when not provided", () => {
    const result = getSerpQueriesPrompt("plan", 5);
    expect(result).not.toContain("Generate search queries in");
  });
});

describe("getAnalyzePrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(getAnalyzePrompt("test query", "test goal"));
  });

  it("includes the query", () => {
    expect(getAnalyzePrompt("climate change effects", "test goal")).toContain(
      "climate change effects",
    );
  });

  it("includes the research goal", () => {
    expect(getAnalyzePrompt("test query", "understand impacts")).toContain(
      "understand impacts",
    );
  });

  it("mentions learnings", () => {
    expect(getAnalyzePrompt("q", "g")).toContain("learnings");
  });
});

describe("getSearchResultPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(
      getSearchResultPrompt("query", "goal", "some context"),
    );
  });

  it("includes query, goal, and context", () => {
    const result = getSearchResultPrompt(
      "my query",
      "my goal",
      "my context",
    );
    expect(result).toContain("my query");
    expect(result).toContain("my goal");
    expect(result).toContain("my context");
  });
});

describe("getReviewPrompt", () => {
  it("returns a non-empty string without suggestion", () => {
    expectNonEmptyString(getReviewPrompt("plan", "learnings"));
  });

  it("includes the plan and learnings", () => {
    const result = getReviewPrompt("the plan", "the learnings");
    expect(result).toContain("the plan");
    expect(result).toContain("the learnings");
  });

  it("includes suggestion when provided", () => {
    const result = getReviewPrompt("plan", "learnings", "look deeper");
    expect(result).toContain("look deeper");
    expect(result).toContain("SUGGESTION");
  });

  it("omits suggestion block when not provided", () => {
    const result = getReviewPrompt("plan", "learnings");
    expect(result).not.toContain("SUGGESTION");
  });

  it("instructs JSON format", () => {
    expect(getReviewPrompt("plan", "learnings")).toContain("JSON");
  });
});

describe("getReportPrompt", () => {
  const sources = [
    { url: "https://example.com/1", title: "Source One" },
    { url: "https://example.com/2" },
  ];
  const images = [
    { url: "https://img.example.com/a.png", description: "A diagram" },
  ];

  it("returns a non-empty string", () => {
    expectNonEmptyString(
      getReportPrompt("plan", ["learning 1"], sources, images),
    );
  });

  it("includes the plan", () => {
    expect(
      getReportPrompt("my plan", ["l"], sources, images),
    ).toContain("my plan");
  });

  it("includes the learnings", () => {
    expect(
      getReportPrompt("plan", ["learning A", "learning B"], sources, images),
    ).toContain("learning A");
    expect(
      getReportPrompt("plan", ["learning A", "learning B"], sources, images),
    ).toContain("learning B");
  });

  it("includes source URLs", () => {
    const result = getReportPrompt("plan", ["l"], sources, []);
    expect(result).toContain("https://example.com/1");
    expect(result).toContain("Source One");
  });

  it("includes image URLs when present", () => {
    const result = getReportPrompt("plan", ["l"], [], images);
    expect(result).toContain("https://img.example.com/a.png");
  });

  it("includes requirements when provided", () => {
    const result = getReportPrompt(
      "plan",
      ["l"],
      [],
      [],
      "Focus on economic impact",
    );
    expect(result).toContain("Focus on economic impact");
  });

  it("always includes requirements block", () => {
    const result = getReportPrompt("plan", ["l"], [], []);
    expect(result).toContain("REQUIREMENT");
  });

  it("includes citation rules", () => {
    const result = getReportPrompt("plan", ["l"], sources, []);
    expect(result).toContain("Citation Rules");
  });

  it("appends language instruction for non-English language", () => {
    const result = getReportPrompt("plan", ["l"], sources, [], undefined, "German");
    expect(result).toContain("Write the entire report in German");
  });

  it("omits language instruction for English", () => {
    const result = getReportPrompt("plan", ["l"], sources, [], undefined, "English");
    expect(result).not.toContain("Write the entire report in");
  });

  it("omits language instruction when not provided", () => {
    const result = getReportPrompt("plan", ["l"], sources, []);
    expect(result).not.toContain("Write the entire report in");
  });
});

describe("getOutputGuidelinesPrompt", () => {
  it("returns a non-empty string", () => {
    expectNonEmptyString(getOutputGuidelinesPrompt());
  });

  it("includes LaTeX instructions", () => {
    expect(getOutputGuidelinesPrompt()).toContain("LaTeX");
  });

  it("includes Mermaid instructions", () => {
    expect(getOutputGuidelinesPrompt()).toContain("Mermaid");
  });

  it("includes table instructions", () => {
    expect(getOutputGuidelinesPrompt()).toContain("Table");
  });
});

describe("getReportPreferenceRequirement", () => {
  const styles: Array<import("../types").ReportStyle> = [
    "balanced",
    "executive",
    "technical",
    "concise",
  ];
  const lengths: Array<import("../types").ReportLength> = [
    "brief",
    "standard",
    "comprehensive",
  ];

  it("includes style and length labels", () => {
    const result = getReportPreferenceRequirement("balanced", "standard");
    expect(result).toContain("Style:");
    expect(result).toContain("Length:");
    expect(result).toContain("Additional report preferences:");
  });

  it("includes the balanced style description", () => {
    const result = getReportPreferenceRequirement("balanced", "standard");
    expect(result).toContain("balanced writing style");
  });

  it("includes the executive style description", () => {
    const result = getReportPreferenceRequirement("executive", "standard");
    expect(result).toContain("decision-ready insights");
  });

  it("includes the technical style description", () => {
    const result = getReportPreferenceRequirement("technical", "standard");
    expect(result).toContain("technical depth and precision");
  });

  it("includes the concise style description", () => {
    const result = getReportPreferenceRequirement("concise", "standard");
    expect(result).toContain("concise and direct");
  });

  it("includes the brief length description", () => {
    const result = getReportPreferenceRequirement("balanced", "brief");
    expect(result).toContain("compact while preserving critical insights");
  });

  it("includes the standard length description", () => {
    const result = getReportPreferenceRequirement("balanced", "standard");
    expect(result).toContain("standard-length report");
  });

  it("includes the comprehensive length description", () => {
    const result = getReportPreferenceRequirement("balanced", "comprehensive");
    expect(result).toContain("comprehensive report with deep coverage");
  });

  it("returns different strings for different style+length combos", () => {
    const results = new Set<string>();
    for (const style of styles) {
      for (const length of lengths) {
        results.add(getReportPreferenceRequirement(style, length));
      }
    }
    // 4 styles * 3 lengths = 12 unique combinations
    expect(results.size).toBe(12);
  });

  it("all 12 combinations are non-empty strings", () => {
    for (const style of styles) {
      for (const length of lengths) {
        const result = getReportPreferenceRequirement(style, length);
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// resolvePrompt & DEFAULT_PROMPTS
// ---------------------------------------------------------------------------

describe("resolvePrompt", () => {
  it("returns override when provided", () => {
    expect(resolvePrompt("system", { system: "custom system prompt" })).toBe(
      "custom system prompt",
    );
  });

  it("returns default when no override", () => {
    const result = resolvePrompt("system", {});
    expect(result).toBe(getSystemPrompt());
  });

  it("returns default when override object is undefined for that key", () => {
    const result = resolvePrompt("clarify", { system: "override" }, "topic");
    expect(result).toBe(getClarifyPrompt("topic"));
  });

  it("passes args to the default function", () => {
    const result = resolvePrompt(
      "serpQueries",
      {},
      "plan text",
      7,
    );
    expect(result).toContain("plan text");
    expect(result).toContain("7");
  });

  it("appends language to overridden system prompt", () => {
    const result = resolvePrompt("system", { system: "custom system" }, "French");
    expect(result).toContain("custom system");
    expect(result).toContain("Respond in French");
  });

  it("does not append language to overridden system prompt when language is undefined", () => {
    const result = resolvePrompt("system", { system: "custom system" });
    expect(result).toBe("custom system");
  });
});

describe("DEFAULT_PROMPTS", () => {
  it("has an entry for every PromptOverrideKey", () => {
    const keys: PromptOverrideKey[] = [
      "system",
      "clarify",
      "plan",
      "serpQueries",
      "analyze",
      "analyzeWithContent",
      "review",
      "report",
      "outputGuidelines",
    ];
    for (const key of keys) {
      expect(DEFAULT_PROMPTS[key]).toBeTypeOf("function");
    }
  });
});
