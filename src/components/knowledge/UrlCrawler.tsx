"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useSettingsStore } from "@/stores/settings-store";
import { createAuthHeaders } from "@/lib/client-signature";
import type { KnowledgeItem } from "@/engine/knowledge/types";

// ---------------------------------------------------------------------------
// Crawler type
// ---------------------------------------------------------------------------

type CrawlerType = "jina" | "local";

// ---------------------------------------------------------------------------
// UrlCrawler component
// ---------------------------------------------------------------------------

export function UrlCrawler() {
  const t = useTranslations("UrlCrawler");
  const [url, setUrl] = useState("");
  const [crawler, setCrawler] = useState<CrawlerType>("jina");
  const [crawling, setCrawling] = useState(false);
  const addItem = useKnowledgeStore((s) => s.add);

  // ---------------------------------------------------------------------------
  // URL validation
  // ---------------------------------------------------------------------------

  const isValidUrl = useCallback((value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = url.trim();
      if (!trimmed) {
        toast.error(t("enterUrl"));
        return;
      }

      if (!isValidUrl(trimmed)) {
        toast.error(t("invalidUrl"));
        return;
      }

      setCrawling(true);

      try {
        const { proxyMode, accessPassword } = useSettingsStore.getState();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(proxyMode ? createAuthHeaders(accessPassword) : {}),
        };

        const res = await fetch("/api/knowledge/crawl", {
          method: "POST",
          headers,
          body: JSON.stringify({ url: trimmed, crawler }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Crawl failed (${res.status})`);
        }

        const item: KnowledgeItem = {
          id: nanoid(),
          title: data.title,
          content: data.content,
          type: "url",
          url: data.url,
          chunkCount: data.chunkCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        addItem(item);
        toast.success(`"${data.title}" added to knowledge base (${data.chunkCount} chunks)`);
        setUrl("");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to crawl URL: ${message}`);
      } finally {
        setCrawling(false);
      }
    },
    [url, crawler, isValidUrl, addItem, t],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-obsidian-on-surface/40" />
          <Input
            placeholder={t("urlPlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={crawling}
            className="h-9 border-obsidian-border/50 bg-obsidian-surface-deck pl-8 text-sm text-obsidian-on-surface placeholder:text-obsidian-on-surface/30"
          />
        </div>
      </div>

      {/* Crawler selector + submit */}
      <div className="flex items-center gap-2">
        <Select
          value={crawler}
          onValueChange={(v) => setCrawler(v as CrawlerType)}
        >
          <SelectTrigger className="h-9 w-[160px] border-obsidian-border/50 bg-obsidian-surface-deck text-sm text-obsidian-on-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-obsidian-border/50 bg-obsidian-surface-sheet">
            <SelectItem value="jina" className="text-sm text-obsidian-on-surface">
              {t("jina")}
            </SelectItem>
            <SelectItem value="local" className="text-sm text-obsidian-on-surface">
              {t("localCrawler")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="submit"
          disabled={crawling || !url.trim()}
          className="h-9 bg-obsidian-primary px-4 text-sm text-white hover:bg-obsidian-primary/90 disabled:opacity-50"
        >
          {crawling ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              {t("crawling")}
            </>
          ) : (
            t("crawl")
          )}
        </Button>
      </div>

      <p className="text-xs text-obsidian-on-surface/30">
        {t("jinaDesc")}
      </p>
    </form>
  );
}
