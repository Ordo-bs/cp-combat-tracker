import { Notice } from "obsidian";
import type { UiElement } from "../types";
import {
  getOrderedCombatants,
  hasCombatants,
  isQueueDirty,
} from "../selectors/encounterSelectors";
import { useEncounter, usePluginContext } from "../context/EncounterContext";
import { useObsidianApp } from "../context/AppContext";
import { openDraftCombatSheetEditor, openNewCombatSheetEditor } from "../../infrastructure/obsidian/openCombatSheetEditor";

export function SidebarToolbar(): UiElement {
  const app = useObsidianApp();
  const encounter = useEncounter();
  const { initiativeService, encounterService, templateService } = usePluginContext();

  const combatantsExist = hasCombatants(encounter);

  const handleAdd = (): void => {
    void openNewCombatSheetEditor(app);
  };

  const handleFromNote = async (): Promise<void> => {
    const { sheet, errors } = await templateService.instantiateFromActiveNote(app);
    if (errors.length > 0 || !sheet) {
      new Notice(errors[0] ?? "Failed to parse template.");
      return;
    }
    await openDraftCombatSheetEditor(app, sheet);
  };

  const handlePrevious = (): void => {
    initiativeService.previousTurn();
  };

  const handleNext = (): void => {
    initiativeService.nextTurn();
  };

  const handleClear = (): void => {
    encounterService.clearEncounter();
  };

  return (
    <div className="cp-combat-tracker__toolbar">
      <button type="button" className="mod-cta" onClick={handleAdd}>
        + Add
      </button>
      <button type="button" onClick={() => void handleFromNote()}>
        From Note
      </button>
      <button type="button" onClick={handlePrevious} disabled={!combatantsExist}>
        Previous
      </button>
      <button type="button" onClick={handleNext} disabled={!combatantsExist}>
        Next
      </button>
      <button type="button" onClick={handleClear} disabled={!combatantsExist}>
        Clear
      </button>
      {isQueueDirty(encounter) && (
        <span className="cp-combat-tracker__dirty-indicator" title="Initiative updates apply when a new round begins">
          Initiative updates pending
        </span>
      )}
      {combatantsExist && (
        <span className="cp-combat-tracker__count">
          {getOrderedCombatants(encounter).length} combatants
        </span>
      )}
    </div>
  );
}
