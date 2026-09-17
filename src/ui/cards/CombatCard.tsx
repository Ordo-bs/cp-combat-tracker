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
    requestAnimationFrame(() => {
      expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      expandedRef.current?.focus();
    });
  }, []);

  const closePanels = useCallback((): void => {
    setShowHit(false);
    setShowStun(false);
    setShowAdrenal(false);
    setExpanded(false);
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
        onOpenStunWithModifier={() => openPanel("stun")}
        isDead={isDead}
      />
      <PcControls sheet={sheet} onOpenAdrenal={() => openPanel("adrenal")} />
      <VehicleControls sheet={sheet} onOpenHitCalculator={() => openPanel("hit")} />

      {expanded && (showHit || showStun || showAdrenal) && (
        <div
          ref={expandedRef}
          className="cp-card__expanded"
          tabIndex={-1}
          aria-label="Hit calculator"
        >
          {showHit && <HitCalculator sheet={sheet} onApplied={closePanels} />}
          {showStun && isNpcSheet(sheet) && !isDead && (
            <StunMenu combatantId={sheet.id} onClose={closePanels} />
          )}
          {showAdrenal && isPcSheet(sheet) && (
            <AdrenalBoosterMenu combatantId={sheet.id} onClose={closePanels} />
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
