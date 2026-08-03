import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { fromValidationResult } from "../CombatActionResult";

export class ConsumeAmmoAction implements CombatAction {
  readonly type = ActionType.ConsumeAmmo;

  constructor(
    readonly combatantId: string,
    readonly roundsFired: number,
  ) {}

  execute(context: CombatActionContext) {
    const result = context.combatService.consumeAmmo(this.combatantId, this.roundsFired);
    return fromValidationResult(result.valid, result.errors, result.warnings);
  }
}
