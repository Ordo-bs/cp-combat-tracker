import { BodyLocation } from "../../domain/sheets/components";
import { StatusType } from "../../domain/status/StatusType";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import { WoundState, WOUND_STATE_LABELS } from "../../domain/rules/WoundState";

export const SHEET_TYPE_LABELS: Record<CombatSheetType, string> = {
  [CombatSheetType.PC]: "PC",
  [CombatSheetType.NPC]: "NPC",
  [CombatSheetType.VEHICLE]: "Vehicle",
};

export const BODY_LOCATION_LABELS: Record<BodyLocation, string> = {
  [BodyLocation.HEAD]: "Head",
  [BodyLocation.TORSO]: "Torso",
  [BodyLocation.RIGHT_ARM]: "Right Arm",
  [BodyLocation.LEFT_ARM]: "Left Arm",
  [BodyLocation.RIGHT_LEG]: "Right Leg",
  [BodyLocation.LEFT_LEG]: "Left Leg",
};

export const STATUS_LABELS: Record<StatusType, string> = {
  [StatusType.STUNNED]: "Stunned",
  [StatusType.ON_FIRE]: "On Fire",
  [StatusType.ACID]: "Acid",
  [StatusType.MARKED]: "Marked",
  [StatusType.DEAD]: "Dead",
  [StatusType.DESTROYED]: "Destroyed",
};

export function statusesForSheetType(type: CombatSheetType): StatusType[] {
  switch (type) {
    case CombatSheetType.PC:
      return [StatusType.STUNNED, StatusType.MARKED];
    case CombatSheetType.NPC:
      return [StatusType.STUNNED, StatusType.MARKED];
    case CombatSheetType.VEHICLE:
      return [StatusType.MARKED];
  }
}

export const WOUND_STATE_OPTIONS = Object.values(WoundState).map((value) => ({
  value,
  label: WOUND_STATE_LABELS[value],
}));

export const BTM_OPTIONS = [0, -1, -2, -3, -4, -5];
