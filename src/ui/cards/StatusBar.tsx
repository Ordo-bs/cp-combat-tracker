import type { UiElement } from "../types";
import { hasStatus } from "../../domain/status/Status";
import { StatusType } from "../../domain/status/StatusType";
import { WoundState, WOUND_STATE_LABELS } from "../../domain/rules/WoundState";
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

const WOUND_TOOLTIPS: Record<WoundState, string> = {
  [WoundState.NONE]: "No wounds",
  [WoundState.LIGHT]: "Lightly wounded",
  [WoundState.SERIOUS]: "Seriously wounded: -2 REF",
  [WoundState.CRITICAL]: "Critically wounded: REF, INT, COOL / 2",
  [WoundState.MORTAL]: "Mortally wounded: REF, INT, COOL / 3",
};

interface StatusBarProps {
  sheet: CombatSheet;
  damageThresholdService: IDamageThresholdService;
}

export function StatusBar({ sheet, damageThresholdService }: StatusBarProps): UiElement {
  const badges: Array<{ label: string; title: string }> = [];

  for (const type of Object.values(StatusType)) {
    if (hasStatus(sheet.statuses, type)) {
      const label = STATUS_ICONS[type] ?? type;
      badges.push({ label, title: label });
    }
  }

  if (isPcSheet(sheet)) {
    badges.push({
      label: WOUND_STATE_LABELS[sheet.woundState].slice(0, 2).toUpperCase(),
      title: WOUND_TOOLTIPS[sheet.woundState],
    });
  }

  if (isNpcSheet(sheet)) {
    const derived = damageThresholdService.getWoundState(sheet.damage.totalDamage);
    badges.push({
      label: WOUND_STATE_LABELS[derived].slice(0, 2).toUpperCase(),
      title: WOUND_TOOLTIPS[derived],
    });
  }

  if (badges.length === 0) {
    return <div className="cp-card__status-bar cp-card__status-bar--empty">—</div>;
  }

  return (
    <div className="cp-card__status-bar">
      {badges.map((badge) => (
        <span key={`${badge.label}-${badge.title}`} className="cp-card__status-badge" title={badge.title}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
