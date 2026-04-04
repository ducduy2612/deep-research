"use client";

import { useRef, useState, type ReactNode } from "react";
import { Copy, CopyCheck } from "lucide-react";
import copy from "copy-to-clipboard";
// ---------------------------------------------------------------------------
// Language alias map (mirrors v0)
// ---------------------------------------------------------------------------

const langAlias: Record<string, string> = {
  ino: "Arduino",
  sh: "Bash",
  zsh: "Bash",
  h: "C",
  cpp: "C++",
  cc: "C++",
  "h++": "C++",
  hpp: "C++",
  hh: "C++",
  hxx: "C++",
  cxx: "C++",
  csharp: "C#",
  cs: "C#",
  css: "CSS",
  patch: "Diff",
  golang: "Go",
  graphql: "GraphQL",
  gql: "GraphQL",
  ini: "INI",
  toml: "TOML",
  jsp: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  json: "JSON",
  jsonc: "JSON",
  kt: "Kotlin",
  kts: "Kotlin",
  pluto: "Lua",
  mk: "Makefile",
  mak: "Makefile",
  make: "Makefile",
  md: "Markdown",
  mkdown: "Markdown",
  mkd: "Markdown",
  objectivec: "Objective-C",
  mm: "Objective-C",
  objc: "Objective-C",
  "obj-c": "Objective-C",
  "obj-c++": "Objective-C",
  "objective-c++": "Objective-C",
  pl: "Perl",
  pm: "Perl",
  plaintext: "Plain text",
  text: "Plain text",
  txt: "Plain text",
  py: "Python",
  gyp: "Python",
  ipython: "Python",
  rb: "Ruby",
  gemspec: "Ruby",
  podspec: "Ruby",
  thor: "Ruby",
  irb: "Ruby",
  rs: "Rust",
  scss: "SCSS",
  shell: "Shell Session",
  console: "Shell Session",
  shellsession: "Shell Session",
  sql: "SQL",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  vbnet: "Visual Basic .NET",
  vb: "Visual Basic .NET",
  wasm: "WebAssembly",
  xml: "XML",
  html: "HTML",
  xhtml: "XML",
  rss: "XML",
  atom: "XML",
  xjb: "XML",
  xsd: "XML",
  xsl: "XML",
  plist: "XML",
  wsf: "XML",
  svg: "XML",
  yaml: "YAML",
  yml: "YAML",
};

function getLangLabel(lang: string): string {
  return langAlias[lang] ?? lang.charAt(0).toUpperCase() + lang.slice(1);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CodeBlockProps {
  children: ReactNode;
  lang?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeBlock({ children, lang }: CodeBlockProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (codeRef.current) {
      copy(codeRef.current.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg border border-obsidian-border/30">
      {/* Header bar: language label + copy button */}
      <div className="flex h-9 items-center justify-between bg-obsidian-surface-well px-3">
        <span className="text-xs font-medium text-obsidian-on-surface-variant/60">
          {lang ? getLangLabel(lang) : ""}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded p-1 text-obsidian-on-surface-variant/60 transition-colors hover:bg-obsidian-surface-raised hover:text-obsidian-on-surface"
          aria-label="Copy code"
        >
          {copied ? (
            <CopyCheck className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {/* Code body */}
      <div
        ref={codeRef}
        className="overflow-auto bg-obsidian-surface-well p-4 text-sm"
      >
        {children}
      </div>
    </div>
  );
}
