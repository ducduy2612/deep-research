"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { Copy, CopyCheck, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import copy from "copy-to-clipboard";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz", 8);

interface MermaidBlockProps {
  children: ReactNode;
}

export function MermaidBlock({ children }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const text = el.innerText ?? "";
    setRawText(text);

    let cancelled = false;

    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, theme: "dark" });
        const canParse = await mermaid.parse(text, { suppressErrors: true });
        if (!canParse || cancelled) return;
        const { svg } = await mermaid.render(nanoid(), text);
        if (!cancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [children]);

  const handleCopy = () => {
    copy(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg border border-obsidian-border/30">
      {/* Toolbar */}
      <div className="flex h-9 items-center justify-between bg-obsidian-surface-well px-3">
        <span className="text-xs font-medium text-obsidian-on-surface-variant/60">
          Mermaid
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!svgContent}
            className="rounded p-1 text-obsidian-on-surface-variant/60 transition-colors hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface disabled:opacity-30"
            aria-label="Download SVG"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 text-obsidian-on-surface-variant/60 transition-colors hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface"
            aria-label="Copy source"
          >
            {copied ? (
              <CopyCheck className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.3, 3))}
            className="rounded p-1 text-obsidian-on-surface-variant/60 transition-colors hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.3, 0.5))}
            className="rounded p-1 text-obsidian-on-surface-variant/60 transition-colors hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded p-1 text-obsidian-on-surface-variant/60 transition-colors hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Diagram area */}
      <div className="overflow-auto bg-obsidian-surface-well p-4">
        {error ? (
          <div className="text-sm text-red-400">
            <p className="font-medium">Mermaid parse error</p>
            <pre className="mt-1 whitespace-pre-wrap text-xs opacity-70">{error}</pre>
          </div>
        ) : svgContent ? (
          <div
            className="mx-auto origin-top-left transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          /* Hidden container for raw text extraction */
          <div ref={containerRef} className="hidden">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
