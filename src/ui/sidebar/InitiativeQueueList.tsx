import type { UiElement } from "../types";
import { useEncounter } from "../context/EncounterContext";
import { getActiveSheet, getOrderedCombatants } from "../selectors/encounterSelectors";
import { CombatCard } from "../cards/CombatCard";

export function InitiativeQueueList(): UiElement {
  const encounter = useEncounter();
  const combatants = getOrderedCombatants(encounter);
  const activeSheet = getActiveSheet(encounter);

  if (combatants.length === 0) {
    return (
      <div className="cp-combat-tracker__empty">
        <p>No combatants.</p>
        <p className="cp-combat-tracker__hint">Click Add to begin.</p>
      </div>
    );
  }

  return (
    <div className="cp-combat-tracker__queue">
      {combatants.map((sheet) => (
        <CombatCard
          key={sheet.id}
          sheet={sheet}
          isActive={activeSheet?.id === sheet.id}
        />
      ))}
    </div>
  );
}
