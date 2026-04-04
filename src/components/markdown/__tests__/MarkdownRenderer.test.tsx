/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "../MarkdownRenderer";

// Mock MermaidBlock to avoid loading mermaid in tests
vi.mock("../MermaidBlock", () => ({
  MermaidBlock: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mermaid">{children}</div>
  ),
}));

describe("MarkdownRenderer", () => {
  it("renders plain text paragraphs", () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders headings", () => {
    render(<MarkdownRenderer content={"# Title\n\n## Subtitle\n\n### Sub-sub"} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Subtitle");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Sub-sub");
  });

  it("renders bold and italic", () => {
    render(<MarkdownRenderer content="**bold** and *italic*" />);
    const container = screen.getByText("bold").closest("strong");
    expect(container).toBeInTheDocument();
    const em = screen.getByText("italic").closest("em");
    expect(em).toBeInTheDocument();
  });

  it("renders links with target=_blank for external URLs", () => {
    render(<MarkdownRenderer content="[Google](https://google.com)" />);
    const link = screen.getByRole("link", { name: "Google" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders inline code", () => {
    render(<MarkdownRenderer content="Use `console.log` to debug" />);
    const code = screen.getByText("console.log");
    expect(code.tagName).toBe("CODE");
  });

  it("renders fenced code blocks with CodeBlock component", () => {
    const { container } = render(
      <MarkdownRenderer content={'```javascript\nconst x = 1;\n```'} />,
    );
    // CodeBlock renders a language label and a copy button with aria-label
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByLabelText("Copy code")).toBeInTheDocument();
    // Code content is rendered (rehype-highlight may wrap it)
    expect(container.querySelector("code")).toBeInTheDocument();
    expect(container.textContent).toContain("const x = 1;");
  });

  it("renders GFM tables", () => {
    render(
      <MarkdownRenderer
        content={"| H1 | H2 |\n| --- | --- |\n| a | b |"}
      />,
    );
    expect(screen.getByText("H1")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
  });

  it("renders blockquotes", () => {
    render(<MarkdownRenderer content="> This is a quote" />);
    expect(screen.getByText("This is a quote")).toBeInTheDocument();
    const quote = screen.getByText("This is a quote").closest("blockquote");
    expect(quote).toBeInTheDocument();
  });

  it("renders unordered and ordered lists", () => {
    render(
      <MarkdownRenderer
        content={"- item1\n- item2\n\n1. first\n2. second"}
      />,
    );
    expect(screen.getByText("item1")).toBeInTheDocument();
    expect(screen.getByText("first")).toBeInTheDocument();
  });

  it("renders horizontal rules", () => {
    const { container } = render(<MarkdownRenderer content={"above\n\n---\n\nbelow"} />);
    // querySelector searches the entire subtree
    const hr = container.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });

  it("renders LaTeX math via KaTeX (block)", () => {
    const { container } = render(
      <MarkdownRenderer content={"$$\nE = mc^2\n$$"} />,
    );
    // KaTeX renders .katex-display for block math
    const katexDisplay = container.querySelector(".katex-display");
    expect(katexDisplay).toBeInTheDocument();
  });

  it("renders LaTeX math via KaTeX (inline)", () => {
    const { container } = render(
      <MarkdownRenderer content={"The formula $E=mc^2$ is famous"} />,
    );
    // KaTeX renders .katex for inline math
    const katex = container.querySelector(".katex");
    expect(katex).toBeInTheDocument();
  });

  it("renders raw HTML passthrough (tables)", () => {
    render(
      <MarkdownRenderer
        content={'<table><tr><td>cell</td></tr></table>'}
      />,
    );
    expect(screen.getByText("cell")).toBeInTheDocument();
  });

  it("renders mermaid blocks", () => {
    render(
      <MarkdownRenderer
        content={'```mermaid\ngraph TD; A-->B;\n```'}
      />,
    );
    expect(screen.getByTestId("mermaid")).toHaveTextContent("graph TD; A-->B;");
  });

  it("renders audio links as <audio> elements", () => {
    const { container } = render(
      <MarkdownRenderer content="[Listen](https://example.com/audio.mp3)" />,
    );
    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("src", "https://example.com/audio.mp3");
  });

  it("renders video links as <video> elements", () => {
    const { container } = render(
      <MarkdownRenderer content="[Watch](https://example.com/clip.mp4)" />,
    );
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
  });

  it("applies reference class to numeric-only links", () => {
    render(<MarkdownRenderer content={"[1](https://source.com)"} />);
    const link = screen.getByRole("link", { name: "1" });
    expect(link.className).toContain("reference");
  });

  it("respects single line breaks (remark-breaks)", () => {
    const { container } = render(<MarkdownRenderer content={"line1\nline2"} />);
    // With remark-breaks, single newline produces a <br>
    const br = container.querySelector("br");
    expect(br).toBeInTheDocument();
  });

  it("does not render script tags (sanitized)", () => {
    const { container } = render(
      <MarkdownRenderer content={'<script>alert("xss")</script>'} />,
    );
    const script = container.querySelector("script");
    expect(script).not.toBeInTheDocument();
  });

  it("applies className prop to wrapper", () => {
    const { container } = render(
      <MarkdownRenderer content="test" className="custom-class" />,
    );
    // The first child has the markdown-renderer class + custom-class
    const wrapper = container.querySelector(".markdown-renderer");
    expect(wrapper?.className).toContain("custom-class");
  });
});
