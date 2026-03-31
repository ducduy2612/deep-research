"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Trash2,
  FileText,
  Search,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useHistoryStore, selectSessionsByFilter } from "@/stores/history-store";
import { useResearchStore } from "@/stores/research-store";
import type { HistorySession } from "@/stores/history-store";

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

type FilterType = "all" | "completed" | "failed";

const FILTER_VALUES: FilterType[] = ["all", "completed", "failed"];

// ---------------------------------------------------------------------------
// Relative time (uses translations)
// ---------------------------------------------------------------------------

function useRelativeTime() {
  const t = useTranslations("KnowledgeList");
  return (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("daysAgo", { count: days });
    return new Date(ts).toLocaleDateString();
  };
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ state }: { state: HistorySession["state"] }) {
  const styles = {
    completed: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
    aborted: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[state]}`}
    >
      {state}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

function StatsRow({ sessions }: { sessions: readonly HistorySession[] }) {
  const t = useTranslations("History");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sessions.filter((s) => (s.startedAt ?? 0) > weekAgo).length;
  const totalSources = sessions.reduce(
    (acc, s) => acc + s.sources.length,
    0,
  );
  return (
    <div className="flex gap-4 text-sm text-obsidian-on-surface/60">
      <span className="flex items-center gap-1">
        <BarChart3 className="h-3.5 w-3.5" />
        {t("sessionsCount", { count: sessions.length })}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {t("thisWeek", { count: thisWeek })}
      </span>
      <span className="flex items-center gap-1">
        <FileText className="h-3.5 w-3.5" />
        {t("sourcesCount", { count: totalSources })}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

function SessionCard({
  session,
  onDelete,
  onViewReport,
}: {
  session: HistorySession;
  onDelete: (id: string) => void;
  onViewReport: (session: HistorySession) => void;
}) {
  const t = useTranslations("History");
  const relativeTime = useRelativeTime();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-obsidian-outline-ghost/30 bg-obsidian-surface-sheet p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-obsidian-on-surface">
            {session.title}
          </span>
          <StatusBadge state={session.state} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-obsidian-on-surface/50">
          <span>{relativeTime(session.startedAt)}</span>
          <span>{session.sources.length} sources</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-obsidian-on-surface/60 hover:text-obsidian-primary"
          onClick={() => onViewReport(session)}
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          {t("view")}
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
              onClick={() => onDelete(session.id)}
            >
              {t("confirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setConfirmDelete(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-obsidian-on-surface/40 hover:text-red-400"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryDialog
// ---------------------------------------------------------------------------

export function HistoryDialog() {
  const t = useTranslations("History");
  const activeDialog = useUIStore((s) => s.activeDialog);
  const closeDialog = useUIStore((s) => s.closeDialog);
  const sessions = useHistoryStore((s) => s.sessions);
  const loaded = useHistoryStore((s) => s.loaded);
  const removeSession = useHistoryStore((s) => s.remove);

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const byFilter = selectSessionsByFilter(filter)({ sessions, loaded });
    if (!search.trim()) return byFilter;
    const q = search.toLowerCase();
    return byFilter.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q),
    );
  }, [sessions, filter, search, loaded]);

  const handleDelete = (id: string) => {
    removeSession(id);
  };

  const handleViewReport = (session: HistorySession) => {
    // Load session data into research store and navigate to report view
    useResearchStore.setState({
      topic: session.topic,
      state: session.state === "completed" ? "completed" : session.state,
      result: {
        title: session.title,
        report: session.report,
        learnings: [...session.learnings],
        sources: [...session.sources],
        images: [...session.images],
      },
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    });
    useUIStore.getState().navigate("report");
    closeDialog();
  };

  return (
    <Dialog
      open={activeDialog === "history"}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent className="max-h-[80vh] max-w-2xl border-obsidian-outline-ghost/20 bg-obsidian-surface-sheet backdrop-blur-xl sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-obsidian-on-surface">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
          <StatsRow sessions={sessions} />
        </DialogHeader>

        {/* Filters + Search */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {FILTER_VALUES.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-obsidian-primary/20 text-obsidian-primary"
                    : "text-obsidian-on-surface/50 hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface/70"
                }`}
              >
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-obsidian-on-surface/40" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-obsidian-outline-ghost/30 bg-obsidian-surface-deck pl-8 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface/30"
            />
          </div>
        </div>

        {/* Session list */}
        <ScrollArea className="max-h-[50vh]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-obsidian-on-surface/40">
              <FileText className="mb-2 h-8 w-8" />
              <p className="text-sm">
                {sessions.length === 0
                  ? t("emptyNoSessions")
                  : t("emptyNoMatch")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pr-1">
              {filtered.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onDelete={handleDelete}
                  onViewReport={handleViewReport}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
