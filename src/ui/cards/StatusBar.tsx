import type { UiElement } from "../types";
import { hasStatus } from "../../domain/status/Status";
import { StatusType } from "../../domain/status/StatusType";
import { WoundState, woundStateCardLabel } from "../../domain/rules/WoundState";
import { isNpcSheet, isPcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import type { IDamageThresholdService } from "../../services/DamageThresholdService";
import { ObsidianIcon } from "../editor/EditorFields";

const STATUS_ICONS: Partial<Record<StatusType, string>> = {
  [StatusType.STUNNED]: "Stun",
  [StatusType.ON_FIRE]: "Fire",
  [StatusType.ACID]: "Acid",
  [StatusType.MARKED]: "Marked",
  [StatusType.DEAD]: "Dead",
  [StatusType.DESTROYED]: "Destroyed",
  [StatusType.SANDEVISTAN]: "Sandy",
  [StatusType.ADRENAL_BOOSTER]: "Boost",
};

const WOUND_TOOLTIPS: Record<WoundState, string> = {
  [WoundState.NONE]: "No wounds",
  [WoundState.LIGHT]: "Lightly wounded",
  [WoundState.SERIOUS]: "Seriously wounded: -2 REF",
  [WoundState.CRITICAL]: "Critically wounded: REF, INT, COOL / 2",
  [WoundState.MORTAL]: "Mortally wounded: REF, INT, COOL / 3",
};

type WoundTone = "none" | "light" | "serious" | "critical" | "mortal";

interface WoundBadge {
  label: string;
  title: string;
  tone: WoundTone;
}

interface StatusBarProps {
  sheet: CombatSheet;
  damageThresholdService: IDamageThresholdService;
}

function woundTone(wound: WoundState): WoundTone {
  switch (wound) {
    case WoundState.LIGHT:
      return "light";
    case WoundState.SERIOUS:
      return "serious";
    case WoundState.CRITICAL:
      return "critical";
    case WoundState.MORTAL:
      return "mortal";
    default:
      return "none";
  }
}

function woundBadge(wound: WoundState, deathPenalty?: number | null): WoundBadge | null {
  const label = woundStateCardLabel(wound, deathPenalty);
  if (!label) {
    return null;
  }
  return { label, title: WOUND_TOOLTIPS[wound], tone: woundTone(wound) };
}

export function StatusBar({ sheet, damageThresholdService }: StatusBarProps): UiElement {
  const dead = hasStatus(sheet.statuses, StatusType.DEAD);
  const badges: Array<{ label: string; title: string }> = [];

  for (const type of Object.values(StatusType)) {
    if (type === StatusType.DEAD || !hasStatus(sheet.statuses, type)) {
      continue;
    }
    const label = STATUS_ICONS[type] ?? type;
    badges.push({ label, title: label });
  }

  let wound: WoundBadge | null = null;
  if (!dead && isPcSheet(sheet)) {
    wound = woundBadge(sheet.woundState);
  } else if (!dead && isNpcSheet(sheet)) {
    const derived = damageThresholdService.derive(
      sheet.damage.totalDamage,
      sheet.damage.baseStunSave,
      sheet.damage.baseDeathSave,
    );
    wound = woundBadge(derived.woundState, derived.deathPenalty);
  }

  if (badges.length === 0 && !wound && !dead) {
    return <div className="cp-card__status-bar cp-card__status-bar--empty">—</div>;
  }

  return (
    <div className="cp-card__status-bar">
      <div className="cp-card__status-tags">
        {badges.map((badge) => (
          <span key={`${badge.label}-${badge.title}`} className="cp-card__status-badge" title={badge.title}>
            {badge.label}
          </span>
        ))}
      </div>
      {dead ? (
        <span className="cp-card__wound cp-card__wound--dead" title="Dead">
          Dead
        </span>
      ) : (
        wound && (
          <span className={`cp-card__wound cp-card__wound--${wound.tone}`} title={wound.title}>
            <ObsidianIcon icon="heart" />
            {wound.label}
          </span>
        )
      )}
    </div>
  );
}
