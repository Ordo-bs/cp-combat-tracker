import type { UiElement } from "../types";
import { memo, useCallback, useRef, useState } from "react";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import { isNpcSheet, isPcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { usePluginContext } from "../context/EncounterContext";
import { IconButton, ObsidianIcon } from "../editor/EditorFields";
import {
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
  const typeIcon = sheetTypeIcon(sheet.sheetType);

  return (
    <article
      className={`cp-card${isActive ? " cp-card--active" : ""}${expanded ? " cp-card--expanded" : ""}`}
    >
      <div className="cp-card__header">
        <div className="cp-card__identity">
          <IconButton
            className="cp-card__expand"
            icon={expanded ? "chevron-down" : "chevron-right"}
            label={expanded ? "Collapse" : "Expand"}
            ariaExpanded={expanded}
            onClick={toggleExpand}
          />
          <span className="cp-card__type" title={typeIcon.label} aria-label={typeIcon.label}>
            <ObsidianIcon icon={typeIcon.icon} />
          </span>
          <h3 className="cp-card__name">{sheet.name}</h3>
        </div>
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

    </article>
  );
});

function sheetTypeIcon(sheetType: CombatSheet["sheetType"]): { icon: string; label: string } {
  switch (sheetType) {
    case CombatSheetType.PC:
      return { icon: "user", label: "Player character" };
    case CombatSheetType.NPC:
      return { icon: "cpu", label: "NPC" };
    case CombatSheetType.VEHICLE:
      return { icon: "car", label: "Vehicle" };
  }
}
