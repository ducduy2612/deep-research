"use client";

import { useMemo, useState, useEffect, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { X } from "lucide-react";
import { cn } from "@/utils/style";

import { CodeBlock } from "./CodeBlock";
import { MermaidBlock } from "./MermaidBlock";

import "katex/dist/katex.min.css";
import "./markdown.css";

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
// Audio / video extension detection
// ---------------------------------------------------------------------------

const AUDIO_EXTS = /\.(aac|mp3|opus|wav)(\?.*)?$/i;
const VIDEO_EXTS = /\.(3gp|3g2|webm|ogv|mpeg|mp4|avi)(\?.*)?$/i;

// ---------------------------------------------------------------------------
// Image lightbox
// ---------------------------------------------------------------------------

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Image lightbox"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // Memoize plugin arrays to avoid re-creating on every render
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath, remarkBreaks], []);
  const rehypePlugins = useMemo(
    () =>
      [
        rehypeRaw,
        [rehypeHighlight, { detect: true, ignoreMissing: true }],
        rehypeKatex,
      ] as any[],
    [],
  );

  const components = useMemo(
    () => ({
      pre: ({ children, className: preClass, ...rest }: ComponentPropsWithoutRef<"pre"> & { node?: unknown }) => (
        <pre className={cn("not-prose", preClass)} {...rest}>
          {children}
        </pre>
      ),
      code: ({
        children,
        className: codeClass,
        ...rest
      }: ComponentPropsWithoutRef<"code"> & { node?: unknown }) => {
        const classStr = typeof codeClass === "string" ? codeClass : "";
        const langMatch = /language-(\w+)/.exec(classStr);
        const lang = langMatch?.[1];

        // Inline code detection: if there's no language class and no hljs class, treat as inline
        const isBlock = classStr.includes("hljs") || langMatch;

        if (!isBlock) {
          return (
            <code className={cn(codeClass)} {...rest}>
              {children}
            </code>
          );
        }

        // Mermaid diagram
        if (lang === "mermaid") {
          return <MermaidBlock>{children}</MermaidBlock>;
        }

        // Highlighted code block
        return (
          <CodeBlock lang={lang}>
            <code className={cn("break-all", codeClass)} {...rest}>
              {children}
            </code>
          </CodeBlock>
        );
      },
      a: ({
        children,
        href = "",
        ...rest
      }: ComponentPropsWithoutRef<"a"> & { node?: unknown }) => {
        // Audio embedding
        if (AUDIO_EXTS.test(href)) {
          return (
            <figure className="my-2">
              <audio controls src={href} className="w-full" />
            </figure>
          );
        }
        // Video embedding
        if (VIDEO_EXTS.test(href)) {
          return (
            <video controls className="w-full rounded-lg my-2">
              <source src={href} />
            </video>
          );
        }
        // Citation reference: numeric-only link text gets special styling
        const text = extractText(children);
        const isReference = /^[0-9]+$/.test(text);
        const isInternal = /^\/#/i.test(href);

        return (
          <a
            href={href}
            target={isInternal ? "_self" : "_blank"}
            rel={isInternal ? undefined : "noopener noreferrer"}
            className={cn({ reference: isReference })}
            {...rest}
          >
            {children}
          </a>
        );
      },
      img: ({
        src,
        alt,
        ...rest
      }: ComponentPropsWithoutRef<"img"> & { node?: unknown }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mx-auto cursor-zoom-in rounded-xl"
          src={src}
          alt={alt}
          title={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onClick={() => {
            if (src) setLightbox({ src: String(src), alt: alt ?? "" });
          }}
          {...rest}
        />
      ),
    }),
    [],
  );

  return (
    <>
      <div
        className={cn(
          "markdown-renderer",
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
          "prose-pre:bg-transparent prose-pre:border-0 prose-pre:p-0",
          // Blockquotes
          "prose-blockquote:border-l-4 prose-blockquote:border-obsidian-primary prose-blockquote:bg-obsidian-surface-raised/40 prose-blockquote:backdrop-blur-xl prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic",
          // Tables
          "prose-table:border-0",
          "prose-th:bg-obsidian-surface-raised prose-th:text-obsidian-on-surface prose-th:text-xs prose-th:uppercase prose-th:tracking-widest",
          "prose-td:text-obsidian-on-surface-variant",
          "prose-tr:border-obsidian-outline-ghost",
          // Horizontal rules
          "prose-hr:border-obsidian-outline-ghost",
          // Images
          "prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto",
          // Superscript (citation numbers)
          "prose-sup:text-obsidian-primary prose-sup:font-bold prose-sup:text-xs",
          className,
        )}
      >
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
          disallowedElements={["script", "form"]}
        >
          {content}
        </ReactMarkdown>
      </div>
      {/* Lightbox portal */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract plain text from React children (string | number | array thereof). */
function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  return "";
}
