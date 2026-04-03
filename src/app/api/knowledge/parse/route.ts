import { NextResponse } from "next/server";
import { parseFile } from "@/engine/knowledge/file-parser";
import { chunkContent } from "@/engine/knowledge/chunker";
import { isTextMime, isOfficeMime, isPdfMime } from "@/engine/knowledge/types";
import { enforceKnowledgeAuth } from "@/lib/proxy-auth";

export const runtime = "nodejs";

/** Max file size: 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  // Enforce auth when ACCESS_PASSWORD is set
  const authError = enforceKnowledgeAuth(request);
  if (authError) {
    return NextResponse.json(
      { error: authError.error, message: authError.message },
      { status: authError.status },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid 'file' field in FormData" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const fileName = file.name;

    // Validate MIME type
    if (!isTextMime(mimeType) && !isOfficeMime(mimeType) && !isPdfMime(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 415 },
      );
    }

    // Parse file content
    const fileData = await file.arrayBuffer();
    const content = await parseFile(fileData, mimeType, fileName);

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: `No text content could be extracted from "${fileName}"` },
        { status: 422 },
      );
    }

    // Chunk the content
    const chunks = chunkContent(content);

    // Derive title from filename (remove extension)
    const title = fileName.replace(/\.[^/.]+$/, "");

    console.info(
      `[knowledge:parse] Parsed "${fileName}" (${mimeType}): ${content.length} chars → ${chunks.length} chunks`,
    );

    return NextResponse.json({
      title,
      content,
      fileType: mimeType,
      fileName,
      fileSize: file.size,
      chunkCount: chunks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    console.error("[knowledge:parse] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
