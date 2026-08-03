import type { CombatSheet } from "../sheets/CombatSheet";
import type { InitiativeQueue } from "../initiative/InitiativeQueue";

export interface CombatEncounter {
  id: string;
  participants: CombatSheet[];
  initiativeQueue: InitiativeQueue;
  activeCombatantId: string | null;
  createdAt: number;
}

export function createCombatEncounter(id: string): CombatEncounter {
  return {
    id,
    participants: [],
    initiativeQueue: { orderedIds: [], dirty: false },
    activeCombatantId: null,
    createdAt: Date.now(),
  };
}

export function findCombatSheet(
  encounter: CombatEncounter,
  combatantId: string,
): CombatSheet | undefined {
  return encounter.participants.find((sheet) => sheet.id === combatantId);
}

export function isEncounterEmpty(encounter: CombatEncounter): boolean {
  return encounter.participants.length === 0;
}
