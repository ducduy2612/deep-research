/**
 * Zustand store for ephemeral UI state.
 *
 * Tracks: active view, dialog state, sidebar, etc.
 * NOT persisted — resets on page reload.
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// View types
// ---------------------------------------------------------------------------

/** The main application views/screens. */
export type AppView = "hub" | "active" | "report";

/** The possible dialog states. */
export type DialogType = "settings" | "history" | "knowledge" | "about" | null;

// ---------------------------------------------------------------------------
// Store state & actions
// ---------------------------------------------------------------------------

export interface UIStoreState {
  /** Current main view. */
  readonly activeView: AppView;

  /** Currently open dialog (null = none). */
  readonly activeDialog: DialogType;

  /** Whether the settings dialog was triggered from active research. */
  readonly settingsFromResearch: boolean;

  /** Mobile sidebar open state. */
  readonly sidebarOpen: boolean;
}

export interface UIStoreActions {
  /** Navigate to a specific view. */
  navigate: (view: AppView) => void;

  /** Open a dialog. */
  openDialog: (dialog: DialogType) => void;

  /** Close any open dialog. */
  closeDialog: () => void;

  /** Toggle sidebar (mobile). */
  toggleSidebar: () => void;

  /** Set sidebar state explicitly. */
  setSidebarOpen: (open: boolean) => void;
}

export type UIStore = UIStoreState & UIStoreActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUIStore = create<UIStore>()((set) => ({
  activeView: "hub",
  activeDialog: null,
  settingsFromResearch: false,
  sidebarOpen: false,

  navigate: (view: AppView) => {
    set({ activeView: view });
  },

  openDialog: (dialog: DialogType) => {
    set({ activeDialog: dialog });
  },

  closeDialog: () => {
    set({
      activeDialog: null,
      settingsFromResearch: false,
    });
  },

  toggleSidebar: () => {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Check if a specific dialog is open. */
export const selectDialogOpen = (
  dialog: DialogType,
) => (s: UIStoreState): boolean => s.activeDialog === dialog;

/** Check if we're on the active research screen. */
export const selectIsActiveView = (s: UIStoreState): boolean =>
  s.activeView === "active";
