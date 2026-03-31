"use client";

import { cn } from "@/utils/style";
import { useResearchStore } from "@/stores/research-store";
import type { ActivityLevel } from "@/stores/research-store";

interface ActiveResearchRightProps {
  className?: string;
}

export function ActiveResearchRight({ className }: ActiveResearchRightProps) {
  const activityLog = useResearchStore((s) => s.activityLog);
  const searchResults = useResearchStore((s) => s.searchResults);
  const steps = useResearchStore((s) => s.steps);

  const planLength = steps.plan.text.length;
  const totalResults = searchResults.length;
  const efficiency = totalResults > 0
    ? Math.min(99, Math.round((totalResults * 15 / Math.max(planLength / 100, 1)) + 60))
    : 0;

  return (
    <aside
      className={cn(
        "flex h-full w-[300px] flex-col overflow-hidden px-6 py-6",
        "bg-obsidian-surface-sheet",
        className,
      )}
    >
      <h3 className="mb-6 font-sans text-xs font-bold uppercase tracking-[0.2em] text-obsidian-on-surface-var">
        Activity Log
      </h3>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        {activityLog.map((entry) => (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  getActivityDotColor(entry.level),
                )}
              />
              <div className="mt-2 h-full w-px bg-obsidian-outline-ghost/30" />
            </div>
            <div className="pb-2">
              <span className="mb-1 block font-mono text-[9px] text-obsidian-on-surface-var/50">
                {formatTimestamp(entry.timestamp)}
              </span>
              <p
                className={cn(
                  "font-mono text-[11px]",
                  entry.level === "success" && "text-obsidian-primary-deep",
                  entry.level === "warn" && "text-obsidian-on-surface-var/60 italic",
                  entry.level === "error" && "text-obsidian-error",
                  entry.level === "info" && "text-obsidian-on-surface-var",
                )}
              >
                {entry.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom stat */}
      <div className="mt-auto border-t border-obsidian-outline-ghost/10 pt-6">
        <div className="rounded-lg bg-obsidian-surface-well p-4">
          <div className="mb-2 flex items-end justify-between">
            <span className="font-mono text-[10px] uppercase text-obsidian-on-surface-var">
              Token Efficiency
            </span>
            <span className="font-mono text-xs text-obsidian-primary-deep">
              {efficiency}%
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-obsidian-surface-bright">
            <div
              className="h-full bg-obsidian-primary-deep"
              style={{ width: `${efficiency}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

function getActivityDotColor(level: ActivityLevel): string {
  switch (level) {
    case "success":
      return "bg-obsidian-primary-deep";
    case "error":
      return "bg-obsidian-error";
    case "warn":
      return "bg-obsidian-surface-bright";
    case "info":
      return "bg-obsidian-primary-deep/40";
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const sec = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
