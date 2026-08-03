import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { UiElement } from "../types";
import type { CombatEncounter } from "../../domain/combat/CombatEncounter";
import { CombatEvent } from "../../events/EventTypes";
import type { PluginContext } from "../../plugin/PluginContext";
import { useAppContext } from "./AppContext";

interface EncounterContextValue {
  encounter: CombatEncounter | null;
  pluginContext: PluginContext;
}

const EncounterContext = createContext<EncounterContextValue | null>(null);

const REFRESH_EVENTS: CombatEvent[] = [
  CombatEvent.EncounterChanged,
  CombatEvent.CombatantAdded,
  CombatEvent.CombatantRemoved,
  CombatEvent.CombatantDuplicated,
  CombatEvent.InitiativeUpdated,
  CombatEvent.QueueRebuilt,
  CombatEvent.TurnAdvanced,
  CombatEvent.TurnReversed,
  CombatEvent.EncounterCleared,
  CombatEvent.AmmoChanged,
  CombatEvent.CombatSheetUpdated,
  CombatEvent.StatusChanged,
  CombatEvent.CombatActionExecuted,
];

export function EncounterProvider({ children }: { children: ReactNode }): UiElement {
  const { pluginContext } = useAppContext();
  const listenersRef = useRef(new Set<() => void>());
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (listener: () => void) => {
      listenersRef.current.add(listener);

      const notify = (): void => {
        versionRef.current += 1;
        listenersRef.current.forEach((l) => l());
      };

      const unsubscribes = REFRESH_EVENTS.map((event) =>
        pluginContext.dispatcher.subscribe(event, notify),
      );

      return () => {
        listenersRef.current.delete(listener);
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      };
    },
    [pluginContext],
  );

  const getSnapshot = useCallback(() => {
    return `${versionRef.current}:${JSON.stringify(pluginContext.repository.get())}`;
  }, [pluginContext]);

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const encounter = pluginContext.repository.get();

  const value = useMemo(
    () => ({ encounter, pluginContext }),
    [encounter, pluginContext],
  );

  return <EncounterContext.Provider value={value}>{children}</EncounterContext.Provider>;
}

export function useEncounterContext(): EncounterContextValue {
  const value = useContext(EncounterContext);
  if (!value) {
    throw new Error("useEncounterContext must be used within EncounterProvider");
  }
  return value;
}

export function useEncounter(): CombatEncounter | null {
  return useEncounterContext().encounter;
}

export function usePluginContext(): PluginContext {
  return useEncounterContext().pluginContext;
}
