import { ActionType, type CombatAction } from "./CombatAction";
import { ConsumeAmmoAction } from "./actions/ConsumeAmmoAction";
import { OpenHitCalculatorAction } from "./actions/OpenHitCalculatorAction";
import { PerformDeathSaveAction } from "./actions/PerformDeathSaveAction";
import { PerformStunSaveAction } from "./actions/PerformStunSaveAction";
import { ReloadWeaponAction } from "./actions/ReloadWeaponAction";

export { ActionType };

export type ActionRequest =
  | { type: typeof ActionType.ConsumeAmmo; combatantId: string; amount: number }
  | { type: typeof ActionType.ReloadWeapon; combatantId: string }
  | { type: typeof ActionType.PerformStunSave; combatantId: string }
  | { type: typeof ActionType.PerformDeathSave; combatantId: string }
  | { type: typeof ActionType.OpenHitCalculator; combatantId: string };

export function createAction(request: ActionRequest): CombatAction<unknown> {
  switch (request.type) {
    case ActionType.ConsumeAmmo:
      return new ConsumeAmmoAction(request.combatantId, request.amount);
    case ActionType.ReloadWeapon:
      return new ReloadWeaponAction(request.combatantId);
    case ActionType.PerformStunSave:
      return new PerformStunSaveAction(request.combatantId);
    case ActionType.PerformDeathSave:
      return new PerformDeathSaveAction(request.combatantId);
    case ActionType.OpenHitCalculator:
      return new OpenHitCalculatorAction(request.combatantId);
  }
}
