"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  History,
  BookOpen,
  Database,
  Github,
  Sparkles,
} from "lucide-react";

import { cn } from "@/utils/style";
import { useResearchStore, selectIsActive } from "@/stores/research-store";
import { useUIStore } from "@/stores/ui-store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HeaderProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Live elapsed-time ticker for active research.
 * Reads startedAt/completedAt from the store once, then ticks locally
 * to avoid calling Date.now() inside a Zustand selector (which causes
 * useSyncExternalStore infinite loops).
 */
function useElapsedMs(): number | null {
  const startedAt = useResearchStore((s) => s.startedAt);
  const completedAt = useResearchStore((s) => s.completedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || completedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, completedAt]);

  if (!startedAt) return null;
  return (completedAt ?? now) - startedAt;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Header({ className }: HeaderProps) {
  const t = useTranslations("Header");
  const isActive = useResearchStore(selectIsActive);
  const topic = useResearchStore((s) => s.topic);
  const elapsedMs = useElapsedMs();
  const navigate = useUIStore((s) => s.navigate);
  const openDialog = useUIStore((s) => s.openDialog);
  const activeView = useUIStore((s) => s.activeView);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "bg-obsidian-surface-deck/60 backdrop-blur-xl",
        "flex items-center justify-between px-6 py-3",
        className,
      )}
    >
      {/* Left: Logo + Focus indicator */}
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => {
            if (isActive && activeView !== "hub") {
              navigate("active");
            } else {
              navigate("hub");
            }
          }}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-obsidian-on-surface"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
          {t("appName")}
        </button>

        {/* Active research focus indicator */}
        {isActive && topic && (
          <div className="hidden lg:flex items-center gap-4 rounded-full bg-obsidian-surface-well px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-obsidian-primary-deep opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-obsidian-primary-deep" />
            </span>
            <span className="max-w-[400px] truncate font-mono text-xs text-obsidian-on-surface-var">
              {topic}
            </span>
            {elapsedMs != null && (
              <span className="font-mono text-xs tabular-nums text-obsidian-primary-deep">
                {formatElapsed(elapsedMs)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Nav actions */}
      <div className="flex items-center gap-1">
        <NavButton
          icon={<Sparkles className="h-[18px] w-[18px]" />}
          label={isActive ? t("research") : t("hub")}
          active={isActive ? activeView === "active" : activeView === "hub"}
          onClick={() => navigate(isActive ? "active" : "hub")}
        />
        <NavButton
          icon={<BookOpen className="h-[18px] w-[18px]" />}
          label={t("report")}
          active={activeView === "report"}
          onClick={() => navigate("report")}
        />
        <NavButton
          icon={<Database className="h-[18px] w-[18px]" />}
          label={t("knowledge")}
          onClick={() => openDialog("knowledge")}
        />
        <NavButton
          icon={<History className="h-[18px] w-[18px]" />}
          label={t("history")}
          onClick={() => openDialog("history")}
        />
        <NavButton
          icon={<Settings className="h-[18px] w-[18px]" />}
          label={t("settings")}
          onClick={() => openDialog("settings")}
        />
        <NavButton
          icon={<Github className="h-[18px] w-[18px]" />}
          label={t("github")}
          onClick={() => window.open("https://github.com", "_blank", "noopener")}
        />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Nav button (internal)
// ---------------------------------------------------------------------------

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors",
        active
          ? "bg-obsidian-surface-raised text-obsidian-on-surface"
          : "text-obsidian-on-surface-var/60 hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface",
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
