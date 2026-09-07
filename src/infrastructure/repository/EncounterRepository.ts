import type { Plugin } from "obsidian";
import type { CombatEncounter } from "../../domain/combat/CombatEncounter";
import {
  CURRENT_ENCOUNTER_VERSION,
  type IEncounterRepository,
  type PersistedEncounterData,
} from "./IEncounterRepository";
import { migrateEncounter } from "./migrateEncounter";

export class EncounterRepository implements IEncounterRepository {
  private encounter: CombatEncounter | null = null;

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<void> {
    const data = (await this.plugin.loadData()) as { version?: number; encounter?: unknown } | null;
    if (!data) {
      this.encounter = null;
      return;
    }
    this.encounter = migrateEncounter(data);
  }

  async save(): Promise<void> {
    const payload: PersistedEncounterData = {
      version: CURRENT_ENCOUNTER_VERSION,
      encounter: this.encounter,
    };
    await this.plugin.saveData(payload);
  }

  async clear(): Promise<void> {
    this.encounter = null;
    await this.save();
  }

  async replace(encounter: CombatEncounter | null): Promise<void> {
    this.encounter = encounter;
    await this.save();
  }

  get(): CombatEncounter | null {
    return this.encounter;
  }
}
