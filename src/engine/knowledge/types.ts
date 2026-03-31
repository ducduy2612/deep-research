import { z } from "zod";
// AppError import reserved for future use when knowledge errors need to integrate
// with the centralized error system

// ---------------------------------------------------------------------------
// Knowledge types
// ---------------------------------------------------------------------------

/** A single knowledge item stored in the knowledge base. */
export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: "file" | "url";
  fileType?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

/** Raw parsed content before chunking. */
export interface KnowledgeContent {
  title: string;
  content: string;
  sourceType: "file" | "url";
  fileName?: string;
  url?: string;
}

/** Result from a URL crawl operation. */
export interface CrawlResult {
  url: string;
  title: string;
  content: string;
}

/** Knowledge-specific error with file/URL context. */
export class KnowledgeParseError extends Error {
  readonly fileName?: string;
  readonly url?: string;
  readonly cause?: Error;

  constructor(message: string, options?: { fileName?: string; url?: string; cause?: Error }) {
    super(message, { cause: options?.cause });
    this.name = "KnowledgeParseError";
    this.fileName = options?.fileName;
    this.url = options?.url;
  }
}

// ---------------------------------------------------------------------------
// Zod schemas (Zod 4)
// ---------------------------------------------------------------------------

export const knowledgeItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  type: z.enum(["file", "url"]),
  fileType: z.string().optional(),
  url: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  chunkCount: z.number().int().min(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const knowledgeContentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  sourceType: z.enum(["file", "url"]),
  fileName: z.string().optional(),
  url: z.string().optional(),
});

export const crawlRequestSchema = z.object({
  url: z.string().url(),
  crawler: z.enum(["jina", "local"]),
});

export const parseResponseSchema = z.object({
  title: z.string(),
  content: z.string(),
  fileType: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
});

export const crawlResponseSchema = z.object({
  url: z.string(),
  title: z.string(),
  content: z.string(),
});

// ---------------------------------------------------------------------------
// MIME type constants
// ---------------------------------------------------------------------------

/** MIME types that can be parsed as plain UTF-8 text. */
export const TEXT_MIME_TYPES: readonly string[] = [
  "application/json",
  "application/ld+json",
  "application/vnd.api+json",
  "application/xhtml+xml",
  "application/xml",
  "application/atom+xml",
  "application/rss+xml",
  "application/x-yaml",
  "application/rtf",
  "application/x-javascript",
  "application/x-typescript",
  "application/ecmascript",
  "application/x-python",
  "application/x-httpd-php",
  "application/x-latex",
  "application/x-sh",
  "application/x-csh",
  "image/svg+xml",
] as const;

/** MIME types for Office Open XML documents. */
export const OFFICE_MIME_PREFIXES: readonly string[] = [
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.oasis.opendocument",
] as const;

/** MIME type for PDF. */
export const PDF_MIME_TYPE = "application/pdf" as const;

/**
 * Check if a MIME type represents a text-based file.
 * Matches text/* and known text-based application/* types.
 */
export function isTextMime(mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  return (TEXT_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Check if a MIME type represents an Office document.
 */
export function isOfficeMime(mimeType: string): boolean {
  return OFFICE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

/**
 * Check if a MIME type represents a PDF.
 */
export function isPdfMime(mimeType: string): boolean {
  return mimeType === PDF_MIME_TYPE;
}
