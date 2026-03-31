/**
 * useResearch — thin adapter between SSE streaming API and research store.
 *
 * Connects to POST /api/research/stream, parses SSE events, dispatches
 * them to useResearchStore, manages AbortController lifecycle, and tracks
 * elapsed time via setInterval.
 *
 * Returns start/abort/reset plus reactive store selectors.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  useResearchStore,
  selectIsActive,
} from "@/stores/research-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUIStore } from "@/stores/ui-store";
import { useHistoryStore } from "@/stores/history-store";
import type { ReportStyle, ReportLength } from "@/engine/research/types";

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
  start: (options: StartOptions) => void;
  abort: () => void;
  reset: () => void;
  isConnected: boolean;
  elapsedMs: number | null;
  isActive: boolean;
  connectionError: string | null;
}

// SSE parser — splits on double-newlines, extracts event/data pairs.

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

// SSE buffer — handles events split across chunks.

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

// Hook

export function useResearch(): UseResearchReturn {
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // Store selectors
  const isActive = useResearchStore(selectIsActive);
  const storeStartedAt = useResearchStore((s) => s.startedAt);

  // Settings selectors
  const searchProvider = useSettingsStore((s) => s.searchProvider);
  const includeDomains = useSettingsStore((s) => s.includeDomains);
  const excludeDomains = useSettingsStore((s) => s.excludeDomains);
  const citationImages = useSettingsStore((s) => s.citationImages);
  const promptOverrides = useSettingsStore((s) => s.promptOverrides);
  const autoReviewRounds = useSettingsStore((s) => s.autoReviewRounds);
  const maxSearchQueries = useSettingsStore((s) => s.maxSearchQueries);
  const localOnlyMode = useSettingsStore((s) => s.localOnlyMode);
  const selectedKnowledgeIds = useSettingsStore((s) => s.selectedKnowledgeIds);

  // UI navigation
  const navigate = useUIStore((s) => s.navigate);

  // Timer

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      const startedAt = useResearchStore.getState().startedAt;
      if (startedAt) setElapsedMs(Date.now() - startedAt);
    }, 1000);
  }, [stopTimer]);

  // Cleanup

  const cleanup = useCallback(() => {
    setIsConnected(false);
    stopTimer();
    const { startedAt, completedAt } = useResearchStore.getState();
    if (startedAt && completedAt) setElapsedMs(completedAt - startedAt);
  }, [stopTimer]);

  // SSE connection

  const connectSSE = useCallback(
    async (options: StartOptions) => {
      // Create abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Build request body — merge settings with per-run options
      // Load knowledge content for selected items (defensive: skip deleted)
      const knowledgeStore = await getKS();
      const allItems = knowledgeStore.getState().items;
      const knowledgeContent = selectedKnowledgeIds
        .map((id) => { const it = allItems.find((k) => k.id === id); return it ? { title: it.title, content: it.content } : null; })
        .filter((x): x is { title: string; content: string } => x !== null);

      const body = {
        topic: options.topic,
        language: options.language,
        reportStyle: options.reportStyle,
        reportLength: options.reportLength,
        promptOverrides: Object.keys(promptOverrides).length > 0 ? promptOverrides : undefined,
        autoReviewRounds,
        maxSearchQueries,
        localOnly: localOnlyMode,
        knowledgeContent,
        // Send provider keys for server-side config building reference
        // (server builds from env, but we include search config)
        search: {
          provider: searchProvider ?? undefined,
          includeDomains,
          excludeDomains,
          citationImages,
        },
      };

      console.info("[useResearch] SSE connection opening", { topic: options.topic });

      try {
        const response = await fetch("/api/research/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Try to parse error from SSE error response
          const text = await response.text();
          let errorMsg = `HTTP ${response.status}`;
          try {
            // Error responses are also SSE formatted
            const dataMatch = text.match(/data:\s*(.+)/);
            if (dataMatch) {
              const errorData = JSON.parse(dataMatch[1]);
              errorMsg = errorData.message ?? errorMsg;
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
          console.info("[useResearch] SSE event received", { type: eventType, step: (data as Record<string, unknown>).step ?? "n/a" });
          useResearchStore.getState().handleEvent(eventType, data);

          // Auto-stop on terminal events
          if (eventType === "done" || eventType === "error") cleanup();

          // Auto-save completed research to history
          if (eventType === "done") {
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
                  reportStyle: options.reportStyle ?? "balanced",
                  reportLength: options.reportLength ?? "standard",
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
        cleanup();
      }
    },
    [searchProvider, includeDomains, excludeDomains, citationImages, promptOverrides, autoReviewRounds, maxSearchQueries, localOnlyMode, selectedKnowledgeIds, startTimer, cleanup],
  );

  // Public actions

  const start = useCallback(
    (options: StartOptions) => {
      // Abort any existing run
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Reset store and start fresh
      useResearchStore.getState().reset();
      useResearchStore.getState().setTopic(options.topic);

      // Navigate to active research view
      navigate("active");

      // Start SSE connection
      connectSSE(options);
    },
    [connectSSE, navigate],
  );

  const abort = useCallback(() => {
    console.info("[useResearch] Abort triggered");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    useResearchStore.getState().abort();
    cleanup();
  }, [cleanup]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    useResearchStore.getState().reset();
    cleanup();
    setConnectionError(null);
  }, [cleanup]);

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

  // Sync elapsed from store

  const storeCompletedAt = useResearchStore((s) => s.completedAt);

  useEffect(() => {
    if (storeStartedAt && storeCompletedAt) {
      setElapsedMs(storeCompletedAt - storeStartedAt);
    }
  }, [storeStartedAt, storeCompletedAt]);

  return {
    start,
    abort,
    reset,
    isConnected,
    elapsedMs,
    isActive,
    connectionError,
  };
}
