"use client";

import { cn } from "@/utils/style";
import { useUIStore } from "@/stores/ui-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileUpload } from "@/components/knowledge/FileUpload";
import { UrlCrawler } from "@/components/knowledge/UrlCrawler";
import { KnowledgeList } from "@/components/knowledge/KnowledgeList";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { value: "files", label: "Files" },
  { value: "urls", label: "URLs" },
  { value: "library", label: "Library" },
] as const;

// ---------------------------------------------------------------------------
// KnowledgeDialog
// ---------------------------------------------------------------------------

export function KnowledgeDialog() {
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const open = activeDialog === "knowledge";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={closeDialog}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden",
          "rounded-xl border border-obsidian-surface-raised",
          "bg-[rgba(32,31,34,0.6)] backdrop-blur-xl",
          "shadow-2xl",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-obsidian-surface-raised px-5 py-3">
          <h2 className="text-sm font-semibold text-obsidian-on-surface">
            Knowledge Base
          </h2>
          <p className="sr-only">
            Upload files, crawl URLs, and manage your knowledge base.
          </p>
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-md p-1 text-obsidian-on-surface-var hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="files" className="flex flex-col">
          <div className="border-b border-obsidian-surface-raised px-5">
            <TabsList className="h-9 bg-transparent p-0 gap-1">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-md px-3 py-1.5 text-[11px] font-medium text-obsidian-on-surface-var data-[state=active]:bg-obsidian-surface-raised data-[state=active]:text-obsidian-on-surface data-[state=active]:shadow-none"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(85vh - 100px)" }}>
            <TabsContent value="files" className="mt-0">
              <FileUpload />
            </TabsContent>
            <TabsContent value="urls" className="mt-0">
              <UrlCrawler />
            </TabsContent>
            <TabsContent value="library" className="mt-0">
              <KnowledgeList />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
