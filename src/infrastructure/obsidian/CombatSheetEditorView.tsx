import { ItemView, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { COMBAT_SHEET_EDITOR_VIEW_TYPE } from "../../constants/viewTypes";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import type { PluginContext } from "../../plugin/PluginContext";
import { AppContext } from "../../ui/context/AppContext";
import { CombatSheetEditorRoot } from "../../ui/editor/CombatSheetEditorRoot";
import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import type { CombatSheetEditorViewState } from "../../ui/editor/editorTypes";

function normalizeViewState(state: unknown): CombatSheetEditorViewState {
  const partial = (state ?? {}) as Partial<CombatSheetEditorViewState>;
  return {
    mode: partial.mode ?? "draft",
    combatantId: partial.combatantId,
    sheetType: partial.sheetType ?? CombatSheetType.NPC,
    draftSheet: partial.draftSheet as CombatSheet | undefined,
  };
}

export class CombatSheetEditorView extends ItemView {
  private root: Root | null = null;
  private viewState: CombatSheetEditorViewState = {
    mode: "draft",
    sheetType: CombatSheetType.NPC,
  };

  constructor(
    leaf: WorkspaceLeaf,
    private readonly pluginContext: PluginContext,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return COMBAT_SHEET_EDITOR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.viewState.mode === "draft" ? "New Combat Sheet" : "Combat Sheet Editor";
  }

  getIcon(): string {
    return "swords";
  }

  getState(): Record<string, unknown> {
    return { ...this.viewState };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    this.viewState = normalizeViewState(state);
    await super.setState(state, result);
    if (this.root) {
      this.renderReact();
    }
  }

  async onOpen(): Promise<void> {
    const leafState = this.leaf.getViewState()?.state;
    if (leafState) {
      this.viewState = normalizeViewState(leafState);
    }
    this.renderReact();
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  private renderReact(): void {
    this.containerEl.empty();
    this.containerEl.addClass("cp-combat-sheet-editor-view");

    this.root = createRoot(this.containerEl);
    this.root.render(
      <AppContext.Provider value={{ app: this.app, pluginContext: this.pluginContext }}>
        <CombatSheetEditorRoot
          viewState={this.viewState}
          onClose={() => this.leaf.detach()}
        />
      </AppContext.Provider>,
    );
  }
}
