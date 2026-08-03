import { SidebarToolbar } from "./SidebarToolbar";
import { InitiativeQueueList } from "./InitiativeQueueList";

import type { UiElement } from "../types";

export function InitiativeSidebar(): UiElement {
  return (
    <div className="cp-combat-tracker">
      <header className="cp-combat-tracker__header">
        <h2 className="cp-combat-tracker__title">Combat Tracker</h2>
      </header>

      <SidebarToolbar />
      <InitiativeQueueList />
    </div>
  );
}
