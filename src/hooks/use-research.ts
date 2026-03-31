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
import type { ReportStyle, ReportLength } from "@/engine/research/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for starting a research run. */
export interface StartOptions {
  topic: string;
  reportStyle?: ReportStyle;
  reportLength?: ReportLength;
  language?: string;
}

/** Return type of useResearch(). */
export interface UseResearchReturn {
  /** Start a new research run. */
  start: (options: StartOptions) => void;
  /** Abort an active research run. */
  abort: () => void;
  /** Reset store state to idle. */
  reset: () => void;
  /** Whether the hook is currently connected to an SSE stream. */
  isConnected: boolean;
  /** Milliseconds since research started (live-updating). */
  elapsedMs: number | null;
  /** Whether a research run is in progress. */
  isActive: boolean;
  /** Last connection error, if any. */
  connectionError: string | null;
}

// ---------------------------------------------------------------------------
// SSE parser
// ---------------------------------------------------------------------------

/**
 * Parse SSE text from a ReadableStream, calling back for each event.
 *
 * SSE format:
 *   event: <type>\n
 *   data: <json>\n
 *   \n
 *
 * The parser is intentionally simple — it buffers text, splits on double
 * newlines, then extracts event/data pairs. This avoids needing a full
 * SSE library for a single endpoint.
 */
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
// SSE buffer for cross-chunk events
// ---------------------------------------------------------------------------

/**
 * Creates a buffered SSE parser that handles events spanning multiple chunks.
 * Returns a function that accepts raw text chunks and dispatches complete events.
 */
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

  // Settings selectors
  const searchProvider = useSettingsStore((s) => s.searchProvider);
  const includeDomains = useSettingsStore((s) => s.includeDomains);
  const excludeDomains = useSettingsStore((s) => s.excludeDomains);
  const citationImages = useSettingsStore((s) => s.citationImages);

  // UI navigation
  const navigate = useUIStore((s) => s.navigate);

  // ---------------------------------------------------------------------------
  // Timer management
  // ---------------------------------------------------------------------------

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      const startedAt = useResearchStore.getState().startedAt;
      if (startedAt) {
        setElapsedMs(Date.now() - startedAt);
      }
    }, 1000);
  }, [stopTimer]);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  const cleanup = useCallback(() => {
    setIsConnected(false);
    stopTimer();
    // Final elapsed update
    const { startedAt, completedAt } = useResearchStore.getState();
    if (startedAt && completedAt) {
      setElapsedMs(completedAt - startedAt);
    }
  }, [stopTimer]);

  // ---------------------------------------------------------------------------
  // SSE connection
  // ---------------------------------------------------------------------------

  const connectSSE = useCallback(
    async (options: StartOptions) => {
      // Create abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Build request body — merge settings with per-run options
      const body = {
        topic: options.topic,
        language: options.language,
        reportStyle: options.reportStyle,
        reportLength: options.reportLength,
        // Send provider keys for server-side config building reference
        // (server builds from env, but we include search config)
        search: {
          provider: searchProvider ?? undefined,
          includeDomains,
          excludeDomains,
          citationImages,
        },
      };

      console.info("[useResearch] SSE connection opening", {
        topic: options.topic,
      });

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

        // Create buffered SSE parser
        const sseBuffer = createSSEBuffer((eventType, data) => {
          console.info("[useResearch] SSE event received", {
            type: eventType,
            step: (data as Record<string, unknown>).step ?? "n/a",
          });
          useResearchStore.getState().handleEvent(eventType, data);

          // Auto-stop on terminal events
          if (eventType === "done" || eventType === "error") {
            cleanup();
          }
        });

        // Consume ReadableStream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

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
        // AbortError means intentional cancel — not a real error
        if (err instanceof DOMException && err.name === "AbortError") {
          console.info("[useResearch] SSE connection aborted");
          useResearchStore.getState().abort();
          cleanup();
          return;
        }

        const message =
          err instanceof Error ? err.message : "Connection failed";
        console.error("[useResearch] SSE connection error", {
          message,
        });

        setConnectionError(message);
        useResearchStore.getState().handleEvent("error", {
          code: "NETWORK_ERROR",
          message,
        });
        cleanup();
      }
    },
    [searchProvider, includeDomains, excludeDomains, citationImages, startTimer, cleanup],
  );

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Sync elapsed from store completedAt changes
  // ---------------------------------------------------------------------------

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
