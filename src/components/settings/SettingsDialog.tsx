"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/utils/style";
import { useUIStore } from "@/stores/ui-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AIModelsTab } from "@/components/settings/AIModelsTab";
import { SearchTab } from "@/components/settings/SearchTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { AdvancedTab } from "@/components/settings/AdvancedTab";

// ---------------------------------------------------------------------------
// Dialog overlay + panel
// ---------------------------------------------------------------------------

export function SettingsDialog() {
  const t = useTranslations("Settings");
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const open = activeDialog === "settings";

  const TABS = [
    { value: "general", label: t("tabs.general") },
    { value: "ai-models", label: t("tabs.ai") },
    { value: "search", label: t("tabs.search") },
    { value: "advanced", label: t("tabs.advanced") },
  ] as const;

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
            {t("title")}
          </h2>
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
        <Tabs defaultValue="general" className="flex flex-col">
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
            <TabsContent value="general" className="mt-0">
              <GeneralTab />
            </TabsContent>
            <TabsContent value="ai-models" className="mt-0">
              <AIModelsTab />
            </TabsContent>
            <TabsContent value="search" className="mt-0">
              <SearchTab />
            </TabsContent>
            <TabsContent value="advanced" className="mt-0">
              <AdvancedTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
