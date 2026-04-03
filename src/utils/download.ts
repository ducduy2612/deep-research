/**
 * Trigger a browser download for the given content.
 *
 * Creates a temporary object URL and hidden `<a>` element to initiate
 * the download, then revokes the URL asynchronously to free memory.
 */
export function downloadBlob(
  filename: string,
  content: string | Blob,
  mimeType = "text/plain;charset=utf-8",
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Defer revocation so the browser can finish reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
