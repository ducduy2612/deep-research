/**
 * Persistence schemas for the research store.
 *
 * Extracted from research-store.ts to keep the main store under the 500-line
 * ESLint limit. Contains all Zod schemas for localforage round-trip validation.
 *
 * Schemas here use lenient validation (no `.min(1)` on strings) to accept
 * older persisted data that may have empty-string fields.
 */

import { z } from "zod";

import {
  searchResultSchema,
  researchResultSchema,
} from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Per-step streaming state
// ---------------------------------------------------------------------------

export const stepStreamSchema = z.object({
  text: z.string(),
  reasoning: z.string(),
  progress: z.number(),
  startTime: z.number().nullable(),
  endTime: z.number().nullable(),
  duration: z.number().nullable(),
});

// ---------------------------------------------------------------------------
// Lenient search-task schema (persistence only)
// ---------------------------------------------------------------------------

const searchTaskPersistSchema = z.object({
  query: z.string(),
  researchGoal: z.string(),
});

// ---------------------------------------------------------------------------
// Error & activity schemas
// ---------------------------------------------------------------------------

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const activityEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  level: z.enum(["info", "success", "warn", "error"]),
  message: z.string(),
  step: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Checkpoint schemas (lenient for storage round-trip)
// ---------------------------------------------------------------------------

const clarifyCheckpointSchema = z.object({
  frozenAt: z.number(),
  questions: z.string(),
});

const planCheckpointSchema = z.object({
  frozenAt: z.number(),
  plan: z.string(),
  searchTasks: z.array(searchTaskPersistSchema),
});

const researchPhaseCheckpointSchema = z.object({
  frozenAt: z.number(),
  searchResults: z.array(searchResultSchema),
  result: researchResultSchema.nullable(),
});

const reportCheckpointSchema = z.object({
  frozenAt: z.number(),
  result: researchResultSchema,
});

const checkpointsSchema = z.object({
  clarify: clarifyCheckpointSchema.optional(),
  plan: planCheckpointSchema.optional(),
  research: researchPhaseCheckpointSchema.optional(),
  report: reportCheckpointSchema.optional(),
});

// ---------------------------------------------------------------------------
// State enum values
// ---------------------------------------------------------------------------

export const researchStateValues = [
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
] as const;

// ---------------------------------------------------------------------------
// Full persisted state schema
// ---------------------------------------------------------------------------

export const persistedStateSchema = z.object({
  topic: z.string(),
  state: z.enum(researchStateValues),
  steps: z.record(z.string(), stepStreamSchema),
  searchTasks: z.array(searchTaskPersistSchema),
  searchResults: z.array(searchResultSchema),
  result: researchResultSchema.nullable(),
  error: errorSchema.nullable(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  activityLog: z.array(activityEntrySchema),
  questions: z.string(),
  feedback: z.string(),
  plan: z.string(),
  suggestion: z.string(),
  // Checkpoints & manual queries (added M003)
  checkpoints: checkpointsSchema.optional().default({}),
  manualQueries: z.array(z.string()).optional().default([]),
});

/** Storage key for research state persistence. */
export const STORAGE_KEY = "research-state";
