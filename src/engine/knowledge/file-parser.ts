import { isTextMime, isOfficeMime, isPdfMime, KnowledgeParseError } from "./types";

/**
 * Parse text content from an ArrayBuffer.
 * Decodes as UTF-8. Used for all text-based MIME types.
 */
export function parseTextContent(fileData: ArrayBuffer, mimeType: string): string {
  if (!isTextMime(mimeType)) {
    throw new Error(`Unsupported text MIME type: ${mimeType}`);
  }

  const decoder = new TextDecoder("utf-8");
  return decoder.decode(fileData);
}

/**
 * Determine which parser to use based on MIME type.
 * Returns the parser category: "text", "pdf", "office", or throws for unsupported types.
 */
export function getParserCategory(mimeType: string): "text" | "pdf" | "office" {
  if (isTextMime(mimeType)) return "text";
  if (isPdfMime(mimeType)) return "pdf";
  if (isOfficeMime(mimeType)) return "office";
  throw new KnowledgeParseError(`Unsupported file type: ${mimeType}`, {
    fileName: undefined,
  });
}

/**
 * Parse a PDF file using pdfjs-dist (server-side only).
 * Returns extracted text content from all pages.
 */
export async function parsePdfContent(
  fileData: ArrayBuffer,
  fileName?: string,
): Promise<string> {
  try {
    // Dynamic import to avoid bundling in client
    const pdfjsLib = await import("pdfjs-dist");

    // Use getDocument with ArrayBuffer directly — no worker needed server-side
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileData),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item) => "str" in item)
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      pages.push(pageText);
    }

    return pages.join("\n\n");
  } catch (error) {
    throw new KnowledgeParseError(
      error instanceof Error ? error.message : "Failed to parse PDF",
      { fileName, cause: error instanceof Error ? error : undefined },
    );
  }
}

/**
 * Parse an Office document using officeparser (server-side only).
 * Supports .docx, .xlsx, .pptx, .odt, .ods, .odp, etc.
 */
export async function parseOfficeContent(
  fileData: ArrayBuffer,
  fileName?: string,
): Promise<string> {
  try {
    // Dynamic import — officeparser is Node.js only
    const { OfficeParser } = await import("officeparser");

    // officeparser accepts Buffer or ArrayBuffer directly
    const ast = await OfficeParser.parseOffice(fileData);
    const text = ast.toText();
    return text;
  } catch (error) {
    throw new KnowledgeParseError(
      error instanceof Error ? error.message : "Failed to parse Office document",
      { fileName, cause: error instanceof Error ? error : undefined },
    );
  }
}

/**
 * Parse file data based on its MIME type.
 * Routes to the appropriate parser: text decoder, pdfjs-dist, or officeparser.
 */
export async function parseFile(
  fileData: ArrayBuffer,
  mimeType: string,
  fileName?: string,
): Promise<string> {
  const category = getParserCategory(mimeType);

  switch (category) {
    case "text":
      return parseTextContent(fileData, mimeType);
    case "pdf":
      return parsePdfContent(fileData, fileName);
    case "office":
      return parseOfficeContent(fileData, fileName);
  }
}
