"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";

import { useSettingsStore } from "@/stores/settings-store";
import { useHistoryStore } from "@/stores/history-store";
import { useKnowledgeStore } from "@/stores/knowledge-store";

const SerwistProvider = dynamic(
  () =>
    import("@serwist/next/react").then((mod) => mod.SerwistProvider),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

interface ProvidersProps {
  children: React.ReactNode;
  messages: Record<string, unknown>;
  locale: string;
}

/**
 * Client-side providers wrapper.
 *
 * - Wraps children with NextIntlClientProvider for i18n.
 * - Hydrates settings store from localforage on mount.
 * - Renders sonner Toaster for error/status notifications.
 * - Shows a minimal loading state until settings are hydrated.
 */
export function Providers({ children, messages, locale }: ProvidersProps) {
  const hydrate = useSettingsStore((s) => s.hydrate);
  const loaded = useSettingsStore((s) => s.loaded);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);
  const hydrateKnowledge = useKnowledgeStore((s) => s.hydrate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    hydrate().catch((err) => {
      console.error("[Providers] Failed to hydrate settings:", err);
    });
    hydrateHistory().catch((err) => {
      console.error("[Providers] Failed to hydrate history:", err);
    });
    hydrateKnowledge().catch((err) => {
      console.error("[Providers] Failed to hydrate knowledge:", err);
    });
  }, [hydrate, hydrateHistory, hydrateKnowledge]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent flash of incorrect theme / missing settings
  if (!mounted || !loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-surface-well">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-obsidian-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <SerwistProvider swUrl="/sw.js">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgb(32, 31, 34)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#fff",
            },
          }}
        />
      </SerwistProvider>
    </NextIntlClientProvider>
  );
}
