import { findCombatSheet } from "../domain/combat/CombatEncounter";
import { createCombatLogEntry, prependCombatLogEntry } from "../domain/combat/CombatLog";
import { CombatEvent } from "../events/EventTypes";
import type { EventDispatcher } from "../events/EventDispatcher";
import type { IEncounterRepository } from "../infrastructure/repository/IEncounterRepository";

export interface ICombatLogService {
  recordResult(combatantId: string, text: string): void;
}

export class CombatLogService implements ICombatLogService {
  constructor(
    private readonly repository: IEncounterRepository,
    private readonly dispatcher: EventDispatcher,
  ) {}

  recordResult(combatantId: string, text: string): void {
    if (!text) {
      return;
    }
    const encounter = this.repository.get();
    if (!encounter) {
      return;
    }
    const sheet = findCombatSheet(encounter, combatantId);
    prependCombatLogEntry(
      encounter,
      createCombatLogEntry({
        kind: "result",
        text,
        combatantId,
        combatantName: sheet?.name,
      }),
    );
    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.CombatLogUpdated, {});
  }
}
