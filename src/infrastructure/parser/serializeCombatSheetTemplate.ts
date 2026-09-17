import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import {
  isNpcSheet,
  isVehicleSheet,
  type CombatSheet,
  type NpcCombatSheet,
} from "../../domain/sheets/CombatSheet";
import {
  BodyLocation,
  DEFAULT_CYBERNETIC_SDP,
  type BodyPart,
} from "../../domain/sheets/components";
import { FENCE_NAME, BODY_YAML_KEYS } from "./templateSchema";

const YAML_BODY_KEYS: Record<BodyLocation, string> = Object.fromEntries(
  Object.entries(BODY_YAML_KEYS).map(([yamlKey, location]) => [location, yamlKey]),
) as Record<BodyLocation, string>;

const YAML_TYPE: Record<CombatSheetType, string> = {
  [CombatSheetType.PC]: "pc",
  [CombatSheetType.NPC]: "npc",
  [CombatSheetType.VEHICLE]: "vehicle",
};

export function serializeCombatSheetAsTemplate(sheet: CombatSheet): string {
  const fields: Array<[string, string | number | boolean]> = [
    ["type", YAML_TYPE[sheet.sheetType]],
  ];

  const name = sheet.name.trim();
  if (name) {
    fields.push(["name", name]);
  }

  if (Number.isInteger(sheet.initiative.pending) && sheet.initiative.pending !== 0) {
    fields.push(["initiativeModifier", sheet.initiative.pending]);
  }

  if (isNpcSheet(sheet)) {
    appendNpcFields(fields, sheet);
  } else if (isVehicleSheet(sheet)) {
    if (Number.isInteger(sheet.sp)) {
      fields.push(["sp", sheet.sp]);
    }
    if (Number.isInteger(sheet.sdp)) {
      fields.push(["sdp", sheet.sdp]);
    }
  }

  const yaml = fields.map(([key, value]) => `${key}: ${formatYamlScalar(value)}`).join("\n");
  return `\`\`\`${FENCE_NAME}\n${yaml}\n\`\`\``;
}

function appendNpcFields(fields: Array<[string, string | number | boolean]>, sheet: NpcCombatSheet): void {
  if (Number.isInteger(sheet.damage.btm)) {
    fields.push(["btm", sheet.damage.btm]);
  }
  if (Number.isInteger(sheet.damage.baseStunSave)) {
    fields.push(["baseStunSave", sheet.damage.baseStunSave]);
  }
  if (Number.isInteger(sheet.damage.totalDamage) && sheet.damage.totalDamage !== 0) {
    fields.push(["totalDamage", sheet.damage.totalDamage]);
  }
  if (sheet.ammo.maximumShots !== 0) {
    fields.push(["maximumShots", sheet.ammo.maximumShots]);
  }
  if (sheet.ammo.remainingShots !== sheet.ammo.maximumShots) {
    fields.push(["remainingShots", sheet.ammo.remainingShots]);
  }
  if (sheet.ammo.remainingMagazines !== 0) {
    fields.push(["remainingMagazines", sheet.ammo.remainingMagazines]);
  }
  if (sheet.trackers.hasSandevistan) {
    fields.push(["hasSandevistan", true]);
  }
  if (sheet.trackers.hasPainEditor) {
    fields.push(["hasPainEditor", true]);
  }
  if (sheet.trackers.hasAdrenalBooster) {
    fields.push(["hasAdrenalBooster", true]);
  }
  for (const part of sheet.body) {
    appendBodyPartFields(fields, part);
  }
}

function appendBodyPartFields(fields: Array<[string, string | number | boolean]>, part: BodyPart): void {
  const yamlLocation = YAML_BODY_KEYS[part.location];
  if (!yamlLocation) {
    return;
  }
  const prefix = `body.${yamlLocation}`;
  if (part.sp !== 0) {
    fields.push([`${prefix}.sp`, part.sp]);
  }
  if (part.damage !== 0) {
    fields.push([`${prefix}.damage`, part.damage]);
  }
  if (part.destroyed) {
    fields.push([`${prefix}.destroyed`, true]);
  }
  if (part.isHardSp) {
    fields.push([`${prefix}.isHardSp`, true]);
  }
  if (!part.cybernetic) {
    return;
  }
  fields.push([`${prefix}.cybernetic`, true]);
  const cyber = part.cyberneticProperties;
  if (!cyber) {
    return;
  }
  if (cyber.sdp !== DEFAULT_CYBERNETIC_SDP) {
    fields.push([`${prefix}.sdp`, cyber.sdp]);
  }
  if (cyber.disabled) {
    fields.push([`${prefix}.disabled`, true]);
  }
  if (cyber.hydraulicRams) {
    fields.push([`${prefix}.hydraulicRams`, true]);
  }
  if (cyber.reinforcedJoints) {
    fields.push([`${prefix}.reinforcedJoints`, true]);
  }
  if (cyber.thickenedMyomar) {
    fields.push([`${prefix}.thickenedMyomar`, true]);
  }
  if (cyber.empShielding) {
    fields.push([`${prefix}.empShielding`, true]);
  }
}

function formatYamlScalar(value: string | number | boolean): string {
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (value === "" || /[:#\n"'\\]|^\s|\s$/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}
