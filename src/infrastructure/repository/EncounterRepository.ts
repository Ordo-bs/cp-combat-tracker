import type { Plugin } from "obsidian";
import type { CombatEncounter } from "../../domain/combat/CombatEncounter";
import type {
  IEncounterRepository,
  PersistedEncounterData,
} from "./IEncounterRepository";

export class EncounterRepository implements IEncounterRepository {
  private encounter: CombatEncounter | null = null;

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<void> {
    const data = (await this.plugin.loadData()) as PersistedEncounterData | null;
    this.encounter = data?.encounter ?? null;
  }

  async save(): Promise<void> {
    const payload: PersistedEncounterData = {
      version: 1,
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
