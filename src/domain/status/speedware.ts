import { markInitiativePending } from "../combat/Initiative";
import { isNpcSheet, isPcSheet, isVehicleSheet, type CombatSheet } from "../sheets/CombatSheet";
import { getStatus, hasStatus, upsertStatus } from "./Status";
import { StatusType } from "./StatusType";

export const SANDEVISTAN_BONUS = 3;
export const SANDEVISTAN_DURATION = 5;
export const ADRENAL_BONUS = 1;

export function speedwareFlagAvailable(sheet: CombatSheet, type: StatusType.SANDEVISTAN | StatusType.ADRENAL_BOOSTER): boolean {
  if (isVehicleSheet(sheet)) {
    return false;
  }
  if (isPcSheet(sheet)) {
    return true;
  }
  if (!isNpcSheet(sheet)) {
    return false;
  }
  return type === StatusType.SANDEVISTAN ? sheet.trackers.hasSandevistan : sheet.trackers.hasAdrenalBooster;
}

export function speedwareActive(sheet: CombatSheet, type: StatusType.SANDEVISTAN | StatusType.ADRENAL_BOOSTER): boolean {
  return hasStatus(sheet.statuses, type);
}

export function activateSpeedware(
  sheet: CombatSheet,
  type: StatusType.SANDEVISTAN | StatusType.ADRENAL_BOOSTER,
  duration: number,
  bonus: number,
): void {
  sheet.initiative = markInitiativePending(sheet.initiative, sheet.initiative.pending + bonus);
  sheet.statuses = upsertStatus(sheet.statuses, {
    type,
    active: true,
    duration,
    metadata: { bonus },
  });
}

export interface SpeedwareExpiry {
  combatantId: string;
  combatantName: string;
  text: string;
}

export function tickSpeedware(sheet: CombatSheet): SpeedwareExpiry[] {
  const expired: SpeedwareExpiry[] = [];
  for (const type of [StatusType.SANDEVISTAN, StatusType.ADRENAL_BOOSTER] as const) {
    const status = getStatus(sheet.statuses, type);
    if (!status?.active) {
      continue;
    }
    const remaining = (status.duration ?? 1) - 1;
    if (remaining > 0) {
      sheet.statuses = upsertStatus(sheet.statuses, { ...status, type, duration: remaining });
      continue;
    }
    const bonus = typeof status.metadata?.bonus === "number" ? status.metadata.bonus : 0;
    removeSpeedwareBonus(sheet, bonus);
    sheet.statuses = upsertStatus(sheet.statuses, {
      ...status,
      type,
      active: false,
      duration: 0,
    });
    expired.push({
      combatantId: sheet.id,
      combatantName: sheet.name,
      text:
        type === StatusType.SANDEVISTAN
          ? `Sandevistan ended (−${bonus} initiative).`
          : `Adrenal booster ended (−${bonus} initiative).`,
    });
  }
  return expired;
}

export function clearSpeedwareStatuses(sheet: CombatSheet): void {
  for (const type of [StatusType.SANDEVISTAN, StatusType.ADRENAL_BOOSTER] as const) {
    if (hasStatus(sheet.statuses, type)) {
      sheet.statuses = upsertStatus(sheet.statuses, { type, active: false, duration: 0 });
    }
  }
}

function removeSpeedwareBonus(sheet: CombatSheet, bonus: number): void {
  if (bonus === 0) {
    return;
  }
  if (sheet.initiative.dirty) {
    sheet.initiative = markInitiativePending(sheet.initiative, sheet.initiative.pending - bonus);
    return;
  }
  const current = sheet.initiative.current - bonus;
  const pending = sheet.initiative.pending - bonus;
  sheet.initiative = { current, pending, dirty: current !== pending };
}
