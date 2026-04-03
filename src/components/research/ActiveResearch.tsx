"use client";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { WorkflowProgress } from "./WorkflowProgress";
import { ActiveResearchLeft } from "./ActiveResearchLeft";
import { ActiveResearchCenter } from "./ActiveResearchCenter";
import { ActiveResearchRight } from "./ActiveResearchRight";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActiveResearchProps {
  className?: string;
  onSubmitFeedbackAndPlan: () => void;
  onApprovePlanAndResearch: () => void;
  onRequestMoreResearch: () => void;
  onFinalizeFindings: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActiveResearch({
  className,
  onSubmitFeedbackAndPlan,
  onApprovePlanAndResearch,
  onRequestMoreResearch,
  onFinalizeFindings,
}: ActiveResearchProps) {
  const state = useResearchStore((s) => s.state);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <WorkflowProgress state={state} />
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1"
        defaultLayout={{ left: 22, center: 50, right: 28 }}
      >
        <ResizablePanel id="left" minSize="15%" maxSize="35%">
          <ActiveResearchLeft />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="center" minSize="30%">
          <ActiveResearchCenter
            onSubmitFeedbackAndPlan={onSubmitFeedbackAndPlan}
            onApprovePlanAndResearch={onApprovePlanAndResearch}
            onRequestMoreResearch={onRequestMoreResearch}
            onFinalizeFindings={onFinalizeFindings}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="right" minSize="18%" maxSize="40%">
          <ActiveResearchRight />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
