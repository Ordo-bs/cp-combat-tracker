import {
  isNpcSheet,
  isPcSheet,
  isVehicleSheet,
  type CombatSheet,
  type NpcCombatSheet,
  type VehicleCombatSheet,
} from "../sheets/CombatSheet";
import {
  BodyLocation,
  CYBERNETIC_DESTROY_SDP_DAMAGE,
  CYBERNETIC_DISABLE_SDP_DAMAGE,
  DEFAULT_CYBERNETIC_SDP,
  type BodyPart,
  type CyberneticProperties,
} from "../sheets/components";
import type { OngoingEffect, OngoingEffectType } from "./OngoingEffect";

export function getOngoingEffects(sheet: CombatSheet): OngoingEffect[] {
  if (isNpcSheet(sheet)) {
    return sheet.damage.ongoingEffects;
  }
  if (isPcSheet(sheet) || isVehicleSheet(sheet)) {
    return sheet.ongoingEffects;
  }
  return [];
}

export function setOngoingEffects(sheet: CombatSheet, effects: OngoingEffect[]): void {
  if (isNpcSheet(sheet)) {
    sheet.damage.ongoingEffects = effects;
    return;
  }
  if (isPcSheet(sheet) || isVehicleSheet(sheet)) {
    sheet.ongoingEffects = effects;
  }
}

export function findBodyPart(sheet: NpcCombatSheet, location: BodyLocation): BodyPart | undefined {
  return sheet.body.find((part) => part.location === location);
}

export function requireBodyPart(sheet: NpcCombatSheet, location: BodyLocation): BodyPart {
  const part = findBodyPart(sheet, location);
  if (!part) {
    throw new Error(`Missing body part ${location}.`);
  }
  return part;
}

export const ALL_BODY_LOCATIONS: BodyLocation[] = [
  BodyLocation.HEAD,
  BodyLocation.TORSO,
  BodyLocation.RIGHT_ARM,
  BodyLocation.LEFT_ARM,
  BodyLocation.RIGHT_LEG,
  BodyLocation.LEFT_LEG,
];

export function isVehicleHardSp(_sheet: VehicleCombatSheet): true {
  return true;
}

export const CYBERNETIC_LIMB_OPTION_FIELDS = ["hydraulicRams", "reinforcedJoints", "thickenedMyomar"] as const;

export function allowsCyberneticLimbOptions(location: BodyLocation): boolean {
  return (
    location === BodyLocation.RIGHT_ARM ||
    location === BodyLocation.LEFT_ARM ||
    location === BodyLocation.RIGHT_LEG ||
    location === BodyLocation.LEFT_LEG
  );
}

export function clearInvalidCyberneticLimbOptions(location: BodyLocation, props: CyberneticProperties): void {
  if (allowsCyberneticLimbOptions(location)) {
    return;
  }
  props.hydraulicRams = false;
  props.reinforcedJoints = false;
  props.thickenedMyomar = false;
}

export function cyberneticOptionBonus(location: BodyLocation, props: CyberneticProperties): number {
  if (!allowsCyberneticLimbOptions(location)) {
    return 0;
  }
  return (props.hydraulicRams ? 10 : 0) + (props.reinforcedJoints ? 5 : 0) + (props.thickenedMyomar ? 5 : 0);
}

export function cyberneticMaxSdp(location: BodyLocation, props: CyberneticProperties): number {
  return DEFAULT_CYBERNETIC_SDP + cyberneticOptionBonus(location, props);
}

export function remainingCyberneticSdp(location: BodyLocation, props: CyberneticProperties): number {
  return Math.max(0, cyberneticMaxSdp(location, props) - props.sdpDamageTaken);
}

export function clampCyberneticSdpDamage(location: BodyLocation, props: CyberneticProperties): void {
  const max = cyberneticMaxSdp(location, props);
  if (!Number.isFinite(props.sdpDamageTaken) || props.sdpDamageTaken < 0) {
    props.sdpDamageTaken = 0;
    return;
  }
  props.sdpDamageTaken = Math.min(props.sdpDamageTaken, max);
}

export function cyberneticDisabledThreshold(location: BodyLocation, props: CyberneticProperties): number {
  return CYBERNETIC_DISABLE_SDP_DAMAGE + cyberneticOptionBonus(location, props);
}

export function cyberneticDestroyedThreshold(location: BodyLocation, props: CyberneticProperties): number {
  return CYBERNETIC_DESTROY_SDP_DAMAGE + cyberneticOptionBonus(location, props);
}

export function hasUnresolvedPendingEffects(sheet: CombatSheet): boolean {
  const activation = sheet.runtimeMetadata.activationSequence;
  return getOngoingEffects(sheet).some(
    (effect) =>
      effect.applicationsRemaining > 0 &&
      effect.nextApplicationActivation <= activation &&
      effect.lastProcessedActivation !== activation,
  );
}

export function pendingEffectsForActivation(sheet: CombatSheet): OngoingEffect[] {
  const activation = sheet.runtimeMetadata.activationSequence;
  return getOngoingEffects(sheet).filter(
    (effect) =>
      effect.applicationsRemaining > 0 &&
      effect.nextApplicationActivation <= activation &&
      effect.lastProcessedActivation !== activation,
  );
}

export function remainingEffectApplications(sheet: CombatSheet, type: OngoingEffectType): number {
  return getOngoingEffects(sheet)
    .filter((effect) => effect.type === type)
    .reduce((sum, effect) => sum + Math.max(0, effect.applicationsRemaining), 0);
}
