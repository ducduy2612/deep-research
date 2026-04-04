/**
 * @vitest-environment jsdom
 * Tests for PhaseAccordion — frozen/active rendering and state mapping.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state — must use vi.hoisted so the mock factory can reference
// it at hoist time.
// ---------------------------------------------------------------------------
const { mockState } = vi.hoisted(() => {
  const mockState = {
    state: "idle" as string,
    checkpoints: {} as Record<string, unknown>,
    searchResults: [] as { learning: string; sources: { url: string; title?: string }[] }[],
    result: null as { learnings: string[]; sources: { url: string; title?: string }[] } | null,
    plan: "" as string,
    searchTasks: [] as readonly { query: string; researchGoal: string }[],
  };
  return { mockState };
});

// ---------------------------------------------------------------------------
// Mock next-intl
// ---------------------------------------------------------------------------
vi.mock("next-intl", () => {
  const messages: Record<string, string> = {
    clarifyTitle: "Clarify",
    planTitle: "Plan",
    researchTitle: "Research",
    reportTitle: "Report",
    clarifySummary: "{count} questions answered",
    planSummary: "{count} queries planned",
    researchSummary: "{learnings} learnings · {sources} sources",
    reportSummary: "Report complete",
    frozenBadge: "Frozen",
    activeLabel: "Active",
    pendingLabel: "Pending",
    searchTasksLabel: "Search Queries",
  };

  function t(key: string, params?: Record<string, number>): string {
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
// Mock Zustand store
// ---------------------------------------------------------------------------
vi.mock("@/stores/research-store", () => ({
  useResearchStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

// ---------------------------------------------------------------------------
// Mock MarkdownRenderer
// ---------------------------------------------------------------------------
vi.mock("@/components/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------
import { PhaseAccordion } from "@/components/research/PhaseAccordion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render PhaseAccordion with optional render props. */
function renderAccordion(renderProps?: Parameters<typeof PhaseAccordion>[0]) {
  return render(<PhaseAccordion {...renderProps} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PhaseAccordion", () => {
  beforeEach(() => {
    cleanup();
    mockState.state = "idle";
    mockState.checkpoints = {};
    mockState.searchResults = [];
    mockState.result = null;
    mockState.plan = "";
    mockState.searchTasks = [];
  });

  // -------------------------------------------------------------------------
  // Default state — idle, no checkpoints
  // -------------------------------------------------------------------------
  it("renders all 4 phase headings in idle state with no frozen badges", () => {
    renderAccordion();

    // 4 phase titles rendered
    for (const title of ["Clarify", "Plan", "Research", "Report"]) {
      expect(screen.getAllByText(title).length).toBeGreaterThanOrEqual(1);
    }

    // No frozen badges (summary text)
    expect(screen.queryByText(/questions answered/)).not.toBeInTheDocument();
    expect(screen.queryByText(/queries planned/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Report complete/)).not.toBeInTheDocument();

    // All should have "Pending" labels
    expect(screen.getAllByText("Pending")).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // Clarify phase active
  // -------------------------------------------------------------------------
  it("shows clarify as active with Active label when state=awaiting_feedback", () => {
    mockState.state = "awaiting_feedback";
    renderAccordion({
      onRenderClarify: () => <div data-testid="clarify-panel">ClarifyPanel</div>,
    });

    // Active label appears (for clarify)
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    // Pending labels for the other 3
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(3);

    // ClarifyPanel rendered in active workspace
    expect(screen.getByTestId("clarify-panel")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Clarify frozen + Plan active
  // -------------------------------------------------------------------------
  it("shows frozen badge on clarify and expands plan when clarify checkpoint exists and state=awaiting_plan_review", () => {
    mockState.state = "awaiting_plan_review";
    mockState.checkpoints = {
      clarify: {
        frozenAt: Date.now(),
        questions: "1. What aspects?\n2. Any constraints?\n3. Budget?",
      },
    };

    renderAccordion({
      onRenderPlan: () => <div data-testid="plan-panel">PlanPanel</div>,
    });

    // Clarify frozen badge: 3 questions
    expect(screen.getByText("3 questions answered")).toBeInTheDocument();
    // Plan is active
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    // PlanPanel rendered
    expect(screen.getByTestId("plan-panel")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Frozen clarify content — read-only MarkdownRenderer
  // -------------------------------------------------------------------------
  it("renders frozen clarify content as read-only via MarkdownRenderer when expanded", () => {
    const questions = "1. What aspects?\n2. Any constraints?";

    // Set state so clarify is both frozen AND active (awaiting_feedback with checkpoint)
    // This way the frozen content renders without needing accordion expansion
    mockState.state = "awaiting_feedback";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions },
    };

    renderAccordion({
      onRenderClarify: () => <div data-testid="clarify-panel">ClarifyPanel</div>,
    });

    // When frozen AND active, the active content takes priority in PhaseAccordion.
    // To test frozen read-only rendering, set state to a later phase so clarify is
    // frozen-but-not-active, and the accordion defaultValue will expand the active phase.
    // Re-render with a different state:
    cleanup();
    mockState.state = "awaiting_plan_review";

    renderAccordion({
      onRenderPlan: () => <div>Plan workspace</div>,
    });

    // Now clarify is frozen (not active), and plan is active (expanded by default).
    // The clarify content is collapsed. Click its trigger to expand.
    const clarifyButtons = screen.getAllByText("Clarify");
    // Find the button that contains "Clarify" text (accordion trigger)
    const clarifyButton = clarifyButtons.find(
      (el) => el.closest("button") !== null,
    );
    if (clarifyButton) {
      fireEvent.click(clarifyButton.closest("button")!);
    }

    // MarkdownRenderer should show the frozen questions content
    const mdRenderers = screen.getAllByTestId("markdown-renderer");
    const clarifyRenderer = mdRenderers.find((el) =>
      el.textContent?.includes("What aspects"),
    );
    expect(clarifyRenderer).toBeTruthy();
    // DOM normalizes \n to space — check key substrings
    expect(clarifyRenderer!.textContent).toContain("What aspects");
    expect(clarifyRenderer!.textContent).toContain("Any constraints");
  });

  // -------------------------------------------------------------------------
  // Plan frozen + Research active
  // -------------------------------------------------------------------------
  it("shows frozen badges on clarify and plan when both checkpoints exist and state=searching", () => {
    mockState.state = "searching";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "1. What?" },
      plan: {
        frozenAt: Date.now(),
        plan: "# Plan",
        searchTasks: [
          { query: "quantum computing", researchGoal: "overview" },
          { query: "AI safety", researchGoal: "alignment" },
        ],
      },
    };

    renderAccordion({
      onRenderStreaming: () => <div data-testid="streaming">Streaming...</div>,
    });

    // Clarify frozen badge
    expect(screen.getByText("1 questions answered")).toBeInTheDocument();
    // Plan frozen badge
    expect(screen.getByText("2 queries planned")).toBeInTheDocument();
    // Research is active
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    // Streaming content rendered
    expect(screen.getByTestId("streaming")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // All phases frozen (completed)
  // -------------------------------------------------------------------------
  it("shows frozen badges on all phases when state=completed with all checkpoints", () => {
    mockState.state = "completed";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "1. Q?" },
      plan: {
        frozenAt: Date.now(),
        plan: "# Plan",
        searchTasks: [{ query: "test", researchGoal: "goal" }],
      },
      research: {
        frozenAt: Date.now(),
        searchResults: [
          {
            query: "test",
            researchGoal: "goal",
            learning: "learned something",
            sources: [{ url: "https://example.com" }],
            images: [],
          },
        ],
        result: null,
      },
      report: {
        frozenAt: Date.now(),
        result: {
          title: "Test Report",
          report: "# Final Report",
          learnings: ["l1"],
          sources: [{ url: "https://example.com" }],
          images: [],
        },
      },
    };

    renderAccordion({
      onRenderStreaming: () => <div>Streaming</div>,
      onRenderReport: () => <div data-testid="report-view">ReportView</div>,
    });

    // Frozen badges for the frozen-but-not-active phases (clarify, plan, research)
    expect(screen.getAllByText("1 questions answered").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1 queries planned").length).toBeGreaterThanOrEqual(1);
    // Research summary uses live store data: 1 learning from searchResults, 1 source
    expect(screen.getAllByText(/learnings/).length).toBeGreaterThanOrEqual(1);
    // Report is both frozen AND active (completed is in report's activeStates),
    // so it shows the Active label rather than the frozen "Report complete" badge
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    // Report workspace renders
    expect(screen.getByTestId("report-view")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Summary badge text — research phase uses live store data
  // -------------------------------------------------------------------------
  it("computes research summary from live searchResults when research is frozen", () => {
    mockState.state = "reporting";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "Q?" },
      plan: {
        frozenAt: Date.now(),
        plan: "P",
        searchTasks: [],
      },
      research: {
        frozenAt: Date.now(),
        searchResults: [],
        result: null,
      },
    };
    mockState.searchResults = [
      { learning: "l1", sources: [{ url: "https://a.com" }, { url: "https://b.com" }] },
      { learning: "l2", sources: [{ url: "https://c.com" }] },
      { learning: "", sources: [] },
    ];

    renderAccordion({
      onRenderStreaming: () => <div>Streaming</div>,
    });

    // 2 learnings (non-empty), 3 sources
    expect(screen.getByText("2 learnings · 3 sources")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Checkpoint with partial data still renders
  // -------------------------------------------------------------------------
  it("handles checkpoint with empty questions gracefully", () => {
    mockState.state = "awaiting_plan_review";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "" },
    };

    renderAccordion({
      onRenderPlan: () => <div>Plan</div>,
    });

    // Empty questions = 0 count (empty lines filtered out)
    expect(screen.getByText("0 questions answered")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Plan done but not frozen yet (between approve and search-task arrival)
  // -------------------------------------------------------------------------
  it("shows plan as done with plan text visible when research is active but plan checkpoint not yet set", () => {
    mockState.state = "searching";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "1. What?" },
      // plan checkpoint NOT set yet — research started but search-tasks not received
    };
    mockState.plan = "# My Research Plan\n\nWe will study quantum computing.";

    renderAccordion({
      onRenderStreaming: () => <div data-testid="streaming">Streaming...</div>,
    });

    // Plan should show as done (checkmark) not pending
    // No summary badge for plan since it's not frozen and has no search tasks yet
    expect(screen.queryByText(/queries planned/)).not.toBeInTheDocument();
    // Research is active
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    // Streaming content rendered
    expect(screen.getByTestId("streaming")).toBeInTheDocument();
    // Plan accordion should be expanded alongside research (defaultValue includes "plan")
    // Plan text should be visible
    const mdRenderers = screen.getAllByTestId("markdown-renderer");
    const planRenderer = mdRenderers.find((el) =>
      el.textContent?.includes("My Research Plan"),
    );
    expect(planRenderer).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Plan checkpoint with searchTasks (auto-frozen when search-tasks arrive)
  // -------------------------------------------------------------------------
  it("shows correct query count when plan is auto-frozen with searchTasks", () => {
    mockState.state = "searching";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "Q?" },
      plan: {
        frozenAt: Date.now(),
        plan: "Plan text",
        searchTasks: [
          { query: "quantum computing", researchGoal: "overview" },
          { query: "AI safety", researchGoal: "alignment" },
        ],
      },
    };

    renderAccordion({
      onRenderStreaming: () => <div>Streaming</div>,
    });

    expect(screen.getByText("2 queries planned")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Plan shows search tasks before freeze
  // -------------------------------------------------------------------------
  it("shows search tasks in plan panel when done but not frozen and tasks exist", () => {
    mockState.state = "searching";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "Q?" },
      // plan not frozen yet
    };
    mockState.plan = "# Research Plan";
    mockState.searchTasks = [
      { query: "quantum computing basics", researchGoal: "understand fundamentals" },
      { query: "AI alignment", researchGoal: "safety approaches" },
    ];

    renderAccordion({
      onRenderStreaming: () => <div data-testid="streaming">Streaming...</div>,
    });

    // Summary badge shows live search task count
    expect(screen.getByText("2 queries planned")).toBeInTheDocument();
    // Search tasks should be rendered
    expect(screen.getByText("quantum computing basics")).toBeInTheDocument();
    expect(screen.getByText("AI alignment")).toBeInTheDocument();
    expect(screen.getByText("understand fundamentals")).toBeInTheDocument();
    expect(screen.getByText("safety approaches")).toBeInTheDocument();
    // Search Queries label
    expect(screen.getByText("Search Queries")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Frozen plan content includes search tasks
  // -------------------------------------------------------------------------
  it("includes search tasks in frozen plan content", () => {
    mockState.state = "reporting";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "Q?" },
      plan: {
        frozenAt: Date.now(),
        plan: "# Plan text",
        searchTasks: [
          { query: "quantum computing", researchGoal: "overview" },
        ],
      },
      research: {
        frozenAt: Date.now(),
        searchResults: [],
        result: null,
      },
    };

    renderAccordion({
      onRenderStreaming: () => <div>Streaming</div>,
    });

    // Plan is frozen and collapsed — click to expand it
    const planButtons = screen.getAllByText("Plan");
    const planButton = planButtons.find(
      (el) => el.closest("button") !== null,
    );
    if (planButton) {
      fireEvent.click(planButton.closest("button")!);
    }

    // Frozen plan should show both plan text and search tasks via MarkdownRenderer
    const mdRenderers = screen.getAllByTestId("markdown-renderer");
    const planRenderer = mdRenderers.find((el) =>
      el.textContent?.includes("Plan text") && el.textContent?.includes("quantum computing"),
    );
    expect(planRenderer).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Plan checkpoint with no searchTasks (edge case)
  // -------------------------------------------------------------------------
  it("handles plan checkpoint with empty searchTasks", () => {
    mockState.state = "reporting";
    mockState.checkpoints = {
      clarify: { frozenAt: Date.now(), questions: "Q?" },
      plan: {
        frozenAt: Date.now(),
        plan: "Plan text",
        searchTasks: [],
      },
      research: {
        frozenAt: Date.now(),
        searchResults: [],
        result: null,
      },
    };

    renderAccordion({
      onRenderStreaming: () => <div>Streaming</div>,
    });

    expect(screen.getAllByText("0 queries planned").length).toBeGreaterThanOrEqual(1);
  });
});
