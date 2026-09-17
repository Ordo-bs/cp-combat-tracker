import type { CombatSheet } from "../sheets/CombatSheet";
import type { InitiativeQueue } from "../initiative/InitiativeQueue";
import { emptyCombatLog, type CombatLogEntry } from "./CombatLog";

export interface CombatEncounter {
  id: string;
  participants: CombatSheet[];
  initiativeQueue: InitiativeQueue;
  activeCombatantId: string | null;
  createdAt: number;
  roundNumber: number;
  combatLog: CombatLogEntry[];
}

export function createCombatEncounter(id: string): CombatEncounter {
  return {
    id,
    participants: [],
    initiativeQueue: { orderedIds: [], dirty: false },
    activeCombatantId: null,
    createdAt: Date.now(),
    roundNumber: 1,
    combatLog: emptyCombatLog(),
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

const NUMBERED_NAME = /^(.*) \((\d+)\)$/;

/** First copy keeps the name; later copies become "Name (2)", "Name (3)", … */
export function uniqueCombatantName(requested: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames);
  if (!taken.has(requested)) {
    return requested;
  }

  const numbered = NUMBERED_NAME.exec(requested);
  const base = numbered?.[1] ?? requested;
  let n = numbered ? Number(numbered[2]) + 1 : 2;
  let candidate = `${base} (${n})`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})`;
  }
  return candidate;
}
