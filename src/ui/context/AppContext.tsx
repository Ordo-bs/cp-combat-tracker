import { createContext, useContext } from "react";
import type { App } from "obsidian";
import type { PluginContext } from "../../plugin/PluginContext";

export interface AppProviderValue {
  app: App;
  pluginContext: PluginContext;
}

export const AppContext = createContext<AppProviderValue | null>(null);

export function useAppContext(): AppProviderValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("useAppContext must be used within AppContext.Provider");
  }
  return value;
}

export function useObsidianApp(): App {
  return useAppContext().app;
}
