import { Notice } from "obsidian";
import { useState } from "react";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { usePluginContext } from "../context/EncounterContext";
import type { UiElement } from "../types";
import { ResolutionMessage } from "./ResolutionMessage";

interface StunMenuProps {
  combatantId: string;
  onClose: () => void;
}

export function StunMenu({ combatantId, onClose }: StunMenuProps): UiElement {
  const { actionExecutor } = usePluginContext();
  const [penalty, setPenalty] = useState("0");
  const [result, setResult] = useState<ResolutionResult | null>(null);

  const apply = (): void => {
    const parsed = Number.parseInt(penalty, 10);
    const actionResult = actionExecutor.execute(
      createAction({
        type: ActionType.PerformStunSave,
        combatantId,
        additionalPenalty: Number.isInteger(parsed) ? parsed : 0,
      }),
    );
    if (!actionResult.success) {
      new Notice(actionResult.errors[0] ?? "Stun save failed.");
      return;
    }
    const data = actionResult.data as ResolutionResult;
    setResult(data);
    new Notice(data.summary);
  };

  return (
    <div className="cp-inline-menu">
      <label className="cp-hit-calculator__field">
        <span>Additional Stun Penalty</span>
        <input type="number" value={penalty} onChange={(event) => setPenalty(event.target.value)} />
      </label>
      <div className="cp-card__button-row">
        <button type="button" className="mod-cta" onClick={apply}>
          Roll Stun
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {result && <ResolutionMessage result={result} />}
    </div>
  );
}
