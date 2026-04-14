/* eslint-disable max-lines */
/**
 * ResearchOrchestrator — framework-agnostic state machine that drives the
 * multi-step research workflow.
 *
 * Pipeline: clarify → plan → search → analyze → [review loop] → report
 *
 * Uses S02's provider registry for model resolution, streamWithAbort for
 * streaming steps, generateStructured for SERP query generation, and the
 * SearchProvider interface for search execution (NoOp in S03).
 */

import type { LanguageModel, ModelMessage } from "ai";

import { AppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type {
  ResearchConfig,
  ResearchEventType,
  ResearchEventMap,
  ResearchResult,
  ResearchState,
  SearchTask,
  SearchResult,
  Source,
  ImageSource,
  ClarifyResult,
  PlanResult,
  ResearchPhaseResult,
  ReportResult,
} from "./types";
import type { SearchProvider } from "./search-provider";
import { NoOpSearchProvider } from "./search-provider";
import { resolvePrompt, getPlanWithContextPrompt, getReportPreferenceRequirement } from "./prompts";
import type { ProviderRegistry } from "@/engine/provider/registry";
import {
  createRegistry,
  resolveModel,
  getDefaultModel,
} from "@/engine/provider/registry";
import type { ResearchStep } from "@/engine/provider/types";
import { streamWithAbort, generateStructured } from "@/engine/provider/streaming";

// ---------------------------------------------------------------------------
// Zod schemas for structured generation
// ---------------------------------------------------------------------------

import { z } from "zod";

const searchTaskArraySchema = z.array(
  z.object({
    query: z.string().min(1),
    researchGoal: z.string().min(1),
  }),
);

const reviewQueryArraySchema = z.array(
  z.object({
    query: z.string().min(1),
    researchGoal: z.string().min(1),
  }),
);

// ---------------------------------------------------------------------------
// ResearchOrchestrator
// ---------------------------------------------------------------------------

export class ResearchOrchestrator {
  // Configuration
  private readonly config: ResearchConfig;
  private readonly searchProvider: SearchProvider;
  private readonly registry: ProviderRegistry;

  // State machine
  private state: ResearchState = "idle";
  private result: ResearchResult | null = null;

  // Abort lifecycle
  private abortController: AbortController | null = null;

  // Event emitter
  private readonly handlers = new Map<
    ResearchEventType,
    Set<(payload: unknown) => void>
  >();

  constructor(config: ResearchConfig, searchProvider?: SearchProvider) {
    this.config = config;
    this.searchProvider = searchProvider ?? new NoOpSearchProvider();
    this.registry = createRegistry(config.providerConfigs);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Phase methods — each runs one checkpoint independently
  // -------------------------------------------------------------------------

  /**
   * Run only the clarify phase. Returns generated questions or null on
   * failure/abort. State transitions to awaiting_feedback on success.
   */
  async clarifyOnly(): Promise<ClarifyResult | null> {
    this.abortController = new AbortController();

    try {
      const questions = await this.runClarify();
      if (this.isAborted()) return null;

      this.transitionTo("awaiting_feedback");
      logger.info("ClarifyOnly completed, awaiting feedback");
      return { questions };
    } catch (error) {
      if (this.state !== "aborted") {
        this.transitionTo("failed");
        logger.error("ClarifyOnly failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /**
   * Run only the plan phase with enriched context (clarification questions
   * and user feedback). Returns the generated plan or null on failure/abort.
   * State transitions to awaiting_plan_review on success.
   */
  async planWithContext(
    topic: string,
    questions: string,
    feedback: string,
  ): Promise<PlanResult | null> {
    this.abortController = new AbortController();
    const step: ResearchStep = "plan";
    this.transitionTo("planning");
    const start = Date.now();

    this.emit("step-start", { step, state: this.state });

    try {
      const model = this.resolveModelForStep(step);
      const prompt = getPlanWithContextPrompt(topic, questions, feedback);
      const result = await streamWithAbort({
        model,
        messages: this.buildMessages(prompt),
        abortSignal: this.abortController?.signal,
      });

      let planText = "";
      for await (const part of result.fullStream) {
        if (this.isAborted()) return null;

        if (part.type === "text-delta") {
          this.emit("step-delta", { step, text: part.text });
          planText += part.text;
        } else if (part.type === "reasoning-delta") {
          this.emit("step-reasoning", { step, text: part.text });
        }
      }

      const duration = Date.now() - start;
      this.emit("step-complete", { step, duration });
      logger.info("PlanWithContext completed", { step, duration });

      this.transitionTo("awaiting_plan_review");
      return { plan: planText };
    } catch (error) {
      this.handleStepError(step, error);
      return null; // unreachable — handleStepError throws
    }
  }

  /**
   * Run the research phase (search + analyze + review loop) from an
   * existing plan. Returns collected learnings, sources, and images, or
   * null on failure/abort. State transitions to awaiting_results_review.
   */
  async researchFromPlan(plan: string, queries?: SearchTask[]): Promise<ResearchPhaseResult | null> {
    this.abortController = new AbortController();

    try {
      const { allLearnings, allSources, allImages, remainingQueries } =
        await this.runSearchPhase(plan, queries);
      if (this.isAborted()) return null;

      this.transitionTo("awaiting_results_review");
      logger.info("ResearchFromPlan completed, awaiting results review", {
        learnings: allLearnings.length,
        sources: allSources.length,
        images: allImages.length,
        remainingQueries: remainingQueries.length,
      });

      return {
        learnings: allLearnings,
        sources: allSources,
        images: allImages,
        ...(remainingQueries.length > 0 && { remainingQueries }),
      };
    } catch (error) {
      if (this.state !== "aborted") {
        this.transitionTo("failed");
        logger.error("ResearchFromPlan failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /**
   * Generate the final report from accumulated learnings and sources.
   * Returns the full ResearchResult or null on failure/abort. State
   * transitions to completed on success.
   */
  async reportFromLearnings(
    plan: string,
    learnings: string[],
    sources: Source[],
    images: ImageSource[],
    feedback?: string,
  ): Promise<ReportResult | null> {
    this.abortController = new AbortController();

    try {
      const report = await this.runReport(plan, learnings, sources, images, feedback);
      if (this.isAborted()) return null;

      const title = this.extractTitle(report);
      this.result = { title, report, learnings, sources, images };

      this.transitionTo("completed");
      logger.info("ReportFromLearnings completed", {
        title,
        learnings: learnings.length,
        sources: sources.length,
        images: images.length,
      });

      return this.result;
    } catch (error) {
      if (this.state !== "aborted") {
        this.transitionTo("failed");
        logger.error("ReportFromLearnings failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /**
   * Run a single review cycle: generate follow-up queries from plan +
   * learnings + optional suggestion, execute 1 search+analyze cycle for
   * each, and return accumulated data. Does NOT run a report.
   */
  async reviewOnly(
    plan: string,
    learnings: string[],
    sources: Source[],
    images: ImageSource[],
    suggestion?: string,
  ): Promise<ResearchPhaseResult | null> {
    this.abortController = new AbortController();

    try {
      const reviewStart = Date.now();
      this.transitionTo("reviewing");
      this.emit("step-start", { step: "review", state: this.state });

      const model = this.resolveModelForStep("review");
      const learningsText = learnings.join("\n");
      const prompt = resolvePrompt(
        "review",
        this.config.promptOverrides ?? {},
        plan,
        learningsText,
        suggestion,
      );

      const followUpQueries = await generateStructured({
        model,
        schema: reviewQueryArraySchema,
        system: this.buildSystemPrompt(),
        prompt,
        abortSignal: this.abortController?.signal,
      });

      if (this.isAborted()) return null;

      const reviewDuration = Date.now() - reviewStart;
      this.emit("step-complete", {
        step: "review",
        duration: reviewDuration,
      });
      logger.info("ReviewOnly: follow-up queries generated", {
        followUpCount: followUpQueries.length,
        duration: reviewDuration,
      });

      if (followUpQueries.length === 0) {
        this.transitionTo("awaiting_results_review");
        logger.info("ReviewOnly: no follow-up queries needed");
        return {
          learnings,
          sources,
          images,
          remainingQueries: [],
        };
      }

      // Execute exactly 1 search+analyze cycle for each follow-up query
      for (const task of followUpQueries) {
        if (this.isAborted()) return null;

        // Search
        this.transitionTo("searching");
        const searchStart = Date.now();
        this.emit("step-start", { step: "search", state: this.state });

        let searchSources: Source[];
        let searchImages: ImageSource[];

        try {
          const searchResult = await this.searchProvider.search(task.query, {
            abortSignal: this.abortController?.signal,
          });
          searchSources = searchResult.sources;
          searchImages = searchResult.images ?? [];
          const searchDuration = Date.now() - searchStart;
          this.emit("step-complete", { step: "search", duration: searchDuration });
          this.emit("search-result", {
            query: task.query,
            sources: searchSources,
            images: searchImages,
          });
        } catch (error) {
          this.handleStepError("search", error);
          throw error; // unreachable
        }

        if (this.isAborted()) return null;

        // Analyze
        const analyzeResult = await this.runAnalyze(task, searchSources);
        learnings.push(analyzeResult.learning);
        sources.push(...analyzeResult.sources);
        images.push(...searchImages);
      }

      const totalDuration = Date.now() - reviewStart;
      logger.info("ReviewOnly: completed", {
        followUpQueriesExecuted: followUpQueries.length,
        totalLearnings: learnings.length,
        totalSources: sources.length,
        duration: totalDuration,
      });

      this.transitionTo("awaiting_results_review");
      return {
        learnings,
        sources,
        images,
        remainingQueries: [],
      };
    } catch (error) {
      if (this.state !== "aborted") {
        this.transitionTo("failed");
        logger.error("ReviewOnly failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /** Abort the running research pipeline. */
  abort(): void {
    if (this.state !== "aborted") {
      this.abortController?.abort();
      this.transitionTo("aborted");
      logger.info("Research aborted", { previousState: this.state });
    }
  }

  /** Current state of the research lifecycle. */
  getState(): ResearchState {
    return this.state;
  }

  /** Final result — null until research completes successfully. */
  getResult(): ResearchResult | null {
    return this.result;
  }

  /**
   * Subscribe to a lifecycle event. Returns an unsubscribe function.
   */
  on<T extends ResearchEventType>(
    event: T,
    handler: (payload: ResearchEventMap[T]) => void,
  ): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as (payload: unknown) => void);

    return () => {
      set!.delete(handler as (payload: unknown) => void);
    };
  }

  /** Abort if running and clear all event handlers. */
  destroy(): void {
    const doneStates: ResearchState[] = [
      "idle",
      "completed",
      "failed",
      "aborted",
      "awaiting_feedback",
      "awaiting_plan_review",
      "awaiting_results_review",
    ];
    if (!doneStates.includes(this.state)) {
      this.abort();
    }
    this.handlers.clear();
  }

  // -------------------------------------------------------------------------
  // Internal: resolve model for a given step
  // -------------------------------------------------------------------------

  /** @internal Resolves a LanguageModel for the given research step. */
  protected resolveModelForStep(step: ResearchStep): LanguageModel {
    const stepMap = this.config.stepModelMap;
    const entry = stepMap[step];

    // Explicit mapping
    if (entry) {
      return resolveModel(this.registry, `${entry.providerId}:${entry.modelId}`);
    }

    // Fallback: first provider's appropriate role model
    const firstConfig = this.config.providerConfigs[0];
    if (!firstConfig) {
      throw new AppError("AI_REQUEST_FAILED", "No provider configs available", {
        category: "ai",
        context: { step },
      });
    }

    const thinkingSteps: ResearchStep[] = ["clarify", "plan", "review", "report"];
    const role = thinkingSteps.includes(step) ? "thinking" : "networking";

    return getDefaultModel(
      this.registry,
      this.config.providerConfigs,
      firstConfig.id,
      role,
    );
  }

  // -------------------------------------------------------------------------
  // Step: Clarify
  // -------------------------------------------------------------------------

  private async runClarify(): Promise<string> {
    const step: ResearchStep = "clarify";
    this.transitionTo("clarifying");
    const start = Date.now();

    this.emit("step-start", { step, state: this.state });

    try {
      const model = this.resolveModelForStep(step);
      const prompt = resolvePrompt(
        "clarify",
        this.config.promptOverrides ?? {},
        this.config.topic,
      );

      const result = await streamWithAbort({
        model,
        messages: this.buildMessages(prompt),
        abortSignal: this.abortController?.signal,
      });

      let questionsText = "";
      for await (const part of result.fullStream) {
        if (this.isAborted()) return "";

        if (part.type === "text-delta") {
          this.emit("step-delta", { step, text: part.text });
          questionsText += part.text;
        } else if (part.type === "reasoning-delta") {
          this.emit("step-reasoning", { step, text: part.text });
        }
      }

      const duration = Date.now() - start;
      this.emit("step-complete", { step, duration });
      logger.info("Clarify step completed", { step, duration });

      return questionsText;
    } catch (error) {
      this.handleStepError(step, error);
    }
  }

  // -------------------------------------------------------------------------
  // Step: Search + Analyze phase
  // -------------------------------------------------------------------------

  private async runSearchPhase(plan: string, prebuiltQueries?: SearchTask[]): Promise<{
    allLearnings: string[];
    allSources: Source[];
    allImages: ImageSource[];
    remainingQueries: SearchTask[];
  }> {
    const allLearnings: string[] = [];
    const allSources: Source[] = [];
    const allImages: ImageSource[] = [];

    const phaseStart = Date.now();
    // Default 180s budget — leaves 120s headroom under Vercel Hobby's 300s limit
    const timeBudgetMs = this.config.timeBudgetMs ?? 180_000;
    // Cap search-analyze cycles per invocation (default 2) to stay within
    // Vercel Hobby's 300s serverless function timeout.
    const maxCycles = this.config.maxCyclesPerInvocation ?? 2;
    let cyclesCompleted = 0;
    // Estimate per-cycle cost (search + analyze). If less than this remains, skip.
    const CYCLE_COST_ESTIMATE_MS = 80_000;

    // Signal search phase immediately so the client sees progress
    // (generateSerpQueries can take 10-20s with no intermediate events)
    this.transitionTo("searching");
    this.emit("step-start", { step: "search" as ResearchStep, state: this.state });

    // Use pre-built queries when provided (continuation from a previous
    // time-budgeted run). Otherwise generate fresh queries from the plan.
    let queries: SearchTask[];
    if (prebuiltQueries && prebuiltQueries.length > 0) {
      queries = prebuiltQueries;
      logger.info("Using pre-built queries, skipping generateSerpQueries", {
        count: queries.length,
      });
    } else {
      const maxQueries = this.config.maxSearchQueries ?? 4;
      queries = await this.generateSerpQueries(plan, maxQueries);
    }

    if (queries.length === 0) {
      return { allLearnings, allSources, allImages, remainingQueries: [] };
    }

    // Emit search tasks so the UI can show what queries will be researched
    this.emit("search-task", { tasks: queries });

    // Execute each search task, respecting time budget
    for (let i = 0; i < queries.length; i++) {
      if (this.isAborted())
        return { allLearnings, allSources, allImages, remainingQueries: queries.slice(i) };

      // Enforce cycle cap — stop after maxCycles search-analyze iterations
      if (cyclesCompleted >= maxCycles) {
        const skipped = queries.slice(i);
        logger.warn("Search phase cycle cap reached, returning remaining queries", {
          completedQueries: cyclesCompleted,
          remainingQueries: skipped.length,
          maxCycles,
        });
        return { allLearnings, allSources, allImages, remainingQueries: skipped };
      }

      // Check time budget before starting a new cycle
      const elapsed = Date.now() - phaseStart;
      const remaining = timeBudgetMs - elapsed;
      if (remaining < CYCLE_COST_ESTIMATE_MS) {
        const skipped = queries.slice(i);
        logger.info("Search phase time budget exhausted, returning partial results", {
          completedQueries: i,
          remainingQueries: skipped.length,
          elapsedMs: elapsed,
          budgetMs: timeBudgetMs,
        });
        return { allLearnings, allSources, allImages, remainingQueries: skipped };
      }

      const task = queries[i];

      // Search
      this.transitionTo("searching");
      const searchStart = Date.now();
      this.emit("step-start", { step: "search", state: this.state });

      let sources: Source[];
      let images: ImageSource[];

      try {
        const searchResult = await this.searchProvider.search(task.query, {
          abortSignal: this.abortController?.signal,
        });
        sources = searchResult.sources;
        images = searchResult.images ?? [];

        const searchDuration = Date.now() - searchStart;
        this.emit("step-complete", { step: "search", duration: searchDuration });

        // Emit per-query search result so UI can accumulate in real-time
        this.emit("search-result", {
          query: task.query,
          sources,
          images,
        });
      } catch (error) {
        this.handleStepError("search", error);
        throw error;
      }

      if (this.isAborted())
        return { allLearnings, allSources, allImages, remainingQueries: queries.slice(i + 1) };

      // Analyze
      const analyzeResult = await this.runAnalyze(task, sources);

      allLearnings.push(analyzeResult.learning);
      allSources.push(...analyzeResult.sources);
      // Images come from the search provider, not from analysis — push directly
      allImages.push(...images);

      cyclesCompleted++;
    }

    logger.info("Search phase completed", {
      completedQueries: cyclesCompleted,
      remainingQueries: 0,
      maxCycles,
    });

    return { allLearnings, allSources, allImages, remainingQueries: [] };
  }

  // -------------------------------------------------------------------------
  // Step: Analyze
  // -------------------------------------------------------------------------

  private async runAnalyze(
    task: SearchTask,
    sources: Source[],
  ): Promise<SearchResult> {
    const step: ResearchStep = "analyze";
    this.transitionTo("analyzing");
    const start = Date.now();

    this.emit("step-start", { step, state: this.state });

    try {
      const model = this.resolveModelForStep(step);

      // When sources include fetched content, use the context-aware prompt
      // so the AI analyzes the actual search results. Otherwise fall back to
      // the model-native prompt where the AI is expected to search itself.
      const sourcesWithContent = sources.filter((s) => s.content);
      let prompt: string;

      if (sourcesWithContent.length > 0) {
        const context = sourcesWithContent
          .map(
            (result, idx) =>
              `<content index="${idx + 1}" url="${result.url}">\n${result.content}\n</content>`,
          )
          .join("\n");
        prompt = resolvePrompt(
          "analyzeWithContent",
          this.config.promptOverrides ?? {},
          task.query,
          task.researchGoal,
          context,
        );
      } else {
        prompt = resolvePrompt(
          "analyze",
          this.config.promptOverrides ?? {},
          task.query,
          task.researchGoal,
        );
      }

      const result = await streamWithAbort({
        model,
        messages: this.buildMessages(prompt),
        abortSignal: this.abortController?.signal,
      });

      let learning = "";
      for await (const part of result.fullStream) {
        if (this.isAborted()) {
          return {
            query: task.query,
            researchGoal: task.researchGoal,
            learning,
            sources,
            images: [],
          };
        }

        if (part.type === "text-delta") {
          this.emit("step-delta", { step, text: part.text });
          learning += part.text;
        } else if (part.type === "reasoning-delta") {
          this.emit("step-reasoning", { step, text: part.text });
        }
      }

      // Fix 5: Normalize OpenAI Chinese-style brackets 【】 → []
      learning = learning.replaceAll("【", "[").replaceAll("】", "]");

      // Fix 4: Inject Google grounding citation markers
      // Google's model-native search with grounding returns exact citation
      // positions in providerMetadata on the final stream part.
      // NOTE: streamWithAbort wraps fullStream, so providerMetadata is not
      // directly accessible here. Google grounding citations are handled
      // through the model's native output — the citation rules prompt above
      // ensures the model adds [N] markers for all providers.

      // Fix 2: Append markdown reference link definitions so [N] markers
      // become clickable links in the final rendered output
      if (sources.length > 0) {
        learning += "\n\n" + sources
          .map((s, i) => `[${i + 1}]: ${s.url}${s.title ? ` "${s.title.replaceAll('"', ' ')}"` : ""}`)
          .join("\n");
      }

      const duration = Date.now() - start;
      this.emit("step-complete", { step, duration });
      logger.info("Analyze step completed", {
        step,
        duration,
        query: task.query,
      });

      return {
        query: task.query,
        researchGoal: task.researchGoal,
        learning,
        sources,
        images: [],
      };
    } catch (error) {
      this.handleStepError(step, error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Step: Report
  // -------------------------------------------------------------------------

  private async runReport(
    plan: string,
    learnings: string[],
    sources: Source[],
    images: ImageSource[],
    feedback?: string,
  ): Promise<string> {
    const step: ResearchStep = "report";
    this.transitionTo("reporting");
    const start = Date.now();

    this.emit("step-start", { step, state: this.state });

    try {
      const model = this.resolveModelForStep(step);

      // Merge user feedback with style/length preferences (v0 pattern)
      const preferenceRequirement =
        this.config.reportStyle && this.config.reportLength
          ? getReportPreferenceRequirement(this.config.reportStyle, this.config.reportLength)
          : undefined;
      const mergedRequirements = [feedback, preferenceRequirement]
        .filter(Boolean)
        .join("\n\n") || undefined;

      const prompt = resolvePrompt(
        "report",
        this.config.promptOverrides ?? {},
        plan,
        learnings,
        sources,
        images,
        mergedRequirements,
        this.config.language,
      );

      // Build report-specific system prompt with output guidelines (v0 pattern)
      const reportSystemPrompt = [
        this.buildSystemPrompt(),
        resolvePrompt("outputGuidelines", this.config.promptOverrides ?? {}),
      ].join("\n\n");

      // NOTE: getReportPrompt() already embeds all learnings, sources, and images
      // in XML-tagged blocks. No need to duplicate them — sending once keeps the
      // input token count manageable and avoids Vercel stream timeouts.

      const result = await streamWithAbort({
        model,
        messages: [
          { role: "system", content: reportSystemPrompt },
          { role: "user", content: prompt },
        ],
        abortSignal: this.abortController?.signal,
      });

      let reportText = "";
      for await (const part of result.fullStream) {
        if (this.isAborted()) return "";

        if (part.type === "text-delta") {
          this.emit("step-delta", { step, text: part.text });
          reportText += part.text;
        } else if (part.type === "reasoning-delta") {
          this.emit("step-reasoning", { step, text: part.text });
        }
      }

      // Fix 3: Append markdown reference link definitions so [N] citation
      // markers in the report become clickable links
      if (sources.length > 0) {
        reportText += "\n\n" + sources
          .map((s, i) => `[${i + 1}]: ${s.url}${s.title ? ` "${s.title.replaceAll('"', ' ')}"` : ""}`)
          .join("\n");
      }

      const duration = Date.now() - start;
      this.emit("step-complete", { step, duration });
      logger.info("Report step completed", { step, duration });

      return reportText;
    } catch (error) {
      this.handleStepError(step, error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // SERP query generation
  // -------------------------------------------------------------------------

  private async generateSerpQueries(
    plan: string,
    maxQueries: number,
  ): Promise<SearchTask[]> {
    const model = this.resolveModelForStep("search");

    const prompt = resolvePrompt(
      "serpQueries",
      this.config.promptOverrides ?? {},
      plan,
      maxQueries,
      this.config.language,
    );

    const queries = await generateStructured({
      model,
      schema: searchTaskArraySchema,
      system: this.buildSystemPrompt(),
      prompt,
      abortSignal: this.abortController?.signal,
    });

    return queries.map((q) => ({
      query: q.query,
      researchGoal: q.researchGoal,
    }));
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private transitionTo(newState: ResearchState): void {
    const oldState = this.state;
    this.state = newState;
    logger.info("State transition", { from: oldState, to: newState });
  }

  private emit<T extends ResearchEventType>(
    event: T,
    payload: ResearchEventMap[T],
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        logger.error("Event handler error", {
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private isAborted(): boolean {
    return this.state === "aborted";
  }

  private handleStepError(step: ResearchStep, error: unknown): never {
    const appError = toAppError(error, "AI_INVALID_RESPONSE");
    this.emit("step-error", { step, error: appError });
    this.transitionTo("failed");
    logger.error("Step error", {
      step,
      error: appError.message,
      code: appError.code,
    });
    throw appError;
  }

  private buildSystemPrompt(): string {
    return resolvePrompt(
      "system",
      this.config.promptOverrides ?? {},
      this.config.language,
    );
  }

  private buildMessages(userPrompt: string): ModelMessage[] {
    const systemPrompt = this.buildSystemPrompt();

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  private extractTitle(report: string): string {
    const headingMatch = report.match(/^#\s+(.+)$/m);
    if (headingMatch) return headingMatch[1].trim();
    const firstLine = report.split("\n").find((l) => l.trim().length > 0);
    return firstLine?.trim() ?? "Research Report";
  }
}
