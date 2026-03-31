"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useSettingsStore } from "@/stores/settings-store";
import { createAuthHeaders } from "@/lib/client-signature";
import { cn } from "@/utils/style";
import type { KnowledgeItem } from "@/engine/knowledge/types";

// ---------------------------------------------------------------------------
// Accepted MIME types
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.md,.csv,.json,.xml,.yaml,.yml,.html,.htm,.svg,.log,.ts,.tsx,.js,.jsx,.py,.rs,.go,.sh,.bat,.css,.scss,.less";

// ---------------------------------------------------------------------------
// FileUpload component
// ---------------------------------------------------------------------------

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addItem = useKnowledgeStore((s) => s.add);

  // ---------------------------------------------------------------------------
  // Process a single file
  // ---------------------------------------------------------------------------

  const processFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(`Uploading ${file.name}...`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const { proxyMode, accessPassword } = useSettingsStore.getState();
        const headers: Record<string, string> = {
          ...(proxyMode ? createAuthHeaders(accessPassword) : {}),
        };

        const res = await fetch("/api/knowledge/parse", {
          method: "POST",
          headers,
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Parse failed (${res.status})`);
        }

        const item: KnowledgeItem = {
          id: nanoid(),
          title: data.title,
          content: data.content,
          type: "file",
          fileType: data.fileType,
          fileName: data.fileName,
          fileSize: data.fileSize,
          chunkCount: data.chunkCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        addItem(item);
        toast.success(`"${file.name}" added to knowledge base (${data.chunkCount} chunks)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to parse "${file.name}": ${message}`);
      } finally {
        setUploading(false);
        setProgress(null);
      }
    },
    [addItem],
  );

  // ---------------------------------------------------------------------------
  // Process files sequentially
  // ---------------------------------------------------------------------------

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        await processFile(file);
      }
    },
    [processFile],
  );

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        void processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void processFiles(e.target.files);
        // Reset input so the same file can be re-uploaded
        e.target.value = "";
      }
    },
    [processFiles],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-obsidian-primary bg-obsidian-primary/10"
            : "border-obsidian-border/50 bg-obsidian-surface-deck hover:border-obsidian-on-surface/30",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-obsidian-primary" />
        ) : (
          <Upload className="h-8 w-8 text-obsidian-on-surface/40" />
        )}
        <p className="text-sm text-obsidian-on-surface/60">
          {uploading ? progress : "Drop files here or click to browse"}
        </p>
        <p className="text-xs text-obsidian-on-surface/30">
          PDF, Office documents, text files
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
