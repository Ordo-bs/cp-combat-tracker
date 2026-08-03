import type { CombatActionContext } from "./CombatActionContext";
import type { CombatActionResult } from "./CombatActionResult";

export interface CombatAction<TData = void> {
  readonly type: string;
  execute(context: CombatActionContext): CombatActionResult<TData>;
}

export const ActionType = {
  ConsumeAmmo: "consume-ammo",
  ReloadWeapon: "reload-weapon",
  PerformStunSave: "perform-stun-save",
  PerformDeathSave: "perform-death-save",
  OpenHitCalculator: "open-hit-calculator",
} as const;

export type ActionTypeName = (typeof ActionType)[keyof typeof ActionType];
