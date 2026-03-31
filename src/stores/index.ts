/**
 * Store barrel export.
 *
 * Re-exports all Zustand stores, their types, and selectors.
 */

// Research store
export {
  useResearchStore,
  selectElapsedMs,
  selectStepText,
  selectIsActive,
  selectAllSources,
  selectAllImages,
} from "./research-store";

export type {
  ResearchStore,
  ResearchStoreState,
  ResearchStoreActions,
  ActivityEntry,
  ActivityLevel,
  StepStreamState,
} from "./research-store";

// Settings store
export {
  useSettingsStore,
  selectEnabledProviders,
  selectProviderEnabled,
  selectSearchProviderId,
} from "./settings-store";

export type {
  SettingsStore,
  SettingsStoreState,
  SettingsStoreActions,
  ProviderKeyConfig,
} from "./settings-store";

// UI store
export {
  useUIStore,
  selectDialogOpen,
  selectIsActiveView,
} from "./ui-store";

export type {
  UIStore,
  UIStoreState,
  UIStoreActions,
  AppView,
  DialogType,
} from "./ui-store";

// History store
export {
  useHistoryStore,
  selectSessionCount,
  selectSessionsByFilter,
} from "./history-store";

export type {
  HistoryStore,
  HistoryStoreState,
  HistoryStoreActions,
  HistorySession,
} from "./history-store";

// Knowledge store
export {
  useKnowledgeStore,
  selectItemCount,
  selectItemsByType,
} from "./knowledge-store";

export type {
  KnowledgeStore,
  KnowledgeStoreState,
  KnowledgeStoreActions,
} from "./knowledge-store";
