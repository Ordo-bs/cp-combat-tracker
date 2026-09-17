import { Notice } from "obsidian";
import { useEffect, useRef, useState } from "react";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import type { CombatActionResult } from "../../actions/CombatActionResult";
import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { isNpcSheet, isVehicleSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { CloneInitiativeOption } from "../../services/CombatSheetFactory";
import {
  blurActiveElement,
  blurIfDetached,
  openConfirmModal,
} from "../../infrastructure/obsidian/ConfirmModal";
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

function noticeSummary(result: CombatActionResult<unknown>): void {
  const data = result.data as ResolutionResult | undefined;
  if (data?.summary) {
    new Notice(data.summary);
  }
}

interface NpcControlsProps {
  sheet: CombatSheet;
  onOpenHitCalculator: () => void;
  onOpenStunWithModifier: () => void;
  isDead: boolean;
}

export function NpcControls({
  sheet,
  onOpenHitCalculator,
  onOpenStunWithModifier,
  isDead,
}: NpcControlsProps): UiElement | null {
  const { actionExecutor } = usePluginContext();

  if (!isNpcSheet(sheet)) {
    return null;
  }

  const canConsume = (amount: number): boolean => sheet.ammo.remainingShots >= amount;

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
              noticeSummary,
            )
          }
          disabled={isDead}
          title={isDead ? "Target is dead." : undefined}
        >
          Stun
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(
              actionExecutor.execute.bind(actionExecutor),
              { type: ActionType.PerformDeathSave, combatantId: sheet.id },
              noticeSummary,
            )
          }
          disabled={isDead}
          title={isDead ? "Target is dead." : undefined}
        >
          Death
        </button>
        <CardOverflowMenu combatantId={sheet.id} isDead={isDead} onOpenStun={onOpenStunWithModifier} />
      </div>
    </div>
  );
}

interface CardOverflowMenuProps {
  combatantId: string;
  isDead: boolean;
  onOpenStun: () => void;
}

export function CardOverflowMenu({ combatantId, isDead, onOpenStun }: CardOverflowMenuProps): UiElement {
  const { actionExecutor } = usePluginContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const rollMortalZero = (): void => {
    setOpen(false);
    runAction(
      actionExecutor.execute.bind(actionExecutor),
      { type: ActionType.PerformDeathSave, combatantId, useBaseSave: true },
      (result) => {
        noticeSummary(result);
      },
    );
  };

  return (
    <div className="cp-card__overflow" ref={rootRef}>
      <button
        type="button"
        className="cp-card__overflow-trigger"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="More actions"
      >
        ⋯
      </button>
      {open && (
        <div className="cp-card__overflow-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={isDead}
            title={isDead ? "Target is dead." : undefined}
            onClick={() => {
              setOpen(false);
              onOpenStun();
            }}
          >
            Stun save with modifier
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isDead}
            title={isDead ? "Target is dead." : undefined}
            onClick={rollMortalZero}
          >
            Mortal 0 save
          </button>
        </div>
      )}
    </div>
  );
}

interface VehicleControlsProps {
  sheet: CombatSheet;
  onOpenHitCalculator: () => void;
}

export function VehicleControls({ sheet, onOpenHitCalculator }: VehicleControlsProps): UiElement | null {
  const { actionExecutor } = usePluginContext();
  if (!isVehicleSheet(sheet)) {
    return null;
  }
  return (
    <div className="cp-card__npc-controls">
      <div className="cp-card__ammo-summary">
        SP {sheet.sp} · SDP {sheet.sdp}
        {sheet.isDestroyed ? " · Destroyed" : ""}
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
    blurActiveElement();
    void openConfirmModal(app, {
      title: "Remove combatant",
      message: `Remove "${sheet.name}" from encounter?`,
      confirmText: "Remove",
      destructive: true,
    }).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      const result = combatService.removeCombatant(sheet.id);
      if (!result.valid) {
        new Notice(result.errors.join(" "));
      }
      requestAnimationFrame(blurIfDetached);
    });
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
