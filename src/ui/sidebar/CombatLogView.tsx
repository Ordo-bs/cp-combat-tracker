import type { UiElement } from "../types";
import { useEncounter } from "../context/EncounterContext";
import type { CombatLogEntry } from "../../domain/combat/CombatLog";

export function CombatLogView(): UiElement {
  const encounter = useEncounter();
  const entries = encounter?.combatLog ?? [];

  if (entries.length === 0) {
    return (
      <div className="cp-combat-tracker__empty">
        <p>No combat log entries yet.</p>
      </div>
    );
  }

  return (
    <ol className="cp-combat-log">
      {entries.map((entry) => (
        <li key={entry.id} className={`cp-combat-log__entry cp-combat-log__entry--${entry.kind}`}>
          <CombatLogEntryRow entry={entry} />
        </li>
      ))}
    </ol>
  );
}

function CombatLogEntryRow({ entry }: { entry: CombatLogEntry }): UiElement {
  if (entry.kind === "round" || !entry.combatantName) {
    return <div className="cp-combat-log__text">{entry.text}</div>;
  }

  return (
    <>
      <div className="cp-combat-log__name">{entry.combatantName}</div>
      <div className="cp-combat-log__text">{entry.text}</div>
    </>
  );
}
