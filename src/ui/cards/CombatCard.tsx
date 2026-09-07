import type { UiElement } from "../types";
import { memo, useCallback, useRef, useState } from "react";
import { isNpcSheet, isVehicleSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { usePluginContext } from "../context/EncounterContext";
import {
  CardActions,
  InitiativeEditor,
  NpcControls,
  VehicleControls,
} from "./CombatCardParts";
import { StatusBar } from "./StatusBar";
import { HitCalculator } from "./HitCalculator";
import { StunMenu } from "./StunMenu";
import { DeathMenu } from "./DeathMenu";
import { PendingEffects } from "./PendingEffects";
import { BodyPartStatusStrip } from "./BodyPartStatusStrip";

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
  const [showHit, setShowHit] = useState(false);
  const [showStun, setShowStun] = useState(false);
  const [showDeath, setShowDeath] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback((panel: "hit" | "stun" | "death"): void => {
    setExpanded(true);
    setShowHit(panel === "hit");
    setShowStun(panel === "stun");
    setShowDeath(panel === "death");
    requestAnimationFrame(() => {
      expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      expandedRef.current?.focus();
    });
  }, []);

  const isDead = isNpcSheet(sheet) && sheet.damage.isDead;

  return (
    <article
      className={`cp-card${isActive ? " cp-card--active" : ""}${expanded ? " cp-card--expanded" : ""}`}
    >
      <div className="cp-card__header">
        <h3 className="cp-card__name">{sheet.name}</h3>
        <InitiativeEditor sheet={sheet} />
      </div>

      <StatusBar sheet={sheet} damageThresholdService={damageThresholdService} />
      {isNpcSheet(sheet) && <BodyPartStatusStrip sheet={sheet} />}
      <PendingEffects sheet={sheet} isActive={isActive} />

      <NpcControls
        sheet={sheet}
        onOpenHitCalculator={() => openPanel("hit")}
        onOpenStun={() => openPanel("stun")}
        onOpenDeath={() => openPanel("death")}
        isDead={isDead}
      />
      <VehicleControls sheet={sheet} onOpenHitCalculator={() => openPanel("hit")} />

      {expanded && (showHit || showStun || showDeath) && (
        <div
          ref={expandedRef}
          className="cp-card__expanded"
          tabIndex={-1}
          aria-label="Hit calculator"
        >
          {showHit && <HitCalculator sheet={sheet} />}
          {showStun && isNpcSheet(sheet) && !isDead && (
            <StunMenu combatantId={sheet.id} onClose={() => setShowStun(false)} />
          )}
          {showDeath && isNpcSheet(sheet) && !isDead && (
            <DeathMenu combatantId={sheet.id} onClose={() => setShowDeath(false)} />
          )}
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
