import type { DamageRequest } from "../../domain/damage/DamageRequest";
import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { ActionType, type CombatAction } from "../CombatAction";
import type { CombatActionContext } from "../CombatActionContext";
import { actionFailure, actionSuccess } from "../CombatActionResult";

export class ResolveHitAction implements CombatAction<ResolutionResult> {
  readonly type = ActionType.ResolveHit;

  constructor(readonly request: DamageRequest) {}

  get combatantId(): string {
    return this.request.targetId;
  }

  execute(context: CombatActionContext) {
    const result = context.combatService.resolveHit(this.request);
    if (!result.success) {
      return actionFailure<ResolutionResult>(result.errors, result.warnings, result);
    }
    return actionSuccess(result, result.warnings);
  }
}
