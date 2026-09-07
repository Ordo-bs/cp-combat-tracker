import { Notice } from "obsidian";
import { useState } from "react";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { usePluginContext } from "../context/EncounterContext";
import type { UiElement } from "../types";
import { ResolutionMessage } from "./ResolutionMessage";

interface DeathMenuProps {
  combatantId: string;
  onClose: () => void;
}

export function DeathMenu({ combatantId, onClose }: DeathMenuProps): UiElement {
  const { actionExecutor } = usePluginContext();
  const [result, setResult] = useState<ResolutionResult | null>(null);

  const apply = (): void => {
    const actionResult = actionExecutor.execute(
      createAction({ type: ActionType.PerformDeathSave, combatantId }),
    );
    if (!actionResult.success) {
      new Notice(actionResult.errors[0] ?? "Death save failed.");
      return;
    }
    const data = actionResult.data as ResolutionResult;
    setResult(data);
    new Notice(data.summary);
  };

  return (
    <div className="cp-inline-menu">
      <div className="cp-card__button-row">
        <button type="button" className="mod-cta" onClick={apply}>
          Roll Death Save
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {result && <ResolutionMessage result={result} />}
    </div>
  );
}
