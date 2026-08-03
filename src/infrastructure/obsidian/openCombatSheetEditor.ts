import type { App } from "obsidian";
import { COMBAT_SHEET_EDITOR_VIEW_TYPE } from "../../constants/viewTypes";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import type { CombatSheetEditorViewState } from "../../ui/editor/editorTypes";

export async function openCombatSheetEditor(
  app: App,
  state: CombatSheetEditorViewState,
): Promise<void> {
  const leaf = app.workspace.getLeaf("tab");
  await leaf.setViewState({
    type: COMBAT_SHEET_EDITOR_VIEW_TYPE,
    active: true,
    state: {
      mode: state.mode,
      combatantId: state.combatantId,
      sheetType: state.sheetType ?? CombatSheetType.NPC,
      draftSheet: state.draftSheet,
    },
  });
  app.workspace.revealLeaf(leaf);
}

export async function openNewCombatSheetEditor(app: App): Promise<void> {
  await openCombatSheetEditor(app, { mode: "draft", sheetType: CombatSheetType.NPC });
}

export async function openDraftCombatSheetEditor(app: App, draftSheet: CombatSheet): Promise<void> {
  await openCombatSheetEditor(app, {
    mode: "draft",
    sheetType: draftSheet.sheetType,
    draftSheet,
  });
}

export async function openExistingCombatSheetEditor(
  app: App,
  combatantId: string,
): Promise<void> {
  await openCombatSheetEditor(app, { mode: "existing", combatantId });
}
