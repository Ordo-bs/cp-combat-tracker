import { Notice } from "obsidian";
import { useState } from "react";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import type { CombatActionResult } from "../../actions/CombatActionResult";
import type { SaveResolutionResult } from "../../domain/rules/resolvers/StunResolver";
import { isNpcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { CloneInitiativeOption } from "../../services/CombatSheetFactory";
import { openExistingCombatSheetEditor } from "../../infrastructure/obsidian/openCombatSheetEditor";
import { useObsidianApp } from "../context/AppContext";
import { usePluginContext } from "../context/EncounterContext";
import type { UiElement } from "../types";

function runAction(
  execute: (action: ReturnType<typeof createAction>) => CombatActionResult<unknown>,
  request: Parameters<typeof createAction>[0],
  onSuccess?: (result: CombatActionResult<unknown>) => void,
): void {
  const result = execute(createAction(request));
  if (!result.success && result.errors.length > 0) {
    new Notice(result.errors[0] ?? "Action failed.");
    return;
  }
  onSuccess?.(result);
}

interface NpcControlsProps {
  sheet: CombatSheet;
  onOpenHitCalculator: () => void;
}

export function NpcControls({ sheet, onOpenHitCalculator }: NpcControlsProps): UiElement | null {
  const { actionExecutor } = usePluginContext();

  if (!isNpcSheet(sheet)) {
    return null;
  }

  const canConsume = (amount: number): boolean => sheet.ammo.remainingShots >= amount;

  const handleSaveNotice = (label: string, result: CombatActionResult<unknown>): void => {
    const data = result.data as SaveResolutionResult | undefined;
    if (!data) {
      return;
    }
    const { roll, threshold, succeeded } = data;
    const outcome = succeeded ? "passed" : "failed";
    new Notice(`${label} save: rolled ${roll} vs ${threshold} — ${outcome}.`);
  };

  return (
    <div className="cp-card__npc-controls">
      <div className="cp-card__ammo-summary">
        Shots: {sheet.ammo.remainingShots}/{sheet.ammo.maximumShots} · Mags:{" "}
        {sheet.ammo.remainingMagazines}
      </div>
      <div className="cp-card__button-row">
        <button
          type="button"
          onClick={() =>
            runAction(actionExecutor.execute.bind(actionExecutor), {
              type: ActionType.ConsumeAmmo,
              combatantId: sheet.id,
              amount: 1,
            })
          }
          disabled={!canConsume(1)}
          title={!canConsume(1) ? "Insufficient ammunition." : undefined}
        >
          -1
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(actionExecutor.execute.bind(actionExecutor), {
              type: ActionType.ConsumeAmmo,
              combatantId: sheet.id,
              amount: 3,
            })
          }
          disabled={!canConsume(3)}
          title={!canConsume(3) ? "Insufficient ammunition." : undefined}
        >
          -3
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(actionExecutor.execute.bind(actionExecutor), {
              type: ActionType.ConsumeAmmo,
              combatantId: sheet.id,
              amount: 10,
            })
          }
          disabled={!canConsume(10)}
          title={!canConsume(10) ? "Insufficient ammunition." : undefined}
        >
          -10
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(actionExecutor.execute.bind(actionExecutor), {
              type: ActionType.ReloadWeapon,
              combatantId: sheet.id,
            })
          }
          disabled={sheet.ammo.remainingMagazines <= 0}
          title={sheet.ammo.remainingMagazines <= 0 ? "No magazines remaining." : undefined}
        >
          Reload
        </button>
      </div>
      <div className="cp-card__button-row">
        <button
          type="button"
          onClick={() =>
            runAction(
              actionExecutor.execute.bind(actionExecutor),
              { type: ActionType.OpenHitCalculator, combatantId: sheet.id },
              () => onOpenHitCalculator(),
            )
          }
        >
          Hit
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(
              actionExecutor.execute.bind(actionExecutor),
              { type: ActionType.PerformStunSave, combatantId: sheet.id },
              (result) => handleSaveNotice("Stun", result),
            )
          }
        >
          Stun
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(
              actionExecutor.execute.bind(actionExecutor),
              { type: ActionType.PerformDeathSave, combatantId: sheet.id },
              (result) => handleSaveNotice("Death", result),
            )
          }
        >
          Death
        </button>
      </div>
    </div>
  );
}

interface CardActionsProps {
  sheet: CombatSheet;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function CardActions({
  sheet,
  isExpanded,
  onToggleExpand,
}: CardActionsProps): UiElement {
  const app = useObsidianApp();
  const { combatService } = usePluginContext();

  const handleEdit = (): void => {
    void openExistingCombatSheetEditor(app, sheet.id);
  };

  const handleDelete = (): void => {
    const confirmed = confirm(`Remove "${sheet.name}" from encounter?`);
    if (!confirmed) {
      return;
    }
    const result = combatService.removeCombatant(sheet.id);
    if (!result.valid) {
      new Notice(result.errors.join(" "));
    }
  };

  const handleCopy = (): void => {
    const result = combatService.cloneCombatant(sheet.id, CloneInitiativeOption.REROLL);
    if (!result.valid) {
      new Notice(result.errors.join(" "));
    }
  };

  return (
    <div className="cp-card__actions">
      <button type="button" onClick={onToggleExpand} aria-expanded={isExpanded}>
        {isExpanded ? "Collapse" : "Expand"}
      </button>
      <button type="button" onClick={handleEdit}>
        Edit
      </button>
      <button type="button" onClick={handleCopy} title="Copy combatant">
        Copy
      </button>
      <button type="button" onClick={handleDelete} title="Delete combatant">
        Delete
      </button>
    </div>
  );
}

interface InitiativeEditorProps {
  sheet: CombatSheet;
}

export function InitiativeEditor({ sheet }: InitiativeEditorProps): UiElement {
  const { initiativeService } = usePluginContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(sheet.initiative.pending));

  const displayValue = sheet.initiative.dirty
    ? `${sheet.initiative.pending}*`
    : String(sheet.initiative.current);

  const commit = (): void => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      new Notice("Invalid initiative.");
      setDraft(String(sheet.initiative.pending));
      setEditing(false);
      return;
    }
    const ok = initiativeService.updatePending(sheet.id, parsed);
    if (!ok) {
      new Notice("Invalid initiative.");
      setDraft(String(sheet.initiative.pending));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="cp-card__initiative-input"
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
          if (event.key === "Escape") {
            setDraft(String(sheet.initiative.pending));
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="cp-card__initiative"
      onClick={() => {
        setDraft(String(sheet.initiative.pending));
        setEditing(true);
      }}
      title="Edit initiative (reorders when a new round begins)"
    >
      Init {displayValue}
    </button>
  );
}
