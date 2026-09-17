import { generateId } from "../../util/uuid";

export const COMBAT_LOG_CAP = 500;

export const COMBAT_LOG_KINDS = ["result", "round", "initiative"] as const;
export type CombatLogKind = (typeof COMBAT_LOG_KINDS)[number];

export interface CombatLogEntry {
  id: string;
  kind: CombatLogKind;
  text: string;
  combatantId?: string;
  combatantName?: string;
  createdAt: number;
}

export interface CombatLogEntryInput {
  kind: CombatLogKind;
  text: string;
  combatantId?: string;
  combatantName?: string;
  createdAt?: number;
}

export function createCombatLogEntry(input: CombatLogEntryInput): CombatLogEntry {
  const entry: CombatLogEntry = {
    id: generateId(),
    kind: input.kind,
    text: input.text,
    createdAt: input.createdAt ?? Date.now(),
  };
  if (input.combatantId) {
    entry.combatantId = input.combatantId;
  }
  if (input.combatantName) {
    entry.combatantName = input.combatantName;
  }
  return entry;
}

export function prependCombatLogEntry(
  encounter: { combatLog: CombatLogEntry[] },
  entry: CombatLogEntry,
): void {
  encounter.combatLog = [entry, ...encounter.combatLog].slice(0, COMBAT_LOG_CAP);
}

export function emptyCombatLog(): CombatLogEntry[] {
  return [];
}
