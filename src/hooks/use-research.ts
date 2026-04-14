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
import { createSSEBuffer } from "@/hooks/sse-parser";
import type { ReportStyle, ReportLength } from "@/engine/research/types";
import type { Source, ImageSource } from "@/engine/research/types";

// Re-export for backward compat with existing test imports
export { parseSSEChunk, createSSEBuffer } from "@/hooks/sse-parser";

/** Lazy import — keeps fuse.js out of the hot module path. */
let _ks: typeof import("@/stores/knowledge-store").useKnowledgeStore | null = null;
async function getKS() {
  if (!_ks) { _ks = (await import("@/stores/knowledge-store")).useKnowledgeStore; }
  return _ks;
}

// Types
export interface StartOptions {
  topic: string;
  reportStyle?: ReportStyle;
  reportLength?: ReportLength;
  language?: string;
}

export interface UseResearchReturn {
  // Phase-specific actions
  clarify: (options: StartOptions) => void;
  retryClarify: () => void;
  submitFeedbackAndPlan: () => void;
  approvePlanAndResearch: () => void;
  requestMoreResearch: () => void;
  generateReport: () => void;
  finalizeFindings: () => void;
  regenerateReport: () => void;
  // Lifecycle
  abort: () => void;
  reset: () => void;
  // Reactive state
  isConnected: boolean;
  elapsedMs: number | null;
  isActive: boolean;
  connectionError: string | null;
}

// Shared base body builder

/** Fields common to every phase request (providers, search, etc.). */
function buildBaseBody() {
  const s = useSettingsStore.getState();

  // proxyMode controls provider key source: client-side keys vs server env.
  // localOnlyMode only controls whether search happens — irrelevant to provider resolution.
  let providers: Array<{ id: string; apiKey: string; baseURL?: string; thinkingModelId?: string; networkingModelId?: string }> | undefined;
  if (!s.proxyMode) {
    // Non-proxy: always send client keys
    providers = s.providers
      .filter((p) => p.enabled && p.apiKey)
      .map((p) => ({
        id: p.id, apiKey: p.apiKey, baseURL: p.baseURL,
        thinkingModelId: p.thinkingModelId, networkingModelId: p.networkingModelId,
      }));
  }
  // else: proxy mode → providers stays undefined (server uses its own keys)

  return {
    promptOverrides: Object.keys(s.promptOverrides).length > 0 ? s.promptOverrides : undefined,
    autoReviewRounds: s.autoReviewRounds,
    maxSearchQueries: s.maxSearchQueries,
    localOnly: s.localOnlyMode,
    providers,
    search: { provider: s.searchProvider ?? undefined, includeDomains: s.includeDomains, excludeDomains: s.excludeDomains, citationImages: s.citationImages },
    _auth: s.proxyMode ? createAuthHeaders(s.accessPassword) : {},
  };
}

/** Load knowledge content for selected items (defensive: skip deleted). */
async function loadKnowledgeContent(): Promise<{ title: string; content: string }[]> {
  const { selectedKnowledgeIds } = useSettingsStore.getState();
  if (selectedKnowledgeIds.length === 0) return [];
  const ks = (await getKS()).getState().items;
  return selectedKnowledgeIds
    .map((id) => { const it = ks.find((k) => k.id === id); return it ? { title: it.title, content: it.content } : null; })
    .filter((x): x is { title: string; content: string } => x !== null);
}

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

  // Timer management
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

  // Cleanup
  const cleanup = useCallback(() => {
    setIsConnected(false);
    // Don't stop timer between phases — only finalize on terminal states
  }, []);

  // SSE connection — generic phase-aware connector
  const connectSSE = useCallback(
    async (body: Record<string, unknown>, isReportPhase: boolean = false) => {
      if (abortControllerRef.current) { abortControllerRef.current.abort(); }

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
            const dataMatch = text.match(/data:\s*(.+)/);
            if (dataMatch) { const ed = JSON.parse(dataMatch[1]); errorMsg = ed.message ?? errorMsg; }
            else { const json = JSON.parse(text); errorMsg = json.message ?? json.error ?? errorMsg; }
          } catch { /* use default HTTP error */ }
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
                  topic: rs.topic, title: rs.result.title ?? rs.topic,
                  state: rs.state === "failed" ? "failed" : "completed",
                  startedAt: rs.startedAt ?? Date.now(), completedAt: rs.completedAt ?? Date.now(),
                  report: rs.result.report, learnings: rs.result.learnings,
                  sources: rs.result.sources, images: rs.result.images,
                  reportStyle: restBody.reportStyle as ReportStyle ?? "balanced",
                  reportLength: restBody.reportLength as ReportLength ?? "standard",
                });
              }
            } catch (err) { console.error("[useResearch] Failed to auto-save to history:", err); }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      searchProvider, includeDomains, excludeDomains, citationImages,
      promptOverrides, autoReviewRounds, maxSearchQueries, localOnlyMode,
      proxyMode, accessPassword, providers,
      startTimer, finalizeTimer, cleanup,
    ],
  );

  // Phase-specific actions

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

  /** Retry clarify — re-send the same topic when clarify was interrupted. */
  const retryClarify = useCallback(async () => {
    const { topic } = useResearchStore.getState();
    if (!topic) return;
    useResearchStore.setState({
      connectionInterrupted: false,
      questions: "",
      steps: { ...useResearchStore.getState().steps, clarify: { text: "", reasoning: "", progress: 0, startTime: null, endTime: null, duration: null } },
    });
    const base = buildBaseBody();
    const knowledgeContent = await loadKnowledgeContent();
    await connectSSE({
      phase: "clarify", topic, knowledgeContent,
      promptOverrides: base.promptOverrides, autoReviewRounds: base.autoReviewRounds,
      maxSearchQueries: base.maxSearchQueries, localOnly: base.localOnly,
      providers: base.providers, search: base.search, _auth: base._auth,
    });
  }, [connectSSE]);

  /** Phase 2: Plan — submit Q&A feedback and generate research plan. */
  const submitFeedbackAndPlan = useCallback(
    async () => {
      const { topic, questions, feedback } = useResearchStore.getState();
      const settings = useSettingsStore.getState();

      await connectSSE({
        phase: "plan",
        topic,
        questions,
        feedback,
        language: settings.language ?? undefined,
        reportStyle: settings.reportStyle ?? undefined,
        reportLength: settings.reportLength ?? undefined,
        ...buildBaseBody(),
      });
    },
    [connectSSE],
  );

  /** Phase 3a: Research — execute search+analyze from the approved plan. */
  const approvePlanAndResearch = useCallback(
    async () => {
      const { plan } = useResearchStore.getState();
      const settings = useSettingsStore.getState();

      // Initialize auto-review counter from settings
      useResearchStore.setState({ autoReviewRoundsRemaining: settings.autoReviewRounds });

      await connectSSE({
        phase: "research",
        plan,
        language: settings.language ?? undefined,
        ...buildBaseBody(),
      });
    },
    [connectSSE],
  );

  /** Phase 3b: More Research — send review phase with current learnings/sources/images. */
  const requestMoreResearch = useCallback(
    async () => {
      const {
        plan,
        suggestion,
        result,
      } = useResearchStore.getState();

      // Clear pending suggestion BEFORE connecting to avoid race
      useResearchStore.getState().clearSuggestion();

      await connectSSE({
        phase: "review",
        plan,
        learnings: result?.learnings ?? [],
        sources: (result?.sources ?? []).map((s) => ({ url: s.url, title: s.title })),
        images: (result?.images ?? []).map((i) => ({ url: i.url, description: i.description ?? undefined })),
        suggestion: suggestion.trim() || undefined,
        language: useSettingsStore.getState().language ?? undefined,
        ...buildBaseBody(),
      });
    },
    [connectSSE],
  );

  /** Build the SSE request body common to generateReport / regenerateReport. */
  function buildReportBody(
    plan: string,
    learnings: string[],
    sources: Source[],
    images: ImageSource[],
    feedback?: string,
  ) {
    const base = buildBaseBody();
    const settings = useSettingsStore.getState();
    return {
      phase: "report" as const,
      plan,
      learnings,
      sources: sources.map((s) => ({ url: s.url, title: s.title })),
      images: images.map((i) => ({ url: i.url, description: i.description ?? undefined })),
      feedback: feedback || undefined,
      reportStyle: settings.reportStyle ?? undefined,
      reportLength: settings.reportLength ?? undefined,
      language: settings.language ?? undefined,
      promptOverrides: base.promptOverrides,
      localOnly: base.localOnly,
      providers: base.providers,
      _auth: base._auth,
    };
  }

  /** Phase 4: Report — generate final report from learnings and sources. */
  const generateReport = useCallback(
    async () => {
      const { plan, result } = useResearchStore.getState();
      const body = buildReportBody(
        plan,
        result?.learnings ?? [],
        result?.sources ?? [],
        result?.images ?? [],
      );
      await connectSSE(body, true);
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

  /** Regenerate report using frozen research checkpoint + user feedback. */
  const regenerateReport = useCallback(
    async () => {
      const { reportFeedback, checkpoints, plan } = useResearchStore.getState();
      const researchCp = checkpoints.research;
      const planCp = checkpoints.plan;

      const body = buildReportBody(
        planCp?.plan ?? plan,
        researchCp?.result?.learnings ?? [],
        researchCp?.result?.sources ?? [],
        researchCp?.result?.images ?? [],
        reportFeedback || undefined,
      );

      await connectSSE(body, true);
    },
    [connectSSE],
  );

  // Lifecycle actions
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

  // Cleanup on unmount
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

  // Sync elapsed from store timestamps
  const storeCompletedAt = useResearchStore((s) => s.completedAt);

  useEffect(() => {
    if (storeStartedAt && storeCompletedAt) {
      setElapsedMs(storeCompletedAt - storeStartedAt);
    }
  }, [storeStartedAt, storeCompletedAt]);

  // Immediate retry: when retrySearchResult sets immediateRetryQuery,
  // fire a research SSE with just that query, bypassing the queue.
  const immediateRetryQuery = useResearchStore((s) => s.immediateRetryQuery);

  useEffect(() => {
    if (!immediateRetryQuery) return;

    const query = immediateRetryQuery;
    // Clear the signal immediately to prevent re-triggers
    useResearchStore.getState().clearImmediateRetry();

    const plan = useResearchStore.getState().plan;
    const planString = `${plan}\n\nRetry query:\n- ${query}`;

    connectSSE({
      phase: "research",
      plan: planString,
      language: useSettingsStore.getState().language ?? undefined,
      ...buildBaseBody(),
    });
  }, [immediateRetryQuery, connectSSE]);

  // Auto-reconnect: when research phase returns partial results due to time
  // budget, automatically continue with remaining queries in a new SSE connection.
  const pendingRemainingQueries = useResearchStore((s) => s.pendingRemainingQueries);

  useEffect(() => {
    if (pendingRemainingQueries.length === 0) return;

    const queries = [...pendingRemainingQueries];
    // Clear immediately to prevent re-triggers
    useResearchStore.setState({ pendingRemainingQueries: [] });

    const plan = useResearchStore.getState().plan;

    console.info("[useResearch] Auto-reconnecting with remaining queries", {
      count: queries.length,
    });

    connectSSE({
      phase: "research",
      plan,
      queries,
      language: useSettingsStore.getState().language ?? undefined,
      ...buildBaseBody(),
    });
  }, [pendingRemainingQueries, connectSSE]);

  // Auto-review trigger: when research-result completes and auto-review rounds
  // remain, automatically fire a review SSE connection to deepen the research.
  const autoReviewRoundsRemaining = useResearchStore((s) => s.autoReviewRoundsRemaining);
  const researchState = useResearchStore((s) => s.state);

  useEffect(() => {
    // Only trigger when state has settled to awaiting_results_review from a
    // research-result or review-result completion, and rounds remain.
    if (researchState !== "awaiting_results_review") return;
    if (autoReviewRoundsRemaining <= 0) return;

    const settings = useSettingsStore.getState();
    if (settings.autoReviewRounds <= 0) return;

    const { plan, suggestion, result } = useResearchStore.getState();

    // Decrement counter before firing to prevent re-triggers
    const currentRound = settings.autoReviewRounds - autoReviewRoundsRemaining + 1;
    useResearchStore.setState({
      autoReviewRoundsRemaining: autoReviewRoundsRemaining - 1,
    });

    console.info("[useResearch] Auto-review triggered", {
      round: currentRound,
      remaining: autoReviewRoundsRemaining - 1,
      learningsCount: result?.learnings?.length ?? 0,
    });

    connectSSE({
      phase: "review",
      plan,
      learnings: result?.learnings ?? [],
      sources: (result?.sources ?? []).map((s) => ({ url: s.url, title: s.title })),
      images: (result?.images ?? []).map((i) => ({ url: i.url, description: i.description ?? undefined })),
      suggestion: suggestion.trim() || undefined,
      language: settings.language ?? undefined,
      ...buildBaseBody(),
    });
  }, [researchState, autoReviewRoundsRemaining, connectSSE]);

  return {
    // Phase-specific
    clarify,
    retryClarify,
    submitFeedbackAndPlan,
    approvePlanAndResearch,
    requestMoreResearch,
    generateReport,
    finalizeFindings,
    regenerateReport,
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
