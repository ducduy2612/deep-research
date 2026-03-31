"use client";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import { WorkflowProgress } from "./WorkflowProgress";
import { ActiveResearchCenter } from "./ActiveResearchCenter";
import { ActiveResearchRight } from "./ActiveResearchRight";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

import type { Direction } from "react-resizable-panels";

interface ActiveResearchProps {
  className?: string;
}

export function ActiveResearch({ className }: ActiveResearchProps) {
  const state = useResearchStore((s) => s.state);
  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <WorkflowProgress state={state} />
      <ResizablePanelGroup direction={direction} className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ActiveResearchCenter />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <ActiveResearchRight />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
