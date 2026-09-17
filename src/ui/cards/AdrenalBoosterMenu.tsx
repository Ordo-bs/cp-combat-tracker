import { Notice } from "obsidian";
import { useState } from "react";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { usePluginContext } from "../context/EncounterContext";
import { toastCombatResult } from "../toastCombatResult";
import type { UiElement } from "../types";

interface AdrenalBoosterMenuProps {
  combatantId: string;
  onClose: () => void;
}

export function AdrenalBoosterMenu({ combatantId, onClose }: AdrenalBoosterMenuProps): UiElement {
  const { actionExecutor, combatLogService } = usePluginContext();
  const [rounds, setRounds] = useState("1");

  const apply = (): void => {
    const parsed = Number.parseInt(rounds, 10);
    const actionResult = actionExecutor.execute(
      createAction({
        type: ActionType.ActivateAdrenalBooster,
        combatantId,
        rounds: Number.isInteger(parsed) ? parsed : Number.NaN,
      }),
    );
    if (!actionResult.success) {
      new Notice(actionResult.errors[0] ?? "Adrenal booster failed.");
      return;
    }
    const data = actionResult.data as ResolutionResult;
    toastCombatResult(combatLogService, combatantId, data.summary);
    onClose();
  };

  return (
    <div className="cp-inline-menu">
      <label className="cp-hit-calculator__field">
        <span>Number of rounds</span>
        <input type="number" min={1} value={rounds} onChange={(event) => setRounds(event.target.value)} />
      </label>
      <div className="cp-card__button-row">
        <button type="button" className="mod-cta" onClick={apply}>
          Apply
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
