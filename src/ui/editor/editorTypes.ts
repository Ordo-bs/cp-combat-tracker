import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";

export type EditorMode = "draft" | "existing";

export interface CombatSheetEditorViewState {
  mode: EditorMode;
  /** Set when mode is existing. */
  combatantId?: string;
  /** Set when mode is draft (initial type). */
  sheetType?: CombatSheetType;
  /** Pre-populated draft sheet (e.g. from template instantiation). */
  draftSheet?: CombatSheet;
}
