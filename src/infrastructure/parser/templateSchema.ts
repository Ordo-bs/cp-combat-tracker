import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import { BodyLocation } from "../../domain/sheets/components";
import type { BodyPartTemplate, BodyTemplateMap } from "../../domain/combat/CombatTemplate";

export const FENCE_NAME = "combat-sheet";

export const RUNTIME_FORBIDDEN_FIELDS = new Set([
  "initiative",
  "damageTaken",
  "status",
  "statuses",
  "runtimeId",
  "instanceId",
  "createdAt",
  "activeCombatantId",
]);

export const COMMON_TEMPLATE_FIELDS = new Set(["type", "name", "version", "initiativeModifier"]);

export const PC_TEMPLATE_FIELDS = new Set([...COMMON_TEMPLATE_FIELDS]);

export const NPC_TEMPLATE_FIELDS = new Set([
  ...COMMON_TEMPLATE_FIELDS,
  "btm",
  "maximumShots",
  "remainingShots",
  "remainingMagazines",
  "baseStunSave",
  "totalDamage",
  "hasSandevistan",
  "hasPainEditor",
  "hasAdrenalBooster",
  "body",
]);

export const VEHICLE_TEMPLATE_FIELDS = new Set([
  ...COMMON_TEMPLATE_FIELDS,
  "sp",
  "sdp",
]);

export const BODY_YAML_KEYS: Record<string, BodyLocation> = {
  head: BodyLocation.HEAD,
  torso: BodyLocation.TORSO,
  leftArm: BodyLocation.LEFT_ARM,
  rightArm: BodyLocation.RIGHT_ARM,
  leftLeg: BodyLocation.LEFT_LEG,
  rightLeg: BodyLocation.RIGHT_LEG,
};

export const BODY_PART_FIELDS = new Set([
  "sp",
  "damage",
  "destroyed",
  "isHardSp",
  "cybernetic",
  "sdp",
  "disabled",
  "hydraulicRams",
  "reinforcedJoints",
  "thickenedMyomar",
  "empShielding",
]);

export function createDefaultBodyPartTemplate(): BodyPartTemplate {
  return {
    sp: 0,
    damage: 0,
    destroyed: false,
    isHardSp: false,
    cybernetic: false,
    sdp: 0,
    disabled: false,
    hydraulicRams: false,
    reinforcedJoints: false,
    thickenedMyomar: false,
    empShielding: false,
  };
}

export function createDefaultBodyTemplateMap(): BodyTemplateMap {
  return {
    [BodyLocation.HEAD]: createDefaultBodyPartTemplate(),
    [BodyLocation.TORSO]: createDefaultBodyPartTemplate(),
    [BodyLocation.LEFT_ARM]: createDefaultBodyPartTemplate(),
    [BodyLocation.RIGHT_ARM]: createDefaultBodyPartTemplate(),
    [BodyLocation.LEFT_LEG]: createDefaultBodyPartTemplate(),
    [BodyLocation.RIGHT_LEG]: createDefaultBodyPartTemplate(),
  };
}

export function sheetTypeFromYaml(value: string): CombatSheetType | null {
  switch (value.toLowerCase()) {
    case "pc":
      return CombatSheetType.PC;
    case "npc":
      return CombatSheetType.NPC;
    case "vehicle":
      return CombatSheetType.VEHICLE;
    default:
      return null;
  }
}

export function allowedFieldsForType(type: CombatSheetType): Set<string> {
  switch (type) {
    case CombatSheetType.PC:
      return PC_TEMPLATE_FIELDS;
    case CombatSheetType.NPC:
      return NPC_TEMPLATE_FIELDS;
    case CombatSheetType.VEHICLE:
      return VEHICLE_TEMPLATE_FIELDS;
  }
}
