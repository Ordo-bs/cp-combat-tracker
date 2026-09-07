import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { findCombatSheet } from "../../domain/combat/CombatEncounter";
import { isNpcSheet } from "../../domain/sheets/CombatSheet";
import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { actionFailure, actionSuccess } from "../CombatActionResult";

export class PerformStunSaveAction implements CombatAction<ResolutionResult> {
  readonly type = ActionType.PerformStunSave;

  constructor(
    readonly combatantId: string,
    readonly additionalPenalty = 0,
  ) {}

  execute(context: CombatActionContext) {
    const encounter = context.combatService.getEncounter();
    const sheet = findCombatSheet(encounter, this.combatantId);
    if (!sheet || !isNpcSheet(sheet)) {
      return actionFailure<ResolutionResult>(["NPC combat sheet required."]);
    }

    const result = context.combatService.resolveStun({
      targetId: this.combatantId,
      additionalPenalty: this.additionalPenalty,
    });
    if (!result.success) {
      return actionFailure<ResolutionResult>(result.errors, result.warnings, result);
    }
    return actionSuccess(result, result.warnings);
  }
}
