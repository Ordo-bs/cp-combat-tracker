import type { UiElement } from "../types";
import { memo, useCallback, useRef, useState } from "react";
import { isNpcSheet, isPcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { usePluginContext } from "../context/EncounterContext";
import {
  CardActions,
  InitiativeEditor,
  NpcControls,
  PcControls,
  VehicleControls,
} from "./CombatCardParts";
import { StatusBar } from "./StatusBar";
import { HitCalculator } from "./HitCalculator";
import { StunMenu } from "./StunMenu";
import { AdrenalBoosterMenu } from "./AdrenalBoosterMenu";
import { PendingEffects } from "./PendingEffects";
import { BodyPartStatusStrip } from "./BodyPartStatusStrip";
import { CardExpandedDetails } from "./CardExpandedDetails";

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
  const [showAdrenal, setShowAdrenal] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback((panel: "hit" | "stun" | "adrenal"): void => {
    setExpanded(true);
    setShowHit(panel === "hit");
    setShowStun(panel === "stun");
    setShowAdrenal(panel === "adrenal");
    window.requestAnimationFrame(() => {
      expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      expandedRef.current?.focus();
    });
  }, []);

  const closePanels = useCallback((): void => {
    setShowHit(false);
    setShowStun(false);
    setShowAdrenal(false);
  }, []);

  const collapse = useCallback((): void => {
    closePanels();
    setExpanded(false);
  }, [closePanels]);

  const toggleExpand = useCallback((): void => {
    if (expanded) {
      collapse();
      return;
    }
    closePanels();
    setExpanded(true);
  }, [expanded, collapse, closePanels]);

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
        onOpenStunWithModifier={() => openPanel("stun")}
        isDead={isDead}
      />
      <PcControls sheet={sheet} onOpenAdrenal={() => openPanel("adrenal")} />
      <VehicleControls sheet={sheet} onOpenHitCalculator={() => openPanel("hit")} />

      {expanded && (
        <div
          ref={expandedRef}
          className="cp-card__expanded"
          tabIndex={-1}
          aria-label={showHit ? "Hit calculator" : "Card details"}
        >
          {showHit && <HitCalculator sheet={sheet} onApplied={collapse} onClose={collapse} />}
          {showStun && isNpcSheet(sheet) && !isDead && (
            <StunMenu combatantId={sheet.id} onClose={collapse} />
          )}
          {showAdrenal && isPcSheet(sheet) && (
            <AdrenalBoosterMenu combatantId={sheet.id} onClose={collapse} />
          )}
          {!showHit && !showStun && !showAdrenal && (
            <CardExpandedDetails sheet={sheet} damageThresholdService={damageThresholdService} />
          )}
        </div>
      )}

      <CardActions
        sheet={sheet}
        isExpanded={expanded}
        onToggleExpand={toggleExpand}
      />
    </article>
  );
});
