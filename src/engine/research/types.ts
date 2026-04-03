import { z } from "zod";
import type {
  ResearchStep,
  StepModelMap,
  ProviderConfig,
} from "@/engine/provider/types";
import {
  stepModelMapSchema,
  providerConfigSchema,
} from "@/engine/provider/types";
import type { AppError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Research state
// ---------------------------------------------------------------------------

/** All possible states in the research lifecycle. */
export type ResearchState =
  | "idle"
  | "clarifying"
  | "awaiting_feedback"
  | "planning"
  | "awaiting_plan_review"
  | "searching"
  | "analyzing"
  | "reviewing"
  | "awaiting_results_review"
  | "reporting"
  | "completed"
  | "failed"
  | "aborted";

// ---------------------------------------------------------------------------
// Source types
// ---------------------------------------------------------------------------

/** A web source referenced in research results. */
export interface Source {
  url: string;
  title?: string;
}

/** An image source referenced in research results. */
export interface ImageSource {
  url: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Search types
// ---------------------------------------------------------------------------

/** A structured search task produced by the planning step. */
export interface SearchTask {
  query: string;
  researchGoal: string;
}

/** The result of executing a single search task. */
export interface SearchResult {
  query: string;
  researchGoal: string;
  learning: string;
  sources: Source[];
  images: ImageSource[];
}

// ---------------------------------------------------------------------------
// Report config types
// ---------------------------------------------------------------------------

/** Style of the final research report. */
export type ReportStyle = "balanced" | "executive" | "technical" | "concise";

/** Length of the final research report. */
export type ReportLength = "brief" | "standard" | "comprehensive";

// ---------------------------------------------------------------------------
// Prompt overrides
// ---------------------------------------------------------------------------

/** Keys of prompt templates that can be overridden. */
export type PromptOverrideKey =
  | "system"
  | "clarify"
  | "plan"
  | "serpQueries"
  | "analyze"
  | "review"
  | "report"
  | "outputGuidelines";

/** Map of prompt template names to custom prompt strings. */
export type PromptOverrides = Partial<Record<PromptOverrideKey, string>>;

// ---------------------------------------------------------------------------
// Research config
// ---------------------------------------------------------------------------

/** Full configuration for a research run. */
export interface ResearchConfig {
  topic: string;
  providerConfigs: ProviderConfig[];
  stepModelMap: StepModelMap;
  language?: string;
  reportStyle?: ReportStyle;
  reportLength?: ReportLength;
  /** Max automatic review-refinement loops (0 = no auto-review). */
  autoReviewRounds?: number;
  /** Max SERP queries generated per planning step. */
  maxSearchQueries?: number;
  /** Custom prompt templates. */
  promptOverrides?: PromptOverrides;
}

// ---------------------------------------------------------------------------
// Research events
// ---------------------------------------------------------------------------

/** Maps each event type to its typed payload. */
export interface ResearchEventMap {
  "step-start": { step: ResearchStep; state: ResearchState };
  "step-delta": { step: ResearchStep; text: string };
  "step-reasoning": { step: ResearchStep; text: string };
  "step-complete": { step: ResearchStep; duration: number };
  "step-error": { step: ResearchStep; error: AppError };
  progress: { step: ResearchStep; progress: number };
  "search-task": { tasks: SearchTask[] };
  "search-result": { query: string; sources: Source[]; images: ImageSource[] };
}

/** Union of all event type strings. */
export type ResearchEventType = keyof ResearchEventMap;

// ---------------------------------------------------------------------------
// Research result
// ---------------------------------------------------------------------------

/** The final output of a completed research run. */
export interface ResearchResult {
  title: string;
  report: string;
  learnings: string[];
  sources: Source[];
  images: ImageSource[];
}

// ---------------------------------------------------------------------------
// Phase result types (for multi-phase streaming)
// ---------------------------------------------------------------------------

/** Result of the clarify phase — generated follow-up questions. */
export interface ClarifyResult {
  questions: string;
}

/** Result of the plan phase — generated report plan. */
export interface PlanResult {
  plan: string;
}

/** Result of the search+analyze+review phase. */
export interface ResearchPhaseResult {
  learnings: string[];
  sources: Source[];
  images: ImageSource[];
}

/** Result of the report phase (same shape as full ResearchResult). */
export type ReportResult = ResearchResult;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const sourceSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});

export const imageSourceSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
});

export const searchTaskSchema = z.object({
  query: z.string().min(1),
  researchGoal: z.string().min(1),
});

export const researchConfigSchema = z.object({
  topic: z.string().min(1),
  providerConfigs: z.array(providerConfigSchema).min(1),
  stepModelMap: stepModelMapSchema,
  language: z.string().min(1).optional(),
  reportStyle: z
    .enum(["balanced", "executive", "technical", "concise"])
    .optional(),
  reportLength: z.enum(["brief", "standard", "comprehensive"]).optional(),
  autoReviewRounds: z.number().int().min(0).optional(),
  maxSearchQueries: z.number().int().min(1).optional(),
  promptOverrides: z
    .record(
      z.string().superRefine((key, ctx) => {
        const validKeys = [
          "system",
          "clarify",
          "plan",
          "serpQueries",
          "analyze",
          "review",
          "report",
          "outputGuidelines",
        ] as const;
        if (!(validKeys as readonly string[]).includes(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid prompt override key: "${key}". Must be one of: ${validKeys.join(", ")}`,
          });
        }
      }),
      z.string(),
    )
    .optional(),
});
