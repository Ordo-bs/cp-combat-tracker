import { Plugin } from "obsidian";
import {
  COMBAT_SHEET_EDITOR_VIEW_TYPE,
  INITIATIVE_SIDEBAR_VIEW_TYPE,
} from "./constants/viewTypes";
import { CombatSheetEditorView } from "./infrastructure/obsidian/CombatSheetEditorView";
import { registerCombatSheetBlockProcessor } from "./infrastructure/obsidian/CombatSheetBlockProcessor";
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
    this.addRibbonIcon("swords", "Open combat tracker", () => {
      void this.activateInitiativeSidebar();
    });

    this.addCommand({
      id: "open-combat-tracker",
      name: "Open combat tracker sidebar",
      callback: () => {
        void this.activateInitiativeSidebar();
      },
    });

    registerCombatSheetBlockProcessor(this, this.pluginContext);
  }

  onunload(): void {
    void this.pluginContext.shutdown();
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
      void workspace.revealLeaf(leaf);
    }
  }
}
