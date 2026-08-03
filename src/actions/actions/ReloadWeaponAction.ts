import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { fromValidationResult } from "../CombatActionResult";

export class ReloadWeaponAction implements CombatAction {
  readonly type = ActionType.ReloadWeapon;

  constructor(readonly combatantId: string) {}

  execute(context: CombatActionContext) {
    const result = context.combatService.reload(this.combatantId);
    return fromValidationResult(result.valid, result.errors, result.warnings);
  }
}
