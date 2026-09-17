import { Notice } from "obsidian";
import type { CombatLogService } from "../services/CombatLogService";

/** Toast a combat-result summary and persist it to the encounter log. */
export function toastCombatResult(
  combatLog: CombatLogService,
  combatantId: string,
  text: string | undefined,
): void {
  if (!text) {
    return;
  }
  new Notice(text);
  combatLog.recordResult(combatantId, text);
}
