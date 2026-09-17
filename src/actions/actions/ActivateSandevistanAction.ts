import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { actionFailure, actionSuccess } from "../CombatActionResult";

export class ActivateSandevistanAction implements CombatAction<ResolutionResult> {
  readonly type = ActionType.ActivateSandevistan;

  constructor(readonly combatantId: string) {}

  execute(context: CombatActionContext) {
    const result = context.combatService.activateSandevistan(this.combatantId);
    if (!result.success) {
      return actionFailure<ResolutionResult>(result.errors, result.warnings, result);
    }
    return actionSuccess(result, result.warnings);
  }
}
