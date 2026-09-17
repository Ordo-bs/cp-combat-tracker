import { useState } from "react";
import type { UiElement } from "../types";
import { SidebarToolbar } from "./SidebarToolbar";
import { InitiativeQueueList } from "./InitiativeQueueList";
import { CombatLogView } from "./CombatLogView";

type SidebarTab = "tracker" | "log";

export function InitiativeSidebar(): UiElement {
  const [tab, setTab] = useState<SidebarTab>("tracker");

  return (
    <div className="cp-combat-tracker">
      <header className="cp-combat-tracker__header">
        <div className="cp-combat-tracker__tabs" role="tablist" aria-label="Combat sidebar">
          <button
            type="button"
            role="tab"
            className={`cp-combat-tracker__tab${tab === "tracker" ? " is-active" : ""}`}
            aria-selected={tab === "tracker"}
            onClick={() => setTab("tracker")}
          >
            Combat Tracker
          </button>
          <button
            type="button"
            role="tab"
            className={`cp-combat-tracker__tab${tab === "log" ? " is-active" : ""}`}
            aria-selected={tab === "log"}
            onClick={() => setTab("log")}
          >
            Combat Log
          </button>
        </div>
      </header>

      {tab === "tracker" ? (
        <>
          <SidebarToolbar />
          <InitiativeQueueList />
        </>
      ) : (
        <CombatLogView />
      )}
    </div>
  );
}
