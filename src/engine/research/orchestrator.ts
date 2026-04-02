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

import type { LanguageModel, CoreMessage } from "ai";

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
import { resolvePrompt, getPlanWithContextPrompt } from "./prompts";
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

  /**
   * Run the full research pipeline. Returns null if aborted or failed.
   */
  async start(): Promise<ResearchResult | null> {
    this.abortController = new AbortController();

    try {
      // Step 1: Clarify
      await this.runClarify();
      if (this.isAborted()) return null;

      // Step 2: Plan
      const plan = await this.runPlan();
      if (this.isAborted()) return null;

      // Step 3-4: Search + Analyze
      const { allLearnings, allSources, allImages } =
        await this.runSearchPhase(plan);
      if (this.isAborted()) return null;

      // Step 5: Review loop
      await this.runReviewLoop(
        plan,
        allLearnings,
        allSources,
        allImages,
      );
      if (this.isAborted()) return null;

      // Step 6: Report
      const report = await this.runReport(
        plan,
        allLearnings,
        allSources,
        allImages,
      );
      if (this.isAborted()) return null;

      // Assemble result
      const title = this.extractTitle(report);
      this.result = {
        title,
        report,
        learnings: allLearnings,
        sources: allSources,
        images: allImages,
      };

      this.transitionTo("completed");
      logger.info("Research completed", {
        title,
        learnings: allLearnings.length,
        sources: allSources.length,
        images: allImages.length,
      });

      return this.result;
    } catch (error) {
      if (this.state !== "aborted") {
        this.transitionTo("failed");
        logger.error("Research failed", {
          error: error instanceof Error ? error.message : String(error),
          state: this.state,
        });
      }
      return null;
    }
  }

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
          this.emit("step-delta", { step, text: part.textDelta });
          planText += part.textDelta;
        } else if (part.type === "reasoning") {
          this.emit("step-reasoning", { step, text: part.textDelta });
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
  async researchFromPlan(plan: string): Promise<ResearchPhaseResult | null> {
    this.abortController = new AbortController();

    try {
      const { allLearnings, allSources, allImages } =
        await this.runSearchPhase(plan);
      if (this.isAborted()) return null;

      await this.runReviewLoop(plan, allLearnings, allSources, allImages);
      if (this.isAborted()) return null;

      this.transitionTo("awaiting_results_review");
      logger.info("ResearchFromPlan completed, awaiting results review", {
        learnings: allLearnings.length,
        sources: allSources.length,
        images: allImages.length,
      });

      return {
        learnings: allLearnings,
        sources: allSources,
        images: allImages,
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
  ): Promise<ReportResult | null> {
    this.abortController = new AbortController();

    try {
      const report = await this.runReport(plan, learnings, sources, images);
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
    if (
      this.state !== "idle" &&
      this.state !== "completed" &&
      this.state !== "failed" &&
      this.state !== "aborted"
    ) {
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
          this.emit("step-delta", { step, text: part.textDelta });
          questionsText += part.textDelta;
        } else if (part.type === "reasoning") {
          this.emit("step-reasoning", { step, text: part.textDelta });
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
  // Step: Plan
  // -------------------------------------------------------------------------

  private async runPlan(): Promise<string> {
    const step: ResearchStep = "plan";
    this.transitionTo("planning");
    const start = Date.now();

    this.emit("step-start", { step, state: this.state });

    try {
      const model = this.resolveModelForStep(step);
      const prompt = resolvePrompt(
        "plan",
        this.config.promptOverrides ?? {},
        this.config.topic,
      );

      const result = await streamWithAbort({
        model,
        messages: this.buildMessages(prompt),
        abortSignal: this.abortController?.signal,
      });

      let planText = "";
      for await (const part of result.fullStream) {
        if (this.isAborted()) return "";

        if (part.type === "text-delta") {
          this.emit("step-delta", { step, text: part.textDelta });
          planText += part.textDelta;
        } else if (part.type === "reasoning") {
          this.emit("step-reasoning", { step, text: part.textDelta });
        }
      }

      const duration = Date.now() - start;
      this.emit("step-complete", { step, duration });
      logger.info("Plan step completed", { step, duration });

      return planText;
    } catch (error) {
      this.handleStepError(step, error);
      throw error; // unreachable — handleStepError throws
    }
  }

  // -------------------------------------------------------------------------
  // Step: Search + Analyze phase
  // -------------------------------------------------------------------------

  private async runSearchPhase(plan: string): Promise<{
    allLearnings: string[];
    allSources: Source[];
    allImages: ImageSource[];
  }> {
    const allLearnings: string[] = [];
    const allSources: Source[] = [];
    const allImages: ImageSource[] = [];

    // Generate SERP queries via structured output
    const maxQueries = this.config.maxSearchQueries ?? 4;
    const queries = await this.generateSerpQueries(plan, maxQueries);

    if (queries.length === 0) {
      return { allLearnings, allSources, allImages };
    }

    // Execute each search task
    for (const task of queries) {
      if (this.isAborted())
        return { allLearnings, allSources, allImages };

      // Search
      this.transitionTo("searching");
      const searchStart = Date.now();
      this.emit("step-start", { step: "search", state: this.state });

      let sources: Source[];

      try {
        const searchResult = await this.searchProvider.search(task.query, {
          abortSignal: this.abortController?.signal,
        });
        sources = searchResult.sources;

        const searchDuration = Date.now() - searchStart;
        this.emit("step-complete", { step: "search", duration: searchDuration });
      } catch (error) {
        this.handleStepError("search", error);
        throw error;
      }

      if (this.isAborted())
        return { allLearnings, allSources, allImages };

      // Analyze
      const analyzeResult = await this.runAnalyze(task, sources);

      allLearnings.push(analyzeResult.learning);
      allSources.push(...analyzeResult.sources);
      allImages.push(...analyzeResult.images);
    }

    return { allLearnings, allSources, allImages };
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
      const prompt = resolvePrompt(
        "analyze",
        this.config.promptOverrides ?? {},
        task.query,
        task.researchGoal,
      );

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
          this.emit("step-delta", { step, text: part.textDelta });
          learning += part.textDelta;
        } else if (part.type === "reasoning") {
          this.emit("step-reasoning", { step, text: part.textDelta });
        }
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
  // Step: Review loop
  // -------------------------------------------------------------------------

  private async runReviewLoop(
    plan: string,
    allLearnings: string[],
    allSources: Source[],
    allImages: ImageSource[],
  ): Promise<void> {
    const maxRounds = this.config.autoReviewRounds ?? 0;
    if (maxRounds === 0) return;

    for (let round = 0; round < maxRounds; round++) {
      if (this.isAborted()) return;

      this.transitionTo("reviewing");
      const reviewStart = Date.now();
      this.emit("step-start", { step: "review", state: this.state });

      try {
        const model = this.resolveModelForStep("review");
        const learningsText = allLearnings.join("\n");
        const prompt = resolvePrompt(
          "review",
          this.config.promptOverrides ?? {},
          plan,
          learningsText,
        );

        const followUpQueries = await generateStructured({
          model,
          schema: reviewQueryArraySchema,
          prompt,
          abortSignal: this.abortController?.signal,
        });

        const reviewDuration = Date.now() - reviewStart;
        this.emit("step-complete", {
          step: "review",
          duration: reviewDuration,
        });
        logger.info("Review step completed", {
          round: round + 1,
          followUpCount: followUpQueries.length,
          duration: reviewDuration,
        });

        // No more queries needed
        if (followUpQueries.length === 0) break;

        // Execute follow-up search + analyze for each query
        for (const task of followUpQueries) {
          if (this.isAborted()) return;

          // Search
          this.transitionTo("searching");
          const searchStart = Date.now();
          this.emit("step-start", { step: "search", state: this.state });

          let sources: Source[];

          try {
            const searchResult = await this.searchProvider.search(task.query, {
              abortSignal: this.abortController?.signal,
            });
            sources = searchResult.sources;
            const searchDuration = Date.now() - searchStart;
            this.emit("step-complete", {
              step: "search",
              duration: searchDuration,
            });
          } catch (error) {
            this.handleStepError("search", error);
            throw error;
          }

          if (this.isAborted()) return;

          // Analyze
          const analyzeResult = await this.runAnalyze(task, sources);
          allLearnings.push(analyzeResult.learning);
          allSources.push(...analyzeResult.sources);
          allImages.push(...analyzeResult.images);
        }
      } catch (error) {
        this.handleStepError("review", error);
        throw error;
      }
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
  ): Promise<string> {
    const step: ResearchStep = "report";
    this.transitionTo("reporting");
    const start = Date.now();

    this.emit("step-start", { step, state: this.state });

    try {
      const model = this.resolveModelForStep(step);
      const prompt = resolvePrompt(
        "report",
        this.config.promptOverrides ?? {},
        plan,
        learnings,
        sources,
        images,
      );

      const result = await streamWithAbort({
        model,
        messages: this.buildMessages(prompt),
        abortSignal: this.abortController?.signal,
      });

      let reportText = "";
      for await (const part of result.fullStream) {
        if (this.isAborted()) return "";

        if (part.type === "text-delta") {
          this.emit("step-delta", { step, text: part.textDelta });
          reportText += part.textDelta;
        } else if (part.type === "reasoning") {
          this.emit("step-reasoning", { step, text: part.textDelta });
        }
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
    );

    const queries = await generateStructured({
      model,
      schema: searchTaskArraySchema,
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

  private buildMessages(userPrompt: string): CoreMessage[] {
    const systemPrompt = resolvePrompt(
      "system",
      this.config.promptOverrides ?? {},
      this.config.language,
    );

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
