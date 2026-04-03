/**
 * @vitest-environment jsdom
 * Tests for ReportWorkspace — report rendering, feedback textarea, action buttons.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state — must use vi.hoisted so the mock factory can reference
// it at hoist time.
// ---------------------------------------------------------------------------
const { mockStore, mockUIStore, mockResearchHook } = vi.hoisted(() => {
  const mockStore = {
    result: null as { report: string; learnings: string[]; sources: { url: string }[] } | null,
    state: "reporting" as string,
    reportFeedback: "",
    setReportFeedback: vi.fn(),
    freeze: vi.fn(),
  };

  const mockUIStore = {
    navigate: vi.fn(),
  };

  const mockResearchHook = {
    regenerateReport: vi.fn(),
    abort: vi.fn(),
    clarify: vi.fn(),
    submitFeedbackAndPlan: vi.fn(),
    approvePlanAndResearch: vi.fn(),
    requestMoreResearch: vi.fn(),
    finalizeFindings: vi.fn(),
    generateReport: vi.fn(),
    start: vi.fn(),
    reset: vi.fn(),
    isConnected: false,
    elapsedMs: null,
    isActive: false,
    connectionError: null,
  };

  return { mockStore, mockUIStore, mockResearchHook };
});

// ---------------------------------------------------------------------------
// Mock next-intl
// ---------------------------------------------------------------------------
vi.mock("next-intl", () => {
  const messages: Record<string, string> = {
    feedbackLabel: "FEEDBACK",
    feedbackPlaceholder: "Write comments...",
    regenerate: "Regenerate",
    regenerating: "Regenerating...",
    done: "Done",
    emptyReport: "Report will appear here...",
  };

  function t(key: string): string {
    return messages[key] ?? key;
  }

  return {
    useTranslations: () => t,
  };
});

// ---------------------------------------------------------------------------
// Mock Zustand stores
// ---------------------------------------------------------------------------
vi.mock("@/stores/research-store", () => ({
  useResearchStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// ---------------------------------------------------------------------------
// Mock useResearch hook
// ---------------------------------------------------------------------------
vi.mock("@/hooks/use-research", () => ({
  useResearch: () => mockResearchHook,
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
import { ReportWorkspace } from "@/components/research/ReportWorkspace";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWorkspace() {
  return render(<ReportWorkspace />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReportWorkspace", () => {
  beforeEach(() => {
    cleanup();
    mockStore.result = null;
    mockStore.state = "reporting";
    mockStore.reportFeedback = "";
    mockStore.setReportFeedback.mockClear();
    mockStore.freeze.mockClear();
    mockUIStore.navigate.mockClear();
    mockResearchHook.regenerateReport.mockClear();
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  it("renders empty state when no report content", () => {
    mockStore.result = null;
    renderWorkspace();

    expect(screen.getByText("Report will appear here...")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Report content rendering
  // -------------------------------------------------------------------------
  it("renders MarkdownRenderer with report content", () => {
    mockStore.result = {
      report: "# Test Report\n\nThis is a test.",
      learnings: [],
      sources: [],
    };
    renderWorkspace();

    const renderer = screen.getByTestId("markdown-renderer");
    expect(renderer).toBeInTheDocument();
    expect(renderer.textContent).toContain("Test Report");
  });

  // -------------------------------------------------------------------------
  // Feedback textarea
  // -------------------------------------------------------------------------
  it("feedback textarea updates store on change", () => {
    renderWorkspace();

    const textarea = screen.getByPlaceholderText("Write comments...");
    fireEvent.change(textarea, { target: { value: "Add more detail" } });

    expect(mockStore.setReportFeedback).toHaveBeenCalledWith("Add more detail");
  });

  // -------------------------------------------------------------------------
  // Regenerate button
  // -------------------------------------------------------------------------
  it("Regenerate button calls regenerateReport", () => {
    mockStore.result = { report: "# Report", learnings: [], sources: [] };
    mockStore.state = "completed";
    renderWorkspace();

    const button = screen.getByText("Regenerate");
    fireEvent.click(button);

    expect(mockResearchHook.regenerateReport).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Regenerate disabled during reporting
  // -------------------------------------------------------------------------
  it("Regenerate button disabled during reporting state", () => {
    mockStore.state = "reporting";
    renderWorkspace();

    const button = screen.getByText("Regenerating...").closest("button")!;
    expect(button).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Done button — freeze + navigate
  // -------------------------------------------------------------------------
  it("Done button calls freeze('report') then navigate('report')", () => {
    mockStore.result = { report: "# Report", learnings: [], sources: [] };
    mockStore.state = "completed";
    renderWorkspace();

    const button = screen.getByText("Done");
    fireEvent.click(button);

    expect(mockStore.freeze).toHaveBeenCalledWith("report");
    expect(mockUIStore.navigate).toHaveBeenCalledWith("report");
  });

  // -------------------------------------------------------------------------
  // Done button hidden when no result
  // -------------------------------------------------------------------------
  it("Done button hidden when no result", () => {
    mockStore.result = null;
    renderWorkspace();

    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });
});
