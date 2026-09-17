import { ActionType, type CombatAction } from "./CombatAction";
import { ConsumeAmmoAction } from "./actions/ConsumeAmmoAction";
import { OpenHitCalculatorAction } from "./actions/OpenHitCalculatorAction";
import { PerformDeathSaveAction } from "./actions/PerformDeathSaveAction";
import { PerformStunSaveAction } from "./actions/PerformStunSaveAction";
import { ReloadWeaponAction } from "./actions/ReloadWeaponAction";
import { ResolveHitAction } from "./actions/ResolveHitAction";
import { ApplyOngoingEffectsAction } from "./actions/ApplyOngoingEffectsAction";
import type { DamageRequest } from "../domain/damage/DamageRequest";

export { ActionType };

export type ActionRequest =
  | { type: typeof ActionType.ConsumeAmmo; combatantId: string; amount: number }
  | { type: typeof ActionType.ReloadWeapon; combatantId: string }
  | { type: typeof ActionType.PerformStunSave; combatantId: string; additionalPenalty?: number }
  | { type: typeof ActionType.PerformDeathSave; combatantId: string; useBaseSave?: boolean }
  | { type: typeof ActionType.OpenHitCalculator; combatantId: string }
  | { type: typeof ActionType.ResolveHit; request: DamageRequest }
  | { type: typeof ActionType.ApplyOngoingEffects; combatantId: string };

export function createAction(request: ActionRequest): CombatAction<unknown> {
  switch (request.type) {
    case ActionType.ConsumeAmmo:
      return new ConsumeAmmoAction(request.combatantId, request.amount);
    case ActionType.ReloadWeapon:
      return new ReloadWeaponAction(request.combatantId);
    case ActionType.PerformStunSave:
      return new PerformStunSaveAction(request.combatantId, request.additionalPenalty ?? 0);
    case ActionType.PerformDeathSave:
      return new PerformDeathSaveAction(request.combatantId, request.useBaseSave ?? false);
    case ActionType.OpenHitCalculator:
      return new OpenHitCalculatorAction(request.combatantId);
    case ActionType.ResolveHit:
      return new ResolveHitAction(request.request);
    case ActionType.ApplyOngoingEffects:
      return new ApplyOngoingEffectsAction(request.combatantId);
  }
}
