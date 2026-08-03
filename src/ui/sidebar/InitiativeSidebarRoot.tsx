import { EncounterProvider } from "../context/EncounterContext";
import type { UiElement } from "../types";
import { InitiativeSidebar } from "./InitiativeSidebar";

export function InitiativeSidebarRoot(): UiElement {
  return (
    <EncounterProvider>
      <InitiativeSidebar />
    </EncounterProvider>
  );
}
