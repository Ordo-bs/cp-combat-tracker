import { Notice } from "obsidian";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import { pendingEffectsForActivation } from "../../domain/damage/sheetEffects";
import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import { usePluginContext } from "../context/EncounterContext";
import type { UiElement } from "../types";

interface PendingEffectsProps {
  sheet: CombatSheet;
  isActive: boolean;
}

export function PendingEffects({ sheet, isActive }: PendingEffectsProps): UiElement | null {
  const { actionExecutor } = usePluginContext();
  if (!isActive) {
    return null;
  }
  const pending = pendingEffectsForActivation(sheet);
  if (pending.length === 0) {
    return null;
  }
  const fire = pending.filter((effect) => effect.type === "fire").length;
  const acid = pending.filter((effect) => effect.type === "acid").length;

  const apply = (): void => {
    const result = actionExecutor.execute(
      createAction({ type: ActionType.ApplyOngoingEffects, combatantId: sheet.id }),
    );
    if (!result.success) {
      new Notice(result.errors[0] ?? "Could not apply effects.");
      return;
    }
    const data = result.data as { summary?: string };
    if (data?.summary) {
      new Notice(data.summary);
    }
  };

  return (
    <div className="cp-pending-effects">
      <div className="cp-pending-effects__chips">
        {fire > 0 && <span className="cp-card__status-badge">Fire × {fire}</span>}
        {acid > 0 && <span className="cp-card__status-badge">Acid × {acid}</span>}
      </div>
      <button type="button" className="mod-cta" onClick={apply}>
        Apply Effects
      </button>
    </div>
  );
}
