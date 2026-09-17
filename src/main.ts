import { Plugin } from "obsidian";
import {
  COMBAT_SHEET_EDITOR_VIEW_TYPE,
  INITIATIVE_SIDEBAR_VIEW_TYPE,
} from "./constants/viewTypes";
import { CombatSheetEditorView } from "./infrastructure/obsidian/CombatSheetEditorView";
import { registerCombatSheetBlockProcessor } from "./infrastructure/obsidian/CombatSheetBlockProcessor";
// @deprecated Used by the removed From Note command.
// import { Notice } from "obsidian";
// import { openDraftCombatSheetEditor } from "./infrastructure/obsidian/openCombatSheetEditor";
import { InitiativeSidebarView } from "./infrastructure/obsidian/InitiativeSidebarView";
import { PluginContext } from "./plugin/PluginContext";

export default class CPCombatTrackerPlugin extends Plugin {
  private pluginContext!: PluginContext;

  async onload(): Promise<void> {
    this.pluginContext = new PluginContext(this);
    await this.pluginContext.initialize();

    this.registerView(
      INITIATIVE_SIDEBAR_VIEW_TYPE,
      (leaf) => new InitiativeSidebarView(leaf, this.pluginContext),
    );

    this.registerView(
      COMBAT_SHEET_EDITOR_VIEW_TYPE,
      (leaf) => new CombatSheetEditorView(leaf, this.pluginContext),
    );
    this.addRibbonIcon("swords", "Open Combat Tracker", () => {
      void this.activateInitiativeSidebar();
    });

    this.addCommand({
      id: "open-combat-tracker",
      name: "Open Combat Tracker sidebar",
      callback: () => {
        void this.activateInitiativeSidebar();
      },
    });

    // @deprecated From Note was removed from the combat tracker toolbar.
    // this.addCommand({
    //   id: "add-combatant-from-note",
    //   name: "Add combatant from current note",
    //   callback: () => {
    //     void this.addCombatantFromActiveNote();
    //   },
    // });

    registerCombatSheetBlockProcessor(this, this.pluginContext);
  }

  // @deprecated Used by the removed From Note toolbar button / command.
  // private async addCombatantFromActiveNote(): Promise<void> {
  //   const { templateService } = this.pluginContext;
  //   const { sheet, errors } = await templateService.instantiateFromActiveNote(this.app);
  //   if (errors.length > 0 || !sheet) {
  //     new Notice(errors[0] ?? "Failed to parse template.");
  //     return;
  //   }
  //   await openDraftCombatSheetEditor(this.app, sheet);
  // }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(INITIATIVE_SIDEBAR_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(COMBAT_SHEET_EDITOR_VIEW_TYPE);
    await this.pluginContext.shutdown();
  }
  private async activateInitiativeSidebar(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(INITIATIVE_SIDEBAR_VIEW_TYPE)[0];
    if (!leaf) {
      await workspace.getRightLeaf(false)?.setViewState({
        type: INITIATIVE_SIDEBAR_VIEW_TYPE,
        active: true,
      });
      leaf = workspace.getLeavesOfType(INITIATIVE_SIDEBAR_VIEW_TYPE)[0];
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
