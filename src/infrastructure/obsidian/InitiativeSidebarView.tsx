import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { INITIATIVE_SIDEBAR_VIEW_TYPE } from "../../constants/viewTypes";
import type { PluginContext } from "../../plugin/PluginContext";
import { AppContext } from "../../ui/context/AppContext";
import { InitiativeSidebarRoot } from "../../ui/sidebar/InitiativeSidebarRoot";

export class InitiativeSidebarView extends ItemView {
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly pluginContext: PluginContext,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return INITIATIVE_SIDEBAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Combat Tracker";
  }

  getIcon(): string {
    return "swords";
  }

  async onOpen(): Promise<void> {
    this.containerEl.empty();
    this.containerEl.addClass("cp-combat-tracker-view");

    this.root = createRoot(this.containerEl);
    this.root.render(
      <AppContext.Provider
        value={{ app: this.app, pluginContext: this.pluginContext }}
      >
        <InitiativeSidebarRoot />
      </AppContext.Provider>,
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}
