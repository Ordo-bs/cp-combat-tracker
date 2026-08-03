import type { UiElement } from "../types";
import { memo, useCallback, useRef, useState } from "react";
import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import { usePluginContext } from "../context/EncounterContext";
import {
  CardActions,
  InitiativeEditor,
  NpcControls,
} from "./CombatCardParts";
import { StatusBar } from "./StatusBar";

interface CombatCardProps {
  sheet: CombatSheet;
  isActive: boolean;
}

export const CombatCard = memo(function CombatCard({
  sheet,
  isActive,
}: CombatCardProps): UiElement {
  const { damageThresholdService } = usePluginContext();
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);

  const handleOpenHitCalculator = useCallback((): void => {
    setExpanded(true);
    requestAnimationFrame(() => {
      expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      expandedRef.current?.focus();
    });
  }, []);

  return (
    <article
      className={`cp-card${isActive ? " cp-card--active" : ""}${expanded ? " cp-card--expanded" : ""}`}
    >
      <div className="cp-card__header">
        <h3 className="cp-card__name">{sheet.name}</h3>
        <InitiativeEditor sheet={sheet} />
      </div>

      <StatusBar sheet={sheet} damageThresholdService={damageThresholdService} />

      <NpcControls sheet={sheet} onOpenHitCalculator={handleOpenHitCalculator} />

      {expanded && (
        <div
          ref={expandedRef}
          className="cp-card__expanded"
          tabIndex={-1}
          aria-label="Hit calculator placeholder"
        >
          <p className="cp-card__placeholder">Hit Calculator — coming in next milestone</p>
        </div>
      )}

      <CardActions
        sheet={sheet}
        isExpanded={expanded}
        onToggleExpand={() => setExpanded((value) => !value)}
      />
    </article>
  );
});
