/**
 * @vitest-environment jsdom
 * Tests for ResearchActions — auto-review banner, button visibility, abort.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { ResearchActions } from "@/components/research/ResearchActions";
// useResearchStore is used via mock — imported for type reference only

// ---------------------------------------------------------------------------
// Mock next-intl — provide ResearchActions translation keys
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => {
  const messages: Record<string, string> = {
    title: "Research Results",
    learnings: "{count} learnings",
    sources: "{count} sources",
    suggestionLabel: "SUGGESTION",
    suggestionPlaceholder: "Suggest additional research directions...",
    moreResearch: "More Research",
    finalizeFindings: "Finalize Findings",
    pendingQueries: "{count} pending",
    generateReport: "Generate Report",
    loading: "Researching...",
    autoReviewProgress: "Auto-review round {current}/{total}...",
    autoReviewComplete: "Auto-review complete",
    autoReviewAbort: "Abort auto-review",
    autoReviewBannerTitle: "AUTO-REVIEW",
  };

  function t(key: string, params?: Record<string, number | string>): string {
    let val = messages[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(`{${k}}`, String(v));
      }
    }
    return val;
  }

  return {
    useTranslations: () => t,
  };
});

// ---------------------------------------------------------------------------
// Mock Zustand store — use vi.hoisted for mock state
// ---------------------------------------------------------------------------

const { mockStoreState } = vi.hoisted(() => {
  const mockStoreState = {
    state: "idle" as string,
    result: null as { learnings: string[]; sources: { url: string; title?: string }[]; images: { url: string; description?: string }[] } | null,
    suggestion: "",
    manualQueries: [] as readonly string[],
    autoReviewCurrentRound: 0,
    autoReviewTotalRounds: 0,
  };
  return { mockStoreState };
});

vi.mock("@/stores/research-store", () => {
  return {
    useResearchStore: Object.assign(
      // Selector form: useResearchStore(selector)
      (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
      {
        getState: () => mockStoreState,
        setState: vi.fn(),
        subscribe: vi.fn(),
      },
    ),
  };
});

// Mock ManualQueryInput to avoid its internal deps
vi.mock("@/components/research/ManualQueryInput", () => ({
  ManualQueryInput: () => <div data-testid="manual-query-input" />,
}));

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset mock store state
  Object.assign(mockStoreState, {
    state: "idle",
    result: null,
    suggestion: "",
    manualQueries: [],
    autoReviewCurrentRound: 0,
    autoReviewTotalRounds: 0,
  });
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ResearchActions", () => {
  const defaultProps = {
    onRequestMoreResearch: vi.fn(),
    onFinalizeFindings: vi.fn(),
    onAbortAutoReview: vi.fn(),
  };

  describe("auto-review banner", () => {
    it("shows auto-review progress banner when state=reviewing and autoReviewCurrentRound > 0", () => {
      Object.assign(mockStoreState, {
        state: "reviewing",
        autoReviewCurrentRound: 1,
        autoReviewTotalRounds: 2,
        result: { learnings: ["L1"], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.getByText("Auto-review round 1/2...")).toBeInTheDocument();
      expect(screen.getByText("AUTO-REVIEW")).toBeInTheDocument();
      expect(screen.getByText("Abort auto-review")).toBeInTheDocument();
    });

    it("shows correct round numbers in the banner", () => {
      Object.assign(mockStoreState, {
        state: "reviewing",
        autoReviewCurrentRound: 3,
        autoReviewTotalRounds: 5,
        result: { learnings: ["L1"], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.getByText("Auto-review round 3/5...")).toBeInTheDocument();
    });

    it("hides More Research and Finalize buttons during auto-review", () => {
      Object.assign(mockStoreState, {
        state: "reviewing",
        autoReviewCurrentRound: 1,
        autoReviewTotalRounds: 2,
        result: { learnings: ["L1"], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.queryByText("More Research")).not.toBeInTheDocument();
      expect(screen.queryByText("Finalize Findings")).not.toBeInTheDocument();
    });
  });

  describe("normal review UI (no auto-review)", () => {
    it("shows More Research and Finalize buttons when state=awaiting_results_review and autoReviewCurrentRound=0", () => {
      Object.assign(mockStoreState, {
        state: "awaiting_results_review",
        autoReviewCurrentRound: 0,
        autoReviewTotalRounds: 0,
        result: { learnings: ["L1"], sources: [{ url: "https://example.com", title: "Example" }], images: [] },
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.getByText("More Research")).toBeInTheDocument();
      expect(screen.getByText("Finalize Findings")).toBeInTheDocument();
    });

    it("does not show auto-review banner during normal review", () => {
      Object.assign(mockStoreState, {
        state: "awaiting_results_review",
        autoReviewCurrentRound: 0,
        autoReviewTotalRounds: 0,
        result: { learnings: ["L1"], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.queryByText(/Auto-review round/)).not.toBeInTheDocument();
      expect(screen.queryByText("Abort auto-review")).not.toBeInTheDocument();
    });
  });

  describe("abort button", () => {
    it("is visible during auto-review", () => {
      Object.assign(mockStoreState, {
        state: "reviewing",
        autoReviewCurrentRound: 1,
        autoReviewTotalRounds: 3,
        result: { learnings: [], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} />);

      const abortButton = screen.getByText("Abort auto-review");
      expect(abortButton).toBeInTheDocument();
    });

    it("calls onAbortAutoReview when clicked", () => {
      const onAbort = vi.fn();

      Object.assign(mockStoreState, {
        state: "reviewing",
        autoReviewCurrentRound: 2,
        autoReviewTotalRounds: 3,
        result: { learnings: [], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} onAbortAutoReview={onAbort} />);

      fireEvent.click(screen.getByText("Abort auto-review"));
      expect(onAbort).toHaveBeenCalledTimes(1);
    });

    it("does not render abort button when onAbortAutoReview is not provided", () => {
      Object.assign(mockStoreState, {
        state: "reviewing",
        autoReviewCurrentRound: 1,
        autoReviewTotalRounds: 2,
        result: { learnings: [], sources: [], images: [] },
      });

      render(<ResearchActions {...defaultProps} onAbortAutoReview={undefined} />);

      expect(screen.queryByText("Abort auto-review")).not.toBeInTheDocument();
    });
  });

  describe("loading state (researching, not auto-review)", () => {
    it("shows loading spinner when state=searching and autoReviewCurrentRound=0", () => {
      Object.assign(mockStoreState, {
        state: "searching",
        autoReviewCurrentRound: 0,
        result: null,
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.getByText("Researching...")).toBeInTheDocument();
    });

    it("shows loading spinner when state=analyzing", () => {
      Object.assign(mockStoreState, {
        state: "analyzing",
        autoReviewCurrentRound: 0,
        result: null,
      });

      render(<ResearchActions {...defaultProps} />);

      expect(screen.getByText("Researching...")).toBeInTheDocument();
    });
  });

  describe("returns null for non-relevant states", () => {
    it("returns null when state=idle", () => {
      Object.assign(mockStoreState, { state: "idle" });

      const { container } = render(<ResearchActions {...defaultProps} />);
      expect(container.innerHTML).toBe("");
    });

    it("returns null when state=completed", () => {
      Object.assign(mockStoreState, { state: "completed" });

      const { container } = render(<ResearchActions {...defaultProps} />);
      expect(container.innerHTML).toBe("");
    });
  });
});
