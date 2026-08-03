import type { SaveResolutionResult } from "../../domain/rules/resolvers/StunResolver";
import { findCombatSheet } from "../../domain/combat/CombatEncounter";
import { isNpcSheet } from "../../domain/sheets/CombatSheet";
import { StatusType } from "../../domain/status/StatusType";
import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { actionFailure, actionSuccess } from "../CombatActionResult";

export class PerformStunSaveAction implements CombatAction<SaveResolutionResult> {
  readonly type = ActionType.PerformStunSave;

  constructor(readonly combatantId: string) {}

  execute(context: CombatActionContext) {
    const encounter = context.combatService.getEncounter();
    const sheet = findCombatSheet(encounter, this.combatantId);
    if (!sheet || !isNpcSheet(sheet)) {
      return actionFailure<SaveResolutionResult>(["NPC combat sheet required."]);
    }

    const derived = context.damageThresholdService.derive(
      sheet.damage.totalDamage,
      sheet.damage.baseStunSave,
      sheet.damage.baseDeathSave,
    );
    const roll = context.diceService.d10();
    const resolution = context.stunResolver.resolve(roll, derived.modifiedStunSave);

    if (resolution.statusChanged) {
      const statusResult = context.combatService.setCombatantStatus(
        this.combatantId,
        StatusType.STUNNED,
        true,
      );
      if (!statusResult.valid) {
        return actionFailure<SaveResolutionResult>(statusResult.errors, statusResult.warnings);
      }
    }

    return actionSuccess(resolution);
  }
}
