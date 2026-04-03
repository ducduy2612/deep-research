import { marked } from "marked";
import html2pdf from "html2pdf.js";

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
 * Export a markdown report as a PDF file.
 *
 * Converts markdown → HTML via `marked`, then uses html2pdf.js to capture
 * the rendered HTML as a paginated A4 PDF and trigger a browser download.
 */
export async function exportReportAsPdf(
  markdown: string,
  title: string,
): Promise<void> {
  const container = document.createElement("div");
  container.style.fontFamily = "sans-serif";
  container.style.color = "#1a1a2e";
  container.style.padding = "20px";
  container.style.lineHeight = "1.6";
  container.style.fontSize = "14px";

  const html = marked.parse(markdown);
  container.innerHTML = typeof html === "string" ? html : "";

  document.body.appendChild(container);

  try {
    const filename = `${sanitizeFilename(title)}.pdf`;

    await html2pdf()
      .set({
        filename,
        margin: [10, 10, 10, 10] as number[],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  } catch (err) {
    console.error("[exportReportAsPdf] Failed to generate PDF:", err);
  } finally {
    document.body.removeChild(container);
  }
}
