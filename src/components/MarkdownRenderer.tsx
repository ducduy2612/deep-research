"use client";

import { useMemo } from "react";
import { marked } from "marked";

import { cn } from "@/utils/style";

// ---------------------------------------------------------------------------
// Configure marked
// ---------------------------------------------------------------------------

marked.setOptions({
  gfm: true,
  breaks: false,
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarkdownRendererProps {
  /** Raw markdown content to render. */
  content: string;
  /** Additional class names for the wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const result = marked.parse(content);
    // marked.parse can return string | Promise<string> depending on async flag
    if (typeof result === "string") return result;
    return "";
  }, [content]);

  return (
    <div
      className={cn(
        // Obsidian Deep prose styling
        "prose prose-invert max-w-none",
        // Headings
        "prose-headings:font-sans prose-headings:tracking-tight prose-headings:text-obsidian-on-surface",
        "prose-h1:text-3xl prose-h1:font-bold",
        "prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-6",
        "prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-4",
        // Paragraphs
        "prose-p:text-obsidian-on-surface-variant prose-p:leading-relaxed prose-p:text-base",
        // Links
        "prose-a:text-obsidian-primary prose-a:no-underline hover:prose-a:underline",
        // Strong / emphasis
        "prose-strong:text-obsidian-on-surface prose-strong:font-semibold",
        // Lists
        "prose-ul:text-obsidian-on-surface-variant prose-ol:text-obsidian-on-surface-variant",
        "prose-li:marker:text-obsidian-outline",
        // Code
        "prose-code:text-obsidian-primary prose-code:bg-obsidian-surface-raised prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-obsidian-surface-well prose-pre:border-0 prose-pre:rounded-lg",
        // Blockquotes — AI pulse accent via border-l
        "prose-blockquote:border-l-4 prose-blockquote:border-obsidian-primary prose-blockquote:bg-obsidian-surface-raised/40 prose-blockquote:backdrop-blur-xl prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic",
        // Tables
        "prose-table:border-0",
        "prose-th:bg-obsidian-surface-raised prose-th:text-obsidian-on-surface prose-th:text-xs prose-th:uppercase prose-th:tracking-widest",
        "prose-td:text-obsidian-on-surface-variant",
        "prose-tr:border-obsidian-outline-ghost",
        // Horizontal rules — tonal shift, no harsh lines
        "prose-hr:border-obsidian-outline-ghost",
        // Superscript (citation numbers)
        "prose-sup:text-obsidian-primary prose-sup:font-bold prose-sup:text-xs",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
