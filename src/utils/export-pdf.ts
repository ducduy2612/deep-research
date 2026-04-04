/**
 * Sanitize a string for use as a filesystem filename.
 * Replaces non-alphanumeric characters with `-`, collapses runs, and trims to 80 chars.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Export a report as a PDF file using the browser's native print dialog.
 *
 * Temporarily sets `document.title` to the report title so the browser
 * suggests a meaningful filename (e.g. "My-Report.pdf") when the user
 * picks "Save as PDF" in the print dialog. Restores the original title
 * after the print dialog closes — even if print throws.
 */
export function exportReportAsPdf(title: string): void {
  const originalTitle = document.title;
  document.title = sanitizeFilename(title);
  try {
    window.print();
  } finally {
    document.title = originalTitle;
  }
}
