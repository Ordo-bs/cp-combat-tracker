import type { CombatEncounter } from "../domain/combat/CombatEncounter";
import { emptyCombatLog } from "../domain/combat/CombatLog";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { createInitiative } from "../domain/combat/Initiative";
import { CombatEvent } from "../events/EventTypes";
import type { EventDispatcher } from "../events/EventDispatcher";
import type { IEncounterRepository } from "../infrastructure/repository/IEncounterRepository";
import { generateId } from "../util/uuid";
import { clearSpeedwareStatuses } from "../domain/status/speedware";
import { createEmptyEncounter } from "./InitiativeService";

export interface IEncounterService {
  getCurrent(): CombatEncounter;
  clearEncounter(): void;
}

export class EncounterService implements IEncounterService {
  constructor(
    private readonly repository: IEncounterRepository,
    private readonly dispatcher: EventDispatcher,
  ) {}

  getCurrent(): CombatEncounter {
    let encounter = this.repository.get();
    if (!encounter) {
      encounter = createEmptyEncounter(generateId());
      void this.repository.replace(encounter);
      this.dispatcher.publish(CombatEvent.EncounterChanged, {});
    }
    return encounter;
  }

  clearEncounter(): void {
    const encounter = this.repository.get();
    if (!encounter) {
      return;
    }

    const remainingParticipants = encounter.participants.filter(
      (sheet) => sheet.sheetType === CombatSheetType.PC,
    );

    for (const sheet of remainingParticipants) {
      sheet.initiative = createInitiative(0);
      clearSpeedwareStatuses(sheet);
    }

    encounter.participants = remainingParticipants;
    encounter.initiativeQueue = {
      orderedIds: remainingParticipants.map((sheet) => sheet.id),
      dirty: false,
    };
    encounter.activeCombatantId = encounter.initiativeQueue.orderedIds[0] ?? null;
    encounter.combatLog = emptyCombatLog();
    encounter.roundNumber = 1;

    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.EncounterCleared, {});
    this.dispatcher.publish(CombatEvent.EncounterChanged, {});
  }
}
