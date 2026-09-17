import type { CombatEncounter } from "../../domain/combat/CombatEncounter";

export interface IEncounterRepository {
  load(): Promise<void>;
  save(): Promise<void>;
  clear(): Promise<void>;
  replace(encounter: CombatEncounter | null): Promise<void>;
  get(): CombatEncounter | null;
}

export interface PersistedEncounterData {
  version: 3;
  encounter: CombatEncounter | null;
}

export const CURRENT_ENCOUNTER_VERSION = 3 as const;
