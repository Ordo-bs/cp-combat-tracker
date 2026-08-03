import type { CombatEncounter } from "../../domain/combat/CombatEncounter";

export interface IEncounterRepository {
  load(): Promise<void>;
  save(): Promise<void>;
  clear(): Promise<void>;
  replace(encounter: CombatEncounter | null): Promise<void>;
  get(): CombatEncounter | null;
}

export interface PersistedEncounterData {
  version: 1;
  encounter: CombatEncounter | null;
}
