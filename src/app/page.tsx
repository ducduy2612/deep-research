"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { TopicInput } from "@/components/research/TopicInput";
import { ReportConfig } from "@/components/research/ReportConfig";
import { ActiveResearch } from "@/components/research/ActiveResearch";
import { FinalReport } from "@/components/research/FinalReport";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { HistoryDialog } from "@/components/settings/HistoryDialog";
import { KnowledgeDialog } from "@/components/knowledge/KnowledgeDialog";
import { useResearch } from "@/hooks/use-research";
import { useUIStore } from "@/stores/ui-store";
import { useResearchStore } from "@/stores/research-store";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const activeView = useUIStore((s) => s.activeView);
  const navigate = useUIStore((s) => s.navigate);
  const result = useResearchStore((s) => s.result);
  const state = useResearchStore((s) => s.state);

  const {
    connectionError,
    clarify,
    submitFeedbackAndPlan,
    approvePlanAndResearch,
    requestMoreResearch,
    generateReport,
  } = useResearch();

  // Show error toast when connection errors occur
  useEffect(() => {
    if (connectionError) {
      toast.error("Research Error", {
        description: connectionError,
        duration: 8000,
      });
    }
  }, [connectionError]);

  // Auto-navigate to report when research completes with a result
  useEffect(() => {
    if (
      (state === "completed" || state === "failed" || state === "aborted") &&
      result &&
      activeView === "active"
    ) {
      navigate("report");
    }
  }, [state, result, activeView, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-obsidian-surface-well">
      <Header />

      {/* Main content area */}
      <main className="flex flex-1 flex-col">
        {activeView === "hub" && (
          <HubView onStart={clarify} />
        )}

        {activeView === "active" && (
          <ActiveResearch
            className="flex-1"
            onSubmitFeedbackAndPlan={submitFeedbackAndPlan}
            onApprovePlanAndResearch={approvePlanAndResearch}
            onRequestMoreResearch={requestMoreResearch}
            onGenerateReport={generateReport}
          />
        )}

        {activeView === "report" && (
          <FinalReport className="flex-1" />
        )}
      </main>

      {/* Global dialogs */}
      <SettingsDialog />
      <HistoryDialog />
      <KnowledgeDialog />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hub view — Topic input + report configuration
// ---------------------------------------------------------------------------

function HubView({ onStart }: { onStart: (options: import("@/hooks/use-research").StartOptions) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <TopicInput onStart={onStart} />
      <ReportConfig className="w-full max-w-2xl rounded-xl bg-[rgba(32,31,34,0.6)] p-6 backdrop-blur-[20px]" />
    </div>
  );
}
