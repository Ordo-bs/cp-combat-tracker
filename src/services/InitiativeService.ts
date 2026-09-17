import {
  createCombatEncounter,
  type CombatEncounter,
  findCombatSheet,
} from "../domain/combat/CombatEncounter";
import { commitInitiative, markInitiativePending } from "../domain/combat/Initiative";
import { createCombatLogEntry, prependCombatLogEntry } from "../domain/combat/CombatLog";
import { markQueueDirty } from "../domain/initiative/InitiativeQueue";
import { getSheetCreationOrder } from "../domain/sheets/CombatSheet";
import { hasUnresolvedPendingEffects } from "../domain/damage/sheetEffects";
import { tickSpeedware } from "../domain/status/speedware";
import { CombatEvent } from "../events/EventTypes";
import type { EventDispatcher } from "../events/EventDispatcher";
import type { IEncounterRepository } from "../infrastructure/repository/IEncounterRepository";
import type { IValidationService } from "./ValidationService";

export interface IInitiativeService {
  updatePending(combatantId: string, pending: number): boolean;
  insertCombatant(combatantId: string): void;
  removeCombatant(combatantId: string): void;
  nextTurn(): boolean;
  previousTurn(): void;
  rebuildQueueIfDirty(): void;
  getOrderedIds(): string[];
  takeSpeedwareExpiryNotices(): string[];
}

export class InitiativeService implements IInitiativeService {
  private speedwareExpiryNotices: string[] = [];

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

    const previousPending = sheet.initiative.pending;
    sheet.initiative = markInitiativePending(sheet.initiative, pending);
    encounter.initiativeQueue = markQueueDirty(encounter.initiativeQueue);

    if (pending !== previousPending) {
      prependCombatLogEntry(
        encounter,
        createCombatLogEntry({
          kind: "initiative",
          text: `Initiative ${previousPending} → ${pending} (applies next round)`,
          combatantId,
          combatantName: sheet.name,
        }),
      );
    }

    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.InitiativeUpdated, { combatantId, pending });
    if (pending !== previousPending) {
      this.dispatcher.publish(CombatEvent.CombatLogUpdated, {});
    }
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

  nextTurn(): boolean {
    this.speedwareExpiryNotices = [];
    const encounter = this.requireEncounter();
    const queue = encounter.initiativeQueue;
    const ids = queue.orderedIds;

    if (ids.length === 0) {
      encounter.activeCombatantId = null;
      void this.repository.replace({ ...encounter });
      return true;
    }

    const currentId = encounter.activeCombatantId;
    if (currentId) {
      const current = findCombatSheet(encounter, currentId);
      if (current && hasUnresolvedPendingEffects(current)) {
        return false;
      }
    }

    const currentIndex = currentId ? ids.indexOf(currentId) : -1;
    const wrappingFromLast = currentIndex >= 0 && currentIndex === ids.length - 1;
    const isWrappingToNewRound =
      currentId === null || wrappingFromLast;

    if (isWrappingToNewRound && queue.dirty) {
      if (wrappingFromLast) {
        this.beginNewRound(encounter);
      }
      this.commitPendingInitiatives(encounter);
      this.sortQueue(encounter);
      encounter.initiativeQueue.dirty = false;
      encounter.activeCombatantId = encounter.initiativeQueue.orderedIds[0] ?? null;
      this.incrementActivation(encounter);

      void this.repository.replace({ ...encounter });
      this.dispatcher.publish(CombatEvent.QueueRebuilt, {});
      this.dispatcher.publish(CombatEvent.InitiativeCommitted, {});
      if (wrappingFromLast) {
        this.dispatcher.publish(CombatEvent.CombatLogUpdated, {});
      }
      if (encounter.activeCombatantId) {
        this.dispatcher.publish(CombatEvent.TurnAdvanced, {
          combatantId: encounter.activeCombatantId,
        });
      }
      return true;
    }

    if (wrappingFromLast) {
      this.beginNewRound(encounter);
      if (!queue.dirty) {
        this.sortQueue(encounter);
      }
    }

    if (!currentId) {
      encounter.activeCombatantId = ids[0] ?? null;
    } else {
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ids.length : 0;
      encounter.activeCombatantId = ids[nextIndex] ?? null;
    }

    this.incrementActivation(encounter);
    void this.repository.replace({ ...encounter });
    if (wrappingFromLast) {
      this.dispatcher.publish(CombatEvent.CombatLogUpdated, {});
    }
    if (encounter.activeCombatantId) {
      this.dispatcher.publish(CombatEvent.TurnAdvanced, {
        combatantId: encounter.activeCombatantId,
      });
    }
    return true;
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

  takeSpeedwareExpiryNotices(): string[] {
    const notices = this.speedwareExpiryNotices;
    this.speedwareExpiryNotices = [];
    return notices;
  }

  private beginNewRound(encounter: CombatEncounter): void {
    encounter.roundNumber += 1;
    prependCombatLogEntry(
      encounter,
      createCombatLogEntry({
        kind: "round",
        text: `Round ${encounter.roundNumber} begins`,
      }),
    );
    for (const sheet of encounter.participants) {
      const expired = tickSpeedware(sheet);
      for (const expiry of expired) {
        prependCombatLogEntry(
          encounter,
          createCombatLogEntry({
            kind: "result",
            text: expiry.text,
            combatantId: expiry.combatantId,
            combatantName: expiry.combatantName,
          }),
        );
        this.speedwareExpiryNotices.push(`${expiry.combatantName}: ${expiry.text}`);
      }
    }
  }

  private incrementActivation(encounter: CombatEncounter): void {
    if (!encounter.activeCombatantId) {
      return;
    }
    const sheet = findCombatSheet(encounter, encounter.activeCombatantId);
    if (sheet) {
      sheet.runtimeMetadata.activationSequence += 1;
    }
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
