import { useLayoutEffect, useRef } from "react";
import { Notice, setIcon } from "obsidian";
import { blurActiveElement, openConfirmModal } from "../../infrastructure/obsidian/ConfirmModal";
import type { UiElement } from "../types";
import {
  getActiveSheet,
  getOrderedCombatants,
  hasCombatants,
  isQueueDirty,
} from "../selectors/encounterSelectors";
import { hasUnresolvedPendingEffects } from "../../domain/damage/sheetEffects";
import { useEncounter, usePluginContext } from "../context/EncounterContext";
import { useObsidianApp } from "../context/AppContext";
import { openNewCombatSheetEditor } from "../../infrastructure/obsidian/openCombatSheetEditor";
import { IconButton } from "../editor/EditorFields";

export function SidebarToolbar(): UiElement {
  const app = useObsidianApp();
  const encounter = useEncounter();
  const { initiativeService, encounterService } = usePluginContext();

  const clearIconRef = useRef<HTMLSpanElement>(null);
  const combatantsExist = hasCombatants(encounter);
  const active = getActiveSheet(encounter);
  const pendingEffects = active ? hasUnresolvedPendingEffects(active) : false;

  useLayoutEffect(() => {
    if (clearIconRef.current) {
      setIcon(clearIconRef.current, "eraser");
    }
  });

  const handleAdd = (): void => {
    void openNewCombatSheetEditor(app);
  };

  const handlePrevious = (): void => {
    initiativeService.previousTurn();
  };

  const handleNext = (): void => {
    const advanced = initiativeService.nextTurn();
    if (!advanced) {
      new Notice("Resolve pending effects before advancing.");
      return;
    }
    for (const message of initiativeService.takeSpeedwareExpiryNotices()) {
      new Notice(message);
    }
  };

  const handleClear = (): void => {
    if (!combatantsExist) {
      return;
    }
    blurActiveElement();
    void openConfirmModal(app, {
      title: "Clear encounter",
      message: "Clear the encounter? Player characters will be kept.",
      confirmText: "Clear",
      destructive: true,
    }).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      encounterService.clearEncounter();
    });
  };

  return (
    <div className="cp-combat-tracker__toolbar">
      <div className="cp-combat-tracker__toolbar-row">
        <button type="button" className="mod-cta" onClick={handleAdd}>
          + Add
        </button>
        <IconButton
          icon="chevron-up"
          label="Previous"
          onClick={handlePrevious}
          disabled={!combatantsExist}
        />
        <IconButton
          icon="chevron-down"
          label="Next"
          onClick={handleNext}
          disabled={!combatantsExist || pendingEffects}
          title={pendingEffects ? "Resolve pending effects first." : "Next"}
        />
        <button
          type="button"
          className="cp-combat-tracker__clear"
          onClick={handleClear}
          disabled={!combatantsExist}
        >
          <span ref={clearIconRef} className="cp-icon-button-icon" aria-hidden="true" />
          Clear
        </button>
      </div>
      {isQueueDirty(encounter) && (
        <span className="cp-combat-tracker__dirty-indicator" title="Initiative updates apply when a new round begins">
          Initiative updates pending
        </span>
      )}
      {combatantsExist && encounter && (
        <span className="cp-combat-tracker__count">
          {getOrderedCombatants(encounter).length} combatants · Round {encounter.roundNumber}
        </span>
      )}
    </div>
  );
}
