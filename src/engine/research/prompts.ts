/**
 * Pure prompt template functions for the research engine.
 *
 * Every function is stateless, has no external dependencies, and returns a
 * plain string. The `resolvePrompt` helper merges user-provided overrides
 * onto the defaults.
 */

import type { PromptOverrideKey, PromptOverrides, Source, ImageSource, ReportStyle, ReportLength } from "./types";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * System instruction establishing the expert-researcher persona.
 * Replaces `{now}` with the current locale date string.
 */
export function getSystemPrompt(language?: string): string {
  const date = new Date().toLocaleDateString();

  let prompt = `You are an expert researcher. Today is ${date}. Follow these instructions when responding:

- You may be asked to research subjects that are after your knowledge cutoff, assume the user is right when presented with news.
- The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
- Be highly organized.
- Suggest solutions that I didn't think about.
- Be proactive and anticipate my needs.
- Treat me as an expert in all subject matter.
- Mistakes erode my trust, so be accurate and thorough.
- Provide detailed explanations, I'm comfortable with lots of detail.
- Value good arguments over authorities, the source is irrelevant.
- Consider new technologies and contrarian ideas, not just the conventional wisdom.
- You may use high levels of speculation or prediction, just flag it for me.`;

  if (language) {
    prompt += `\n\nRespond in ${language}.`;
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Clarify prompt
// ---------------------------------------------------------------------------

/**
 * Generate follow-up questions to clarify research direction.
 */
export function getClarifyPrompt(topic: string): string {
  return `Given the following query from the user, ask at least 5 follow-up questions to clarify the research direction:

<QUERY>
${topic}
</QUERY>

Questions need to be brief and concise. No need to output content that is irrelevant to the question.`;
}

// ---------------------------------------------------------------------------
// Plan prompt
// ---------------------------------------------------------------------------

/**
 * Generate a report section plan with tight, focused structure.
 */
export function getPlanPrompt(topic: string): string {
  return `Given the following query from the user:
<QUERY>
${topic}
</QUERY>

Generate a list of sections for the report based on the topic and feedback.
Your plan should be tight and focused with NO overlapping sections or unnecessary filler. Each section needs a sentence summarizing its content.

Integration guidelines:
<GUIDELINES>
- Ensure each section has a distinct purpose with no content overlap.
- Combine related concepts rather than separating them.
- CRITICAL: Every section MUST be directly relevant to the main topic.
- Avoid tangential or loosely related sections that don't directly address the core topic.
</GUIDELINES>

Before submitting, review your structure to ensure it has no redundant sections and follows a logical flow.`;
}

/**
 * Generate a report section plan enriched with clarification questions
 * and user feedback. Used by the planWithContext phase method.
 */
export function getPlanWithContextPrompt(
  topic: string,
  questions: string,
  feedback: string,
): string {
  return `Given the following query from the user:
<QUERY>
${topic}
</QUERY>

The user was asked these clarification questions:
<QUESTIONS>
${questions}
</QUESTIONS>

The user provided this feedback:
<FEEDBACK>
${feedback}
</FEEDBACK>

Generate a list of sections for the report based on the topic and feedback.
Your plan should be tight and focused with NO overlapping sections or unnecessary filler. Each section needs a sentence summarizing its content.

Integration guidelines:
<GUIDELINES>
- Ensure each section has a distinct purpose with no content overlap.
- Combine related concepts rather than separating them.
- CRITICAL: Every section MUST be directly relevant to the main topic.
- Avoid tangential or loosely related sections that don't directly address the core topic.
</GUIDELINES>

Before submitting, review your structure to ensure it has no redundant sections and follows a logical flow.`;
}

// ---------------------------------------------------------------------------
// SERP queries prompt
// ---------------------------------------------------------------------------

/**
 * Generate SERP search queries from the report plan.
 * Instructs the model to return a JSON array of { query, researchGoal } objects.
 */
export function getSerpQueriesPrompt(plan: string, maxQueries: number, language?: string): string {
  const langInstruction = language && language !== "English"
    ? `\n\nGenerate search queries in ${language} to find sources in that language.`
    : "";

  return `This is the report plan after user confirmation:
<PLAN>
${plan}
</PLAN>

Based on the previous report plan, generate a list of up to ${maxQueries} SERP queries to further research the topic. Make sure each query is unique and not similar to each other.

You MUST respond in **JSON** matching this format:

\`\`\`json
[
  {
    "query": "This is a sample query.",
    "researchGoal": "This is the reason for the query."
  }
]
\`\`\`

Return an array of objects, each with a "query" string and a "researchGoal" string. Do not include any other text outside the JSON array.${langInstruction}`;
}

// ---------------------------------------------------------------------------
// Analyze prompt
// ---------------------------------------------------------------------------

/**
 * Analyze search results for a query against a research goal.
 * Used when the search provider returns structured results.
 */
export function getAnalyzePrompt(query: string, researchGoal: string): string {
  return `Please use the following query to get the latest information via the web:
<QUERY>
${query}
</QUERY>

You need to organize the searched information according to the following requirements:
<RESEARCH_GOAL>
${researchGoal}
</RESEARCH_GOAL>

You need to think like a human researcher.
Generate a list of learnings from the search results.
Make sure each learning is unique and not similar to each other.
The learnings should be to the point, as detailed and information dense as possible.
Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any specific entities, metrics, numbers, and dates when available. The learnings will be used to research the topic further.`;
}

// ---------------------------------------------------------------------------
// Search result prompt
// ---------------------------------------------------------------------------

/**
 * Analyze pre-fetched search context against a research goal.
 * Used when the search provider returns raw text context.
 */
export function getSearchResultPrompt(
  query: string,
  researchGoal: string,
  context: string,
): string {
  return `Given the following contexts from a SERP search for the query:
<QUERY>
${query}
</QUERY>

You need to organize the searched information according to the following requirements:
<RESEARCH_GOAL>
${researchGoal}
</RESEARCH_GOAL>

The following context from the SERP search:
<CONTEXT>
${context}
</CONTEXT>

You need to think like a human researcher.
Generate a list of learnings from the contexts.
Make sure each learning is unique and not similar to each other.
The learnings should be to the point, as detailed and information dense as possible.
Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any specific entities, metrics, numbers, and dates when available. The learnings will be used to research the topic further.

Citation Rules:

- Please cite the context at the end of sentences when appropriate.
- Please use the format of citation number [number] to reference the context in corresponding parts of your answer.
- If a sentence comes from multiple contexts, please list all relevant citation numbers, e.g., [1][2]. Remember not to group citations at the end but list them in the corresponding parts of your answer.`;
}

// ---------------------------------------------------------------------------
// Review prompt
// ---------------------------------------------------------------------------

/**
 * Determine if more research is needed. Outputs follow-up queries or an empty
 * array.
 */
export function getReviewPrompt(
  plan: string,
  learnings: string,
  suggestion?: string,
): string {
  const suggestionBlock = suggestion
    ? `\nThis is the user's suggestion for research direction:\n<SUGGESTION>\n${suggestion}\n</SUGGESTION>\n`
    : "";

  return `This is the report plan after user confirmation:
<PLAN>
${plan}
</PLAN>

Here are all the learnings from previous research:
<LEARNINGS>
${learnings}
</LEARNINGS>
${suggestionBlock}
Based on previous research${suggestion ? " and user research suggestions" : ""}, determine whether further research is needed.
If further research is needed, list follow-up SERP queries to research the topic further.
Make sure each query is unique and not similar to each other.
If you believe no further research is needed, you can output an empty queries array.

You MUST respond in **JSON** matching this format:

\`\`\`json
[
  {
    "query": "This is a sample query.",
    "researchGoal": "This is the reason for the query."
  }
]
\`\`\`

Return an array of objects (or an empty array if no further research is needed). Do not include any other text outside the JSON array.`;
}

// ---------------------------------------------------------------------------
// Report preference helpers
// ---------------------------------------------------------------------------

/** Style-specific writing instructions. */
const STYLE_PROMPTS: Record<ReportStyle, string> = {
  balanced:
    "Keep a balanced writing style with clear explanations, practical examples, and moderate technical depth.",
  executive:
    "Prioritize decision-ready insights. Begin sections with key findings and focus on business impact, risks, and recommendations.",
  technical:
    "Prioritize technical depth and precision. Include implementation details, tradeoffs, assumptions, and limitations.",
  concise:
    "Be concise and direct. Eliminate filler and keep each section tightly focused on essential information.",
};

/** Length-specific scope instructions. */
const LENGTH_PROMPTS: Record<ReportLength, string> = {
  brief:
    "Keep the report compact while preserving critical insights and evidence.",
  standard:
    "Write a standard-length report with good depth and practical detail.",
  comprehensive:
    "Write a comprehensive report with deep coverage, detailed analysis, and thorough supporting context.",
};

/**
 * Generate a requirements string from the user's report style and length
 * preferences. Ported from v0's `getReportPreferenceRequirement`.
 */
export function getReportPreferenceRequirement(
  reportStyle: ReportStyle,
  reportLength: ReportLength,
): string {
  return [
    "Additional report preferences:",
    `- Style: ${STYLE_PROMPTS[reportStyle]}`,
    `- Length: ${LENGTH_PROMPTS[reportLength]}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Report prompt
// ---------------------------------------------------------------------------

/**
 * Write the final research report.
 */
export function getReportPrompt(
  plan: string,
  learnings: string[],
  sources: Source[],
  images: ImageSource[],
  requirements?: string,
  language?: string,
): string {
  // Wrap learnings in XML tags like v0 — helps model parse each learning
  const learningsBlock = learnings
    .map((l) => `<learning>\n${l}\n</learning>`)
    .join("\n");

  // Always render sources block (v0 pattern) with XML tags
  const sourcesBlock = sources
    .map((s, i) => `<source index="${i + 1}" url="${s.url}">\n${s.title}\n</source>`)
    .join("\n");

  // Always render images block (v0 pattern) with markdown image syntax
  const imagesBlock = images
    .map((img, i) => `${i + 1}. ![${img.description}](${img.url})`)
    .join("\n");

  const langInstruction = language && language !== "English"
    ? `\n\n**IMPORTANT: Write the entire report in ${language}.** All prose, headings, and explanations must be in ${language}.`
    : "";

  // Citation reference rules — appended when sources are present (v0 pattern)
  const citationRules = sources.length > 0
    ? `

Citation Rules:

- Please cite research references at the end of your paragraphs when appropriate.
- If the citation is from the reference, please **ignore**. Include only references from sources.
- Please use the reference format [number], to reference the learnings link in corresponding parts of your answer.
- If a paragraphs comes from multiple learnings reference link, please list all relevant citation numbers, e.g., [1][2]. Remember not to group citations at the end but list them in the corresponding parts of your answer. Control the number of footnotes.
- Do not have more than 3 reference link in a paragraph, and keep only the most relevant ones.`
    : "";

  // Image citation rules — appended when images are present (v0 pattern)
  const imageRules = images.length > 0
    ? `

**Including meaningful images from the previous research in the report is very helpful. You MUST include images throughout the report.**

Image Rules:

- You MUST include images from the provided image list in the report. Pick the most relevant images for each section.
- Place images related to the paragraph content at the appropriate location in the article according to the image description.
- Include images using \`![Image Description](image_url)\` — each image should be on its own line.
- Do not cluster all images at the end of the article. Distribute them throughout the relevant sections.
- If an image description matches a section's topic, include that image in that section.`
    : "";

  return `This is the report plan after user confirmation:
<PLAN>
${plan}
</PLAN>

Here are all the learnings from previous research:
<LEARNINGS>
${learningsBlock}
</LEARNINGS>

Here are all the sources from previous research, if any:
<SOURCES>
${sourcesBlock}
</SOURCES>

Here are all the images from previous research, if any:
<IMAGES>
${imagesBlock}
</IMAGES>

Please write according to the user's writing requirements, if any:
<REQUIREMENT>
${requirements ?? ""}
</REQUIREMENT>

Write a final report based on the report plan using the learnings from research.
Make it as detailed as possible, aim for 5 pages or more, the more the better, include ALL the learnings from research.
**Respond only the final report content, and no additional text before or after.**${citationRules}${imageRules}${langInstruction}`;
}

// ---------------------------------------------------------------------------
// Output guidelines prompt
// ---------------------------------------------------------------------------

/**
 * Typographical and formatting rules for the final report.
 */
export function getOutputGuidelinesPrompt(): string {
  return `<OutputGuidelines>

## Typographical rules

Follow these rules to organize your output:

- **Title:** Use \`#\` to create article title.
- **Headings:** Use \`##\` through \`######\` to create headings of different levels.
- **Paragraphs:** Use blank lines to separate paragraphs.
- **Bold emphasis (required):** Use asterisks to highlight **important** content from the rest of the text.
- **Links:** Use \`[link text](URL)\` to insert links.
- **Lists:**
    - **Unordered lists:** Use \`*\`, \`-\`, or \`+\` followed by a space.
    - **Ordered lists:** Use \`1.\`, \`2.\`, etc., and a period.
- **Code:**
    - **Inline code:** Enclose it in backticks (\` \`).
    - **Code blocks:** Enclose it in triple backticks (\`\`\` \`\`\`), optionally in a language.
- **Quotes:** Use the \`>\` symbol.
- **Horizontal rule:** Use \`---\`, \`***\` or \`___\`.
- **Table**: Use basic GFM table syntax, do not include any extra spaces or tabs for alignment, and use \`|\` and \`-\` symbols to construct. **For complex tables, GFM table syntax is not suitable. You must use HTML syntax to output complex tables.**
- **Emoji:** You can insert Emoji before the title or subtitle.
- **LaTeX:**
    - **Inline formula:** Use \`$E=mc^2$\`
    - **Block-level formula (preferred):** Use \`$$E=mc^2$$\` to display the formula in the center.

## Generate Mermaid

1. Use Mermaid's graph TD (Top-Down) or graph LR (Left-Right) type.
2. Create a unique node ID for each identified entity (must use English letters or abbreviations as IDs), and display the full name or key description of the entity in the node shape.
3. Relationships are represented as edges with labels, and the labels indicate the type of relationship.
4. Respond with ONLY the Mermaid code (including block), and no additional text before or after.
5. Focus on the most core entities and the most important relationships between them, and ensure the generated graph is concise and easy to understand.
6. All text content **MUST** be wrapped in \`"\` syntax.
7. Double-check that all content complies with Mermaid syntax, especially that all text needs to be wrapped in \`"\`.
</OutputGuidelines>`;
}

// ---------------------------------------------------------------------------
// Default prompt map & resolver
// ---------------------------------------------------------------------------

/** Maps every prompt key to its default generator function. */
export const DEFAULT_PROMPTS: Record<
  PromptOverrideKey,
  (...args: any[]) => string
> = {
  system: getSystemPrompt,
  clarify: getClarifyPrompt,
  plan: getPlanPrompt,
  serpQueries: getSerpQueriesPrompt,
  analyze: getAnalyzePrompt,
  analyzeWithContent: getSearchResultPrompt,
  review: getReviewPrompt,
  report: getReportPrompt,
  outputGuidelines: getOutputGuidelinesPrompt,
};

/**
 * Resolve a prompt value. Returns the override string when provided,
 * otherwise calls the default prompt function with the supplied args.
 *
 * Special handling: when the "system" prompt is overridden, the language
 * instruction is still appended so overrides don't silently drop language.
 */
export function resolvePrompt(
  key: PromptOverrideKey,
  overrides: PromptOverrides,
  ...args: Parameters<(typeof DEFAULT_PROMPTS)[typeof key]>
): string {
  if (overrides[key] !== undefined) {
    let result = overrides[key] as string;
    // Preserve language instruction even when system prompt is overridden
    if (key === "system") {
      const language = args[0] as string | undefined;
      if (language) {
        result += `\n\nRespond in ${language}.`;
      }
    }
    return result;
  }
  return DEFAULT_PROMPTS[key](...args);
}
