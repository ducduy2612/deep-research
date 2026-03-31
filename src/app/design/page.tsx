import { InteractionComponentsDemo } from "./components-demo";
import { DataComponentsDemo } from "./data-components-demo";

const surfaces = [
  { name: "Well", token: "surface-well", hex: "#0e0e10", desc: "Recedes content, main workspace" },
  { name: "Surface", token: "surface", hex: "#131315", desc: "Base canvas" },
  { name: "Deck", token: "surface-deck", hex: "#1c1b1d", desc: "Navigation, sidebars" },
  { name: "Sheet", token: "surface-sheet", hex: "#201f22", desc: "Content modules, cards" },
  { name: "Raised", token: "surface-raised", hex: "#2a2a2c", desc: "Interactive, hover" },
  { name: "Float", token: "surface-float", hex: "#353437", desc: "Modals, overlays" },
  { name: "Bright", token: "surface-bright", hex: "#39393b", desc: "Bright accent surfaces" },
];

const accentColors = [
  { name: "Primary", hex: "#c0c1ff" },
  { name: "Primary Deep", hex: "#8083ff" },
  { name: "Primary Seed", hex: "#6366f1" },
  { name: "Secondary", hex: "#adc6ff" },
  { name: "Tertiary", hex: "#d0bcff" },
  { name: "Error", hex: "#ffb4ab" },
  { name: "On Surface", hex: "#e5e1e4" },
  { name: "On Surface Var", hex: "#c7c4d7" },
  { name: "Outline", hex: "#908fa0" },
];

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-obsidian-surface-well py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Header */}
        <header>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-obsidian-on-surface">
            Obsidian Deep
          </h1>
          <p className="mt-2 text-sm font-mono text-obsidian-on-surface-var">
            Design System Reference · Phase 1 Verification
          </p>
        </header>

        {/* Surface Hierarchy */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-obsidian-on-surface mb-6">
            Surface Hierarchy
          </h2>
          <p className="text-sm text-obsidian-on-surface-var mb-6">
            7 tonal levels from deepest well to brightest surface. Boundaries defined by color shifts, never borders.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {surfaces.map((s) => (
              <div
                key={s.token}
                className={`bg-obsidian-${s.token} rounded-lg p-4`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-5 h-5 rounded-full border border-obsidian-outline-ghost"
                    style={{ backgroundColor: s.hex }}
                  />
                  <span className="text-sm font-medium text-obsidian-on-surface">
                    {s.name}
                  </span>
                </div>
                <p className="text-xs font-mono text-obsidian-on-surface-var">{s.hex}</p>
                <p className="text-xs text-obsidian-outline mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Accent Colors */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-obsidian-on-surface mb-6">
            Accent Colors
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {accentColors.map((c) => (
              <div key={c.name} className="bg-obsidian-surface-sheet rounded-lg p-4">
                <div
                  className="w-full h-10 rounded-md mb-3"
                  style={{ backgroundColor: c.hex }}
                />
                <p className="text-sm font-medium text-obsidian-on-surface">{c.name}</p>
                <p className="text-xs font-mono text-obsidian-on-surface-var">{c.hex}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-obsidian-on-surface mb-6">
            Typography
          </h2>
          <div className="space-y-6 bg-obsidian-surface-sheet rounded-lg p-6">
            <div>
              <p className="text-xs font-mono text-obsidian-outline mb-2">Display · Inter · tracking-tight · 3rem</p>
              <p className="text-5xl font-semibold tracking-[-0.04em] text-obsidian-on-surface">
                Deep Research
              </p>
            </div>
            <div className="h-px bg-obsidian-outline-ghost" />
            <div>
              <p className="text-xs font-mono text-obsidian-outline mb-2">Heading · Inter · semibold · 1.5rem</p>
              <p className="text-2xl font-semibold tracking-tight text-obsidian-on-surface">
                Section Heading
              </p>
            </div>
            <div className="h-px bg-obsidian-outline-ghost" />
            <div>
              <p className="text-xs font-mono text-obsidian-outline mb-2">Label · JetBrains Mono · medium · 0.75rem</p>
              <p className="text-xs font-medium font-mono text-obsidian-on-surface-var">
                SCORE: 94 · STATUS: COMPLETE · TIMESTAMP: 2025-01-15T10:30:00Z
              </p>
            </div>
            <div className="h-px bg-obsidian-outline-ghost" />
            <div>
              <p className="text-xs font-mono text-obsidian-outline mb-2">Body · Inter · regular · 0.875rem · leading-relaxed</p>
              <p className="text-sm leading-relaxed text-obsidian-on-surface-var max-w-2xl">
                The Obsidian Deep design system uses tonal layering to create depth without borders. Surface hierarchy
                progresses from Well (#0e0e10) through to Bright (#39393b), with each level adding luminance.
                Text uses on-surface (#e5e1e4) for primary and on-surface-variant (#c7c4d7) for secondary — never pure white.
              </p>
            </div>
          </div>
        </section>

        {/* AI Pulse Signature Pattern */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-obsidian-on-surface mb-6">
            AI Pulse · Signature Pattern
          </h2>
          <p className="text-sm text-obsidian-on-surface-var mb-6">
            A 4px wide vertical pill in primary color at the start of a line to indicate AI-generated content.
          </p>
          <div className="bg-obsidian-surface-sheet rounded-lg p-6">
            <div className="space-y-4">
              {/* Inline pulse */}
              <div className="flex items-start gap-3">
                <div className="w-1 h-12 rounded-sm bg-obsidian-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-obsidian-on-surface">
                    AI-Generated Summary
                  </p>
                  <p className="text-sm text-obsidian-on-surface-var mt-1">
                    Quantum computing research indicates significant breakthroughs in error correction
                    rates, with logical qubit fidelity reaching 99.9% in recent experiments.
                  </p>
                </div>
              </div>
              {/* Short pulse */}
              <div className="flex items-start gap-3">
                <div className="w-1 h-6 rounded-sm bg-obsidian-primary shrink-0" />
                <div>
                  <p className="text-sm text-obsidian-on-surface-var">
                    Confidence score: 94% — based on 12 verified sources
                  </p>
                </div>
              </div>
              {/* Active pulse */}
              <div className="flex items-start gap-3">
                <div className="w-1 h-4 rounded-sm bg-obsidian-primary animate-pulse shrink-0" />
                <div>
                  <p className="text-sm text-obsidian-on-surface-var animate-pulse">
                    Analyzing sources...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Glassmorphism */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-obsidian-on-surface mb-6">
            Glassmorphism
          </h2>
          <p className="text-sm text-obsidian-on-surface-var mb-6">
            Floating elements use backdrop-blur and semi-transparent backgrounds.
          </p>
          <div className="relative h-64 rounded-lg overflow-hidden bg-obsidian-surface-deck">
            {/* Background content to blur through */}
            <div className="absolute inset-0 p-6 space-y-2">
              <div className="w-3/4 h-3 rounded bg-obsidian-surface-raised" />
              <div className="w-1/2 h-3 rounded bg-obsidian-surface-raised" />
              <div className="w-2/3 h-3 rounded bg-obsidian-surface-raised" />
              <div className="w-1/3 h-3 rounded bg-obsidian-surface-raised" />
              <div className="w-3/5 h-3 rounded bg-obsidian-surface-raised" />
              <div className="w-1/4 h-3 rounded bg-obsidian-surface-raised" />
            </div>
            {/* Glassmorphism overlay */}
            <div
              className="absolute top-8 right-8 w-72 rounded-xl p-6"
              style={{
                background: "rgba(53, 52, 55, 0.7)",
                backdropFilter: "blur(20px)",
                boxShadow: "0px 24px 48px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              <h3 className="text-sm font-medium text-obsidian-on-surface mb-2">
                Glassmorphism Panel
              </h3>
              <p className="text-xs text-obsidian-on-surface-var">
                background: rgba(53, 52, 55, 0.7) · backdrop-blur: 20px · whisper shadow
              </p>
            </div>
          </div>
        </section>

        {/* Gradient Primary Button */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-obsidian-on-surface mb-6">
            Gradient Primary Button
          </h2>
          <div className="bg-obsidian-surface-sheet rounded-lg p-6">
            <button
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: "linear-gradient(135deg, #c0c1ff 0%, #8083ff 100%)",
                color: "#1000a9",
              }}
            >
              Start Research
            </button>
          </div>
        </section>

        {/* shadcn/ui Components */}
        <InteractionComponentsDemo />
        <DataComponentsDemo />

        {/* Footer */}
        <footer className="pt-8 border-t border-obsidian-outline-ghost">
          <p className="text-xs font-mono text-obsidian-outline">
            Obsidian Deep Design System · Phase 1 Verification Page
          </p>
        </footer>
      </div>
    </div>
  );
}
