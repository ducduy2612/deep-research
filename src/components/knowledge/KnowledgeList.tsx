"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Trash2,
  FileText,
  Globe,
  Clock,
  Layers,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import type { KnowledgeItem } from "@/engine/knowledge/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------

function TypeBadge({ item }: { item: KnowledgeItem }) {
  if (item.type === "url") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
        <Globe className="h-2.5 w-2.5" />
        URL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-obsidian-primary/20 px-2 py-0.5 text-[10px] font-medium text-obsidian-primary">
      <FileText className="h-2.5 w-2.5" />
      {item.fileType?.split("/").pop()?.toUpperCase() || "FILE"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Knowledge card
// ---------------------------------------------------------------------------

function KnowledgeCard({
  item,
  onDelete,
}: {
  item: KnowledgeItem;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-obsidian-border/50 bg-obsidian-surface-deck p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-obsidian-on-surface">
            {item.title}
          </span>
          <TypeBadge item={item} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-obsidian-on-surface/50">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {relativeTime(item.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-2.5 w-2.5" />
            {item.chunkCount} chunks
          </span>
          {item.type === "file" && item.fileName && (
            <span className="truncate">{item.fileName}</span>
          )}
          {item.type === "url" && item.url && (
            <span className="truncate">{new URL(item.url).hostname}</span>
          )}
        </div>
        {item.content && (
          <p className="mt-1.5 text-xs text-obsidian-on-surface/40 line-clamp-2">
            {truncate(item.content, 200)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
              onClick={() => onDelete(item.id)}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
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
// KnowledgeList component
// ---------------------------------------------------------------------------

export function KnowledgeList() {
  const [search, setSearch] = useState("");
  const items = useKnowledgeStore((s) => s.items);
  const removeItem = useKnowledgeStore((s) => s.remove);
  const searchItems = useKnowledgeStore((s) => s.search);

  const filtered = useMemo(() => {
    return searchItems(search);
  }, [search, searchItems]);

  const handleDelete = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-obsidian-on-surface/40" />
        <Input
          placeholder="Search knowledge base..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 border-obsidian-border/50 bg-obsidian-surface-deck pl-8 text-xs text-obsidian-on-surface placeholder:text-obsidian-on-surface/30"
        />
      </div>

      {/* Item list */}
      <ScrollArea className="max-h-[50vh]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-obsidian-on-surface/40">
            <FileText className="mb-2 h-8 w-8" />
            <p className="text-sm">
              {items.length === 0
                ? "No knowledge items yet. Upload files or crawl URLs to get started."
                : "No items match your search."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pr-1">
            {filtered.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
