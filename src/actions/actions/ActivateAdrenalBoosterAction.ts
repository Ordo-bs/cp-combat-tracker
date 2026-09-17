import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { actionFailure, actionSuccess } from "../CombatActionResult";

export class ActivateAdrenalBoosterAction implements CombatAction<ResolutionResult> {
  readonly type = ActionType.ActivateAdrenalBooster;

  constructor(
    readonly combatantId: string,
    readonly rounds?: number,
  ) {}

  execute(context: CombatActionContext) {
    const result = context.combatService.activateAdrenalBooster(this.combatantId, this.rounds);
    if (!result.success) {
      return actionFailure<ResolutionResult>(result.errors, result.warnings, result);
    }
    return actionSuccess(result, result.warnings);
  }
}
