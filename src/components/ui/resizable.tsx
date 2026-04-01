"use client"

import { GripVertical } from "lucide-react"
import {
  Group as ResizableGroup,
  Panel as ResizablePanel,
  Separator as ResizableSeparator,
} from "react-resizable-panels"

import { cn } from "@/utils/style"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizableGroup>) => (
  <ResizableGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizableSeparator> & {
  withHandle?: boolean
}) => (
  <ResizableSeparator
    className={cn(
      "relative flex w-[3px] items-center justify-center bg-obsidian-outline-ghost/40 transition-colors hover:bg-obsidian-primary-deep/60 after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-4 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-8 w-[14px] items-center justify-center rounded-md border border-obsidian-outline-ghost/50 bg-obsidian-surface-sheet shadow-sm transition-colors hover:border-obsidian-primary-deep/50 hover:bg-obsidian-surface-raised">
        <GripVertical className="h-3 w-3 text-obsidian-on-surface-var/60" />
      </div>
    )}
  </ResizableSeparator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
