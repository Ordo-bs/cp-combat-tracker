import { remainingCyberneticSdp, remainingEffectApplications } from "../../domain/damage/sheetEffects";
import { woundStateExpandedLabel } from "../../domain/rules/WoundState";
import { isNpcSheet, isPcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { type BodyPart } from "../../domain/sheets/components";
import { getStatus, hasStatus } from "../../domain/status/Status";
import { StatusType } from "../../domain/status/StatusType";
import type { IDamageThresholdService } from "../../services/DamageThresholdService";
import { BODY_LOCATION_LABELS } from "../editor/editorLabels";

export const STATUS_EXPANDED_LABELS: Record<StatusType, string> = {
  [StatusType.STUNNED]: "Stunned",
  [StatusType.ON_FIRE]: "On Fire",
  [StatusType.ACID]: "Acid",
  [StatusType.MARKED]: "Marked",
  [StatusType.DEAD]: "Dead",
  [StatusType.DESTROYED]: "Destroyed",
  [StatusType.SANDEVISTAN]: "Sandevistan",
  [StatusType.ADRENAL_BOOSTER]: "Adrenal booster",
};

const COUNTED_EFFECTS: Partial<Record<StatusType, "fire" | "acid">> = {
  [StatusType.ON_FIRE]: "fire",
  [StatusType.ACID]: "acid",
};

export interface ExpandedStatusItem {
  key: string;
  label: string;
}

export interface ExpandedBodyPartLine {
  key: string;
  text: string;
}

export function formatDerivedSave(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return String(value);
}

export function formatStatusWithRemaining(name: string, remaining: number | undefined): string {
  if (remaining !== undefined && remaining > 0) {
    return `${name} · ${remaining} left`;
  }
  return name;
}

export function remainingStatusDuration(sheet: CombatSheet, type: StatusType): number | undefined {
  const status = getStatus(sheet.statuses, type);
  if (!status?.active || typeof status.duration !== "number") {
    return undefined;
  }
  return status.duration;
}

export function buildExpandedStatusItems(
  sheet: CombatSheet,
  damageThresholdService: IDamageThresholdService,
): ExpandedStatusItem[] {
  const items: ExpandedStatusItem[] = [];

  for (const type of Object.values(StatusType)) {
    if (!hasStatus(sheet.statuses, type)) {
      continue;
    }
    const name = STATUS_EXPANDED_LABELS[type] ?? type;
    const effectType = COUNTED_EFFECTS[type];
    const remaining = effectType
      ? remainingEffectApplications(sheet, effectType)
      : type === StatusType.SANDEVISTAN || type === StatusType.ADRENAL_BOOSTER
        ? remainingStatusDuration(sheet, type)
        : undefined;
    items.push({ key: type, label: formatStatusWithRemaining(name, remaining) });
  }

  if (isPcSheet(sheet)) {
    const label = woundStateExpandedLabel(sheet.woundState);
    if (label) {
      items.push({ key: `wound-${sheet.woundState}`, label });
    }
  }

  if (isNpcSheet(sheet)) {
    const derived = damageThresholdService.derive(
      sheet.damage.totalDamage,
      sheet.damage.baseStunSave,
      sheet.damage.baseDeathSave,
    );
    const label = woundStateExpandedLabel(derived.woundState, derived.deathPenalty);
    if (label) {
      items.push({ key: `wound-${derived.woundState}`, label });
    }
    for (const part of sheet.body) {
      const location = BODY_LOCATION_LABELS[part.location];
      if (part.cybernetic && part.cyberneticProperties?.disabled) {
        items.push({ key: `disabled-${part.location}`, label: `${location} disabled` });
      }
      if (part.destroyed) {
        items.push({ key: `destroyed-${part.location}`, label: `${location} destroyed` });
      }
    }
  }

  return items;
}

export function expandedBodyPartLines(parts: BodyPart[]): ExpandedBodyPartLine[] {
  return parts.flatMap((part) => {
    const disabled = Boolean(part.cybernetic && part.cyberneticProperties?.disabled);
    if (part.sp <= 0 && part.damage <= 0 && !part.cybernetic && !part.destroyed) {
      return [];
    }
    const bits: string[] = [];
    if (part.sp > 0) {
      bits.push(`SP ${part.sp}`);
    }
    if (part.damage > 0) {
      bits.push(`Damage ${part.damage}`);
    }
    if (part.cybernetic) {
      bits.push("Cyber");
      const cyber = part.cyberneticProperties;
      if (cyber && cyber.sdpDamageTaken > 0) {
        bits.push(`SDP ${remainingCyberneticSdp(part.location, cyber)}`);
      }
      if (cyber?.empShielding) {
        bits.push("EMP shielding");
      }
      if (disabled) {
        bits.push("Disabled");
      }
    }
    if (part.destroyed) {
      bits.push("Destroyed");
    }
    const location = BODY_LOCATION_LABELS[part.location];
    return [{ key: part.location, text: `${location} — ${bits.join(", ")}` }];
  });
}
