import type { CombatEncounter } from "../../domain/combat/CombatEncounter";
import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import { findCombatSheet } from "../../domain/combat/CombatEncounter";

export function getOrderedCombatants(encounter: CombatEncounter | null): CombatSheet[] {
  if (!encounter) {
    return [];
  }
  const sheetsById = new Map(encounter.participants.map((sheet) => [sheet.id, sheet]));
  return encounter.initiativeQueue.orderedIds
    .map((id) => sheetsById.get(id))
    .filter((sheet): sheet is CombatSheet => sheet !== undefined);
}

export function getActiveSheet(encounter: CombatEncounter | null): CombatSheet | undefined {
  if (!encounter?.activeCombatantId) {
    return undefined;
  }
  return findCombatSheet(encounter, encounter.activeCombatantId);
}

export function isQueueDirty(encounter: CombatEncounter | null): boolean {
  return encounter?.initiativeQueue.dirty ?? false;
}

export function hasCombatants(encounter: CombatEncounter | null): boolean {
  return (encounter?.participants.length ?? 0) > 0;
}
