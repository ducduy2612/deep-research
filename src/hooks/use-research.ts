/**
 * useResearch — thin adapter between SSE streaming API and research store.
 *
 * Supports multi-phase streaming via phase-specific actions:
 * - clarify() → submitFeedbackAndPlan() → approvePlanAndResearch() → generateReport()
 * - requestMoreResearch() for iterative deepening
 * - start() for backward-compatible full pipeline
 *
 * Each phase opens its own SSE connection, streams events to the store,
 * and stops the timer only on final completion or abort.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  useResearchStore,
  selectIsActive,
} from "@/stores/research-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUIStore } from "@/stores/ui-store";
import { useHistoryStore } from "@/stores/history-store";
import { createAuthHeaders } from "@/lib/client-signature";
import type { ReportStyle, ReportLength } from "@/engine/research/types";
import type { Source, ImageSource } from "@/engine/research/types";

/** Lazy import — keeps fuse.js out of the hot module path. */
let _ks: typeof import("@/stores/knowledge-store").useKnowledgeStore | null = null;
async function getKS() {
  if (!_ks) { _ks = (await import("@/stores/knowledge-store")).useKnowledgeStore; }
  return _ks;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StartOptions {
  topic: string;
  reportStyle?: ReportStyle;
  reportLength?: ReportLength;
  language?: string;
}

export interface UseResearchReturn {
  // Phase-specific actions
  clarify: (options: StartOptions) => void;
  submitFeedbackAndPlan: () => void;
  approvePlanAndResearch: () => void;
  requestMoreResearch: () => void;
  generateReport: () => void;
  finalizeFindings: () => void;
  // Backward-compatible full pipeline
  start: (options: StartOptions) => void;
  // Lifecycle
  abort: () => void;
  reset: () => void;
  // Reactive state
  isConnected: boolean;
  elapsedMs: number | null;
  isActive: boolean;
  connectionError: string | null;
}

// ---------------------------------------------------------------------------
// SSE parser — splits on double-newlines, extracts event/data pairs.
// ---------------------------------------------------------------------------

export function parseSSEChunk(
  chunk: string,
  onEvent: (eventType: string, data: unknown) => void,
): void {
  const lines = chunk.split("\n");
  let currentEvent = "";
  let currentData = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      currentData = line.slice(6);
    } else if (line === "" && currentEvent && currentData) {
      // End of event — dispatch
      try {
        const parsed = JSON.parse(currentData);
        onEvent(currentEvent, parsed);
      } catch {
        // Malformed JSON — skip event
        console.warn("[useResearch] Failed to parse SSE data:", currentData);
      }
      currentEvent = "";
      currentData = "";
    }
  }
}

// ---------------------------------------------------------------------------
// SSE buffer — handles events split across chunks.
// ---------------------------------------------------------------------------

export function createSSEBuffer(
  onEvent: (eventType: string, data: unknown) => void,
): (chunk: string) => void {
  let buffer = "";

  return (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    // Last element might be incomplete — keep it in buffer
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      let eventType = "";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }
      if (eventType && data) {
        try {
          const parsed = JSON.parse(data);
          onEvent(eventType, parsed);
        } catch {
          console.warn("[useResearch] Failed to parse SSE data:", data);
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Shared base body builder
// ---------------------------------------------------------------------------

/** Fields common to every phase request (providers, search, etc.). */
function buildBaseBody() {
  const settings = useSettingsStore.getState();
  const { searchProvider, includeDomains, excludeDomains, citationImages,
    promptOverrides, autoReviewRounds, maxSearchQueries, localOnlyMode,
    proxyMode, accessPassword, providers } = settings;

  return {
    promptOverrides: Object.keys(promptOverrides).length > 0 ? promptOverrides : undefined,
    autoReviewRounds,
    maxSearchQueries,
    localOnly: localOnlyMode,
    providers: !proxyMode
      ? providers.filter((p) => p.enabled && p.apiKey).map((p) => ({
          id: p.id, apiKey: p.apiKey, baseURL: p.baseURL,
          thinkingModelId: p.thinkingModelId, networkingModelId: p.networkingModelId,
        }))
      : undefined,
    search: {
      provider: searchProvider ?? undefined,
      includeDomains,
      excludeDomains,
      citationImages,
    },
    _auth: proxyMode ? createAuthHeaders(accessPassword) : {},
  };
}

/** Load knowledge content for selected items (defensive: skip deleted). */
async function loadKnowledgeContent(): Promise<
  { title: string; content: string }[]
> {
  const { selectedKnowledgeIds } = useSettingsStore.getState();
  if (selectedKnowledgeIds.length === 0) return [];
  const knowledgeStore = await getKS();
  const allItems = knowledgeStore.getState().items;
  return selectedKnowledgeIds
    .map((id) => {
      const it = allItems.find((k) => k.id === id);
      return it ? { title: it.title, content: it.content } : null;
    })
    .filter((x): x is { title: string; content: string } => x !== null);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useResearch(): UseResearchReturn {
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // Store selectors
  const isActive = useResearchStore(selectIsActive);
  const storeStartedAt = useResearchStore((s) => s.startedAt);

  // Settings selectors (used in connectSSE closure for request body)
  const searchProvider = useSettingsStore((s) => s.searchProvider);
  const includeDomains = useSettingsStore((s) => s.includeDomains);
  const excludeDomains = useSettingsStore((s) => s.excludeDomains);
  const citationImages = useSettingsStore((s) => s.citationImages);
  const promptOverrides = useSettingsStore((s) => s.promptOverrides);
  const autoReviewRounds = useSettingsStore((s) => s.autoReviewRounds);
  const maxSearchQueries = useSettingsStore((s) => s.maxSearchQueries);
  const localOnlyMode = useSettingsStore((s) => s.localOnlyMode);
  const proxyMode = useSettingsStore((s) => s.proxyMode);
  const accessPassword = useSettingsStore((s) => s.accessPassword);
  const providers = useSettingsStore((s) => s.providers);

  // UI navigation
  const navigate = useUIStore((s) => s.navigate);

  // -----------------------------------------------------------------------
  // Timer management
  // -----------------------------------------------------------------------

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    // Only start if not already running
    if (timerRef.current) return;
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      const startedAt = useResearchStore.getState().startedAt;
      if (startedAt) setElapsedMs(Date.now() - startedAt);
    }, 1000);
  }, []);

  /** Stop timer and finalize elapsed from store timestamps. */
  const finalizeTimer = useCallback(() => {
    stopTimer();
    const { startedAt, completedAt } = useResearchStore.getState();
    if (startedAt && completedAt) setElapsedMs(completedAt - startedAt);
  }, [stopTimer]);

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  const cleanup = useCallback(() => {
    setIsConnected(false);
    // Don't stop timer between phases — only finalize on terminal states
  }, []);

  // -----------------------------------------------------------------------
  // SSE connection — generic phase-aware connector
  // -----------------------------------------------------------------------

  const connectSSE = useCallback(
    async (body: Record<string, unknown>, isReportPhase: boolean = false) => {
      // Abort any existing connection
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      console.info("[useResearch] SSE connection opening", { phase: body.phase });

      try {
        const { _auth, ...restBody } = body as Record<string, unknown> & { _auth: Record<string, string> };
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ..._auth,
        };

        const response = await fetch("/api/research/stream", {
          method: "POST",
          headers,
          body: JSON.stringify(restBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          let errorMsg = `HTTP ${response.status}`;
          try {
            // Try SSE-formatted error first
            const dataMatch = text.match(/data:\s*(.+)/);
            if (dataMatch) {
              const errorData = JSON.parse(dataMatch[1]);
              errorMsg = errorData.message ?? errorMsg;
            } else {
              // Fallback: plain JSON error (middleware, etc.)
              const json = JSON.parse(text);
              errorMsg = json.message ?? json.error ?? errorMsg;
            }
          } catch {
            // Use default HTTP error
          }
          throw new Error(errorMsg);
        }

        setIsConnected(true);
        setConnectionError(null);
        startTimer();

        const sseBuffer = createSSEBuffer((eventType, data) => {
          console.info("[useResearch] SSE event received", {
            type: eventType,
            step: (data as Record<string, unknown>).step ?? "n/a",
          });
          useResearchStore.getState().handleEvent(eventType, data);

          // On terminal events: finalize timer + cleanup connection
          if (eventType === "done" || eventType === "error") {
            cleanup();
            finalizeTimer();
          }

          // Auto-save completed research to history on report phase done
          if (eventType === "done" && isReportPhase) {
            try {
              const rs = useResearchStore.getState();
              if (rs.result) {
                useHistoryStore.getState().save({
                  id: rs.topic + "-" + (rs.startedAt ?? Date.now()),
                  topic: rs.topic,
                  title: rs.result.title ?? rs.topic,
                  state: rs.state === "failed" ? "failed" : "completed",
                  startedAt: rs.startedAt ?? Date.now(),
                  completedAt: rs.completedAt ?? Date.now(),
                  report: rs.result.report,
                  learnings: rs.result.learnings,
                  sources: rs.result.sources,
                  images: rs.result.images,
                  reportStyle: restBody.reportStyle as ReportStyle ?? "balanced",
                  reportLength: restBody.reportLength as ReportLength ?? "standard",
                });
                console.info("[useResearch] Auto-saved session to history");
              }
            } catch (err) {
              console.error("[useResearch] Failed to auto-save to history:", err);
            }
          }
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer(decoder.decode(value, { stream: true }));
          }
        } finally {
          reader.releaseLock();
          cleanup();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.info("[useResearch] SSE connection aborted");
          useResearchStore.getState().abort();
          finalizeTimer();
          cleanup();
          return;
        }

        const message = err instanceof Error ? err.message : "Connection failed";
        console.error("[useResearch] SSE connection error", { message });

        setConnectionError(message);
        useResearchStore.getState().handleEvent("error", {
          code: "NETWORK_ERROR",
          message,
        });
        finalizeTimer();
        cleanup();
      }
    },
    // Dependencies: settings selectors that go into request bodies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      searchProvider, includeDomains, excludeDomains, citationImages,
      promptOverrides, autoReviewRounds, maxSearchQueries, localOnlyMode,
      proxyMode, accessPassword, providers,
      startTimer, finalizeTimer, cleanup,
    ],
  );

  // -----------------------------------------------------------------------
  // Phase-specific actions
  // -----------------------------------------------------------------------

  /** Phase 1: Clarify — generate clarification questions for the topic. */
  const clarify = useCallback(
    async (options: StartOptions) => {
      // Reset store for new research session
      useResearchStore.getState().reset();
      useResearchStore.getState().setTopic(options.topic);

      // Navigate to active research view
      navigate("active");

      const knowledgeContent = await loadKnowledgeContent();
      const base = buildBaseBody();

      await connectSSE({
        phase: "clarify",
        topic: options.topic,
        language: options.language,
        reportStyle: options.reportStyle,
        reportLength: options.reportLength,
        knowledgeContent,
        promptOverrides: base.promptOverrides,
        autoReviewRounds: base.autoReviewRounds,
        maxSearchQueries: base.maxSearchQueries,
        localOnly: base.localOnly,
        providers: base.providers,
        search: base.search,
        _auth: base._auth,
      });
    },
    [navigate, connectSSE],
  );

  /** Phase 2: Plan — submit Q&A feedback and generate research plan. */
  const submitFeedbackAndPlan = useCallback(
    async () => {
      const { topic, questions, feedback } = useResearchStore.getState();

      await connectSSE({
        phase: "plan",
        topic,
        questions,
        feedback,
        ...buildBaseBody(),
      });
    },
    [connectSSE],
  );

  /** Phase 3a: Research — execute search+analyze from the approved plan. */
  const approvePlanAndResearch = useCallback(
    async () => {
      const { plan } = useResearchStore.getState();

      await connectSSE({
        phase: "research",
        plan,
        ...buildBaseBody(),
      });
    },
    [connectSSE],
  );

  /** Phase 3b: More Research — iterative deepening with retries + manual queries + suggestion. */
  const requestMoreResearch = useCallback(
    async () => {
      const {
        plan,
        suggestion,
        manualQueries,
        pendingRetryQueries,
      } = useResearchStore.getState();

      // Build enhanced plan string with all pending inputs
      const sections: string[] = [plan];

      if (pendingRetryQueries.length > 0) {
        sections.push(
          "Retry queries:\n" + pendingRetryQueries.map((q) => `- ${q}`).join("\n"),
        );
      }

      if (manualQueries.length > 0) {
        sections.push(
          "Manual queries:\n" + manualQueries.map((q) => `- ${q}`).join("\n"),
        );
      }

      if (suggestion.trim()) {
        sections.push(`Additional direction:\n${suggestion.trim()}`);
      }

      const planString = sections.join("\n\n");

      // Clear pending inputs BEFORE connecting to avoid race
      useResearchStore.getState().setManualQueries([]);
      useResearchStore.setState({ pendingRetryQueries: [] });
      useResearchStore.getState().clearSuggestion();

      await connectSSE({
        phase: "research",
        plan: planString,
        ...buildBaseBody(),
      });
    },
    [connectSSE],
  );

  /** Phase 4: Report — generate final report from learnings and sources. */
  const generateReport = useCallback(
    async () => {
      const { plan, result } = useResearchStore.getState();
      const learnings = result?.learnings ?? [];
      const sources: Source[] = result?.sources ?? [];
      const images: ImageSource[] = result?.images ?? [];

      const base = buildBaseBody();

      await connectSSE({
        phase: "report",
        plan,
        learnings,
        sources: sources.map((s) => ({ url: s.url, title: s.title })),
        images: images.map((i) => ({ url: i.url, description: i.description })),
        reportStyle: useSettingsStore.getState().reportStyle ?? undefined,
        reportLength: useSettingsStore.getState().reportLength ?? undefined,
        language: useSettingsStore.getState().language ?? undefined,
        promptOverrides: base.promptOverrides,
        _auth: base._auth,
      }, true); // isReportPhase = true → auto-save on done
    },
    [connectSSE],
  );

  /** Freeze research then generate report — single action for "Finalize Findings". */
  const finalizeFindings = useCallback(
    async () => {
      useResearchStore.getState().freeze("research");
      await generateReport();
    },
    [generateReport],
  );

  // -----------------------------------------------------------------------
  // Backward-compatible full pipeline
  // -----------------------------------------------------------------------

  const start = useCallback(
    async (options: StartOptions) => {
      // Reset store and start fresh
      useResearchStore.getState().reset();
      useResearchStore.getState().setTopic(options.topic);

      // Navigate to active research view
      navigate("active");

      // Build full-pipeline body inline (no phase field → defaults to "full")
      const base = buildBaseBody();
      const knowledgeContent = await loadKnowledgeContent();

      connectSSE({
        topic: options.topic,
        language: options.language,
        reportStyle: options.reportStyle,
        reportLength: options.reportLength,
        knowledgeContent,
        promptOverrides: base.promptOverrides,
        autoReviewRounds: base.autoReviewRounds,
        maxSearchQueries: base.maxSearchQueries,
        localOnly: base.localOnly,
        providers: base.providers,
        search: base.search,
        _auth: base._auth,
        // Mark as report phase for auto-save since full pipeline produces a report
      }, true);
    },
    [navigate, connectSSE],
  );

  // -----------------------------------------------------------------------
  // Lifecycle actions
  // -----------------------------------------------------------------------

  const abort = useCallback(() => {
    console.info("[useResearch] Abort triggered");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    useResearchStore.getState().abort();
    finalizeTimer();
    cleanup();
  }, [finalizeTimer, cleanup]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    useResearchStore.getState().reset();
    stopTimer();
    setElapsedMs(null);
    setIsConnected(false);
    setConnectionError(null);
  }, [stopTimer]);

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    return () => {
      console.info("[useResearch] Unmount cleanup");
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------------------------
  // Sync elapsed from store timestamps
  // -----------------------------------------------------------------------

  const storeCompletedAt = useResearchStore((s) => s.completedAt);

  useEffect(() => {
    if (storeStartedAt && storeCompletedAt) {
      setElapsedMs(storeCompletedAt - storeStartedAt);
    }
  }, [storeStartedAt, storeCompletedAt]);

  return {
    // Phase-specific
    clarify,
    submitFeedbackAndPlan,
    approvePlanAndResearch,
    requestMoreResearch,
    generateReport,
    finalizeFindings,
    // Full pipeline
    start,
    // Lifecycle
    abort,
    reset,
    // State
    isConnected,
    elapsedMs,
    isActive,
    connectionError,
  };
}
