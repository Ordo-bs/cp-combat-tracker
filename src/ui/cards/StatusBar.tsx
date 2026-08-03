import type { UiElement } from "../types";
import { hasStatus } from "../../domain/status/Status";
import { StatusType } from "../../domain/status/StatusType";
import { WOUND_STATE_LABELS } from "../../domain/rules/WoundState";
import { isNpcSheet, isPcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import type { IDamageThresholdService } from "../../services/DamageThresholdService";

const STATUS_ICONS: Partial<Record<StatusType, string>> = {
  [StatusType.STUNNED]: "Stun",
  [StatusType.ON_FIRE]: "Fire",
  [StatusType.ACID]: "Acid",
  [StatusType.MARKED]: "Marked",
  [StatusType.DEAD]: "Dead",
  [StatusType.DESTROYED]: "Destroyed",
};

interface StatusBarProps {
  sheet: CombatSheet;
  damageThresholdService: IDamageThresholdService;
}

export function StatusBar({ sheet, damageThresholdService }: StatusBarProps): UiElement {
  const badges: string[] = [];

  for (const type of Object.values(StatusType)) {
    if (hasStatus(sheet.statuses, type)) {
      badges.push(STATUS_ICONS[type] ?? type);
    }
  }

  if (isPcSheet(sheet)) {
    badges.push(WOUND_STATE_LABELS[sheet.woundState].slice(0, 2).toUpperCase());
  }

  if (isNpcSheet(sheet)) {
    const derived = damageThresholdService.getWoundState(sheet.damage.totalDamage);
    badges.push(WOUND_STATE_LABELS[derived].slice(0, 2).toUpperCase());
  }

  if (badges.length === 0) {
    return <div className="cp-card__status-bar cp-card__status-bar--empty">—</div>;
  }

  return (
    <div className="cp-card__status-bar">
      {badges.map((badge) => (
        <span key={badge} className="cp-card__status-badge" title={badge}>
          {badge}
        </span>
      ))}
    </div>
  );
}
