"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { useSettingsStore } from "@/stores/settings-store";

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/**
 * Client-side providers wrapper.
 *
 * - Hydrates settings store from localforage on mount.
 * - Renders sonner Toaster for error/status notifications.
 * - Shows a minimal loading state until settings are hydrated.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useSettingsStore((s) => s.hydrate);
  const loaded = useSettingsStore((s) => s.loaded);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    hydrate().catch((err) => {
      console.error("[Providers] Failed to hydrate settings:", err);
    });
  }, [hydrate]);

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
    <>
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
    </>
  );
}
