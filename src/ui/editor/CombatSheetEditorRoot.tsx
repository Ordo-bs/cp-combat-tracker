import { EncounterProvider } from "../context/EncounterContext";
import { CombatSheetEditor } from "./CombatSheetEditor";
import type { CombatSheetEditorViewState } from "./editorTypes";
import type { UiElement } from "../types";

interface CombatSheetEditorRootProps {
  viewState: CombatSheetEditorViewState;
  onClose: () => void;
}

export function CombatSheetEditorRoot({
  viewState,
  onClose,
}: CombatSheetEditorRootProps): UiElement {
  const editorKey =
    viewState.mode === "existing" ? `existing-${viewState.combatantId}` : "draft";

  return (
    <EncounterProvider>
      <CombatSheetEditor key={editorKey} viewState={viewState} onClose={onClose} />
    </EncounterProvider>
  );
}
