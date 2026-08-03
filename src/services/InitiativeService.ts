import {
  createCombatEncounter,
  type CombatEncounter,
  findCombatSheet,
} from "../domain/combat/CombatEncounter";
import { commitInitiative, markInitiativePending } from "../domain/combat/Initiative";
import { markQueueDirty } from "../domain/initiative/InitiativeQueue";
import { getSheetCreationOrder } from "../domain/sheets/CombatSheet";
import { CombatEvent } from "../events/EventTypes";
import type { EventDispatcher } from "../events/EventDispatcher";
import type { IEncounterRepository } from "../infrastructure/repository/IEncounterRepository";
import type { IValidationService } from "./ValidationService";

export interface IInitiativeService {
  updatePending(combatantId: string, pending: number): boolean;
  insertCombatant(combatantId: string): void;
  removeCombatant(combatantId: string): void;
  nextTurn(): void;
  previousTurn(): void;
  rebuildQueueIfDirty(): void;
  getOrderedIds(): string[];
}

export class InitiativeService implements IInitiativeService {
  constructor(
    private readonly repository: IEncounterRepository,
    private readonly validationService: IValidationService,
    private readonly dispatcher: EventDispatcher,
  ) {}

  updatePending(combatantId: string, pending: number): boolean {
    const validation = this.validationService.validateInitiative(pending);
    if (!validation.valid) {
      return false;
    }

    const encounter = this.requireEncounter();
    const sheet = findCombatSheet(encounter, combatantId);
    if (!sheet) {
      return false;
    }

    sheet.initiative = markInitiativePending(sheet.initiative, pending);
    encounter.initiativeQueue = markQueueDirty(encounter.initiativeQueue);

    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.InitiativeUpdated, { combatantId, pending });
    return true;
  }

  insertCombatant(combatantId: string): void {
    const encounter = this.requireEncounter();
    if (!encounter.initiativeQueue.orderedIds.includes(combatantId)) {
      encounter.initiativeQueue.orderedIds.push(combatantId);
    }
    this.sortQueue(encounter);
    void this.repository.replace({ ...encounter });
  }

  removeCombatant(combatantId: string): void {
    const encounter = this.requireEncounter();
    encounter.initiativeQueue.orderedIds = encounter.initiativeQueue.orderedIds.filter(
      (id) => id !== combatantId,
    );

    if (encounter.activeCombatantId === combatantId) {
      encounter.activeCombatantId = encounter.initiativeQueue.orderedIds[0] ?? null;
    }

    void this.repository.replace({ ...encounter });
  }

  nextTurn(): void {
    const encounter = this.requireEncounter();
    const queue = encounter.initiativeQueue;
    const ids = queue.orderedIds;

    if (ids.length === 0) {
      encounter.activeCombatantId = null;
      void this.repository.replace({ ...encounter });
      return;
    }

    const currentId = encounter.activeCombatantId;
    const currentIndex = currentId ? ids.indexOf(currentId) : -1;
    const isWrappingToNewRound =
      currentId === null || (currentIndex >= 0 && currentIndex === ids.length - 1);

    if (isWrappingToNewRound && queue.dirty) {
      this.commitPendingInitiatives(encounter);
      this.sortQueue(encounter);
      encounter.initiativeQueue.dirty = false;
      encounter.activeCombatantId = encounter.initiativeQueue.orderedIds[0] ?? null;

      void this.repository.replace({ ...encounter });
      this.dispatcher.publish(CombatEvent.QueueRebuilt, {});
      this.dispatcher.publish(CombatEvent.InitiativeCommitted, {});
      if (encounter.activeCombatantId) {
        this.dispatcher.publish(CombatEvent.TurnAdvanced, {
          combatantId: encounter.activeCombatantId,
        });
      }
      return;
    }

    if (!currentId) {
      encounter.activeCombatantId = ids[0] ?? null;
    } else {
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ids.length : 0;
      encounter.activeCombatantId = ids[nextIndex] ?? null;
    }

    void this.repository.replace({ ...encounter });
    if (encounter.activeCombatantId) {
      this.dispatcher.publish(CombatEvent.TurnAdvanced, {
        combatantId: encounter.activeCombatantId,
      });
    }
  }

  previousTurn(): void {
    const encounter = this.requireEncounter();
    const ids = encounter.initiativeQueue.orderedIds;
    if (ids.length === 0) {
      encounter.activeCombatantId = null;
      void this.repository.replace({ ...encounter });
      return;
    }

    const currentId = encounter.activeCombatantId;
    if (!currentId) {
      encounter.activeCombatantId = ids[ids.length - 1] ?? null;
    } else {
      const index = ids.indexOf(currentId);
      const previousIndex = index >= 0 ? (index - 1 + ids.length) % ids.length : ids.length - 1;
      encounter.activeCombatantId = ids[previousIndex] ?? null;
    }

    void this.repository.replace({ ...encounter });
    if (encounter.activeCombatantId) {
      this.dispatcher.publish(CombatEvent.TurnReversed, {
        combatantId: encounter.activeCombatantId,
      });
    }
  }

  rebuildQueueIfDirty(): void {
    const encounter = this.repository.get();
    if (!encounter?.initiativeQueue.dirty) {
      return;
    }
    this.commitPendingInitiatives(encounter);
    this.sortQueue(encounter);
    encounter.initiativeQueue.dirty = false;
    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.QueueRebuilt, {});
  }

  getOrderedIds(): string[] {
    return this.repository.get()?.initiativeQueue.orderedIds ?? [];
  }

  private commitPendingInitiatives(encounter: CombatEncounter): void {
    for (const sheet of encounter.participants) {
      if (sheet.initiative.dirty) {
        sheet.initiative = commitInitiative(sheet.initiative);
      }
    }
  }

  private sortQueue(encounter: CombatEncounter): void {
    const sheetsById = new Map(encounter.participants.map((sheet) => [sheet.id, sheet]));
    encounter.initiativeQueue.orderedIds = [...encounter.initiativeQueue.orderedIds]
      .filter((id) => sheetsById.has(id))
      .sort((leftId, rightId) => {
        const left = sheetsById.get(leftId)!;
        const right = sheetsById.get(rightId)!;
        const initiativeDiff = right.initiative.current - left.initiative.current;
        if (initiativeDiff !== 0) {
          return initiativeDiff;
        }
        return getSheetCreationOrder(left) - getSheetCreationOrder(right);
      });
  }

  private requireEncounter(): CombatEncounter {
    const encounter = this.repository.get();
    if (!encounter) {
      throw new Error("Encounter does not exist.");
    }
    return encounter;
  }
}

export function createEmptyEncounter(id: string): CombatEncounter {
  return createCombatEncounter(id);
}
