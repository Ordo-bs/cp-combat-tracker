import type { UiElement } from "../types";
import type { NpcCombatSheet } from "../../domain/sheets/CombatSheet";
import { BodyLocation } from "../../domain/sheets/components";

const SHORT: Record<BodyLocation, string> = {
  [BodyLocation.HEAD]: "Head",
  [BodyLocation.TORSO]: "Torso",
  [BodyLocation.RIGHT_ARM]: "RA",
  [BodyLocation.LEFT_ARM]: "LA",
  [BodyLocation.RIGHT_LEG]: "RL",
  [BodyLocation.LEFT_LEG]: "LL",
};

interface BodyPartStatusStripProps {
  sheet: NpcCombatSheet;
}

export function BodyPartStatusStrip({ sheet }: BodyPartStatusStripProps): UiElement | null {
  const flags = sheet.body.flatMap((part) => {
    const items: string[] = [];
    if (part.cybernetic && part.cyberneticProperties?.disabled) {
      items.push(`${SHORT[part.location]} dis`);
    }
    if (part.destroyed) {
      items.push(`${SHORT[part.location]} dest`);
    }
    return items;
  });
  if (flags.length === 0) {
    return null;
  }
  return (
    <div className="cp-card__part-flags">
      {flags.map((flag) => (
        <span key={flag} className="cp-card__status-badge">
          {flag}
        </span>
      ))}
    </div>
  );
}
