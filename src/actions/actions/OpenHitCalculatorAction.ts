import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { actionSuccess } from "../CombatActionResult";

export interface OpenHitCalculatorResult {
  combatantId: string;
  uiEffect: "open-hit-calculator";
}

export class OpenHitCalculatorAction implements CombatAction<OpenHitCalculatorResult> {
  readonly type = ActionType.OpenHitCalculator;

  constructor(readonly combatantId: string) {}

  execute(_context: CombatActionContext) {
    return actionSuccess<OpenHitCalculatorResult>({
      combatantId: this.combatantId,
      uiEffect: "open-hit-calculator",
    });
  }
}
