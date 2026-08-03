import { CombatEvent } from "../events/EventTypes";
import type { CombatAction } from "./CombatAction";
import type { CombatActionContext } from "./CombatActionContext";
import { actionFailure, type CombatActionResult } from "./CombatActionResult";

export class CombatActionExecutor {
  constructor(private readonly context: CombatActionContext) {}

  execute<TData = unknown>(action: CombatAction<TData>): CombatActionResult<TData> {
    try {
      const result = action.execute(this.context);
      if (result.success) {
        this.context.dispatcher.publish(CombatEvent.CombatActionExecuted, {
          actionType: action.type,
          combatantId: this.extractCombatantId(action),
        });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected action failure.";
      return actionFailure<TData>([message]);
    }
  }

  private extractCombatantId(action: CombatAction<unknown>): string | undefined {
    if ("combatantId" in action && typeof action.combatantId === "string") {
      return action.combatantId;
    }
    return undefined;
  }
}
