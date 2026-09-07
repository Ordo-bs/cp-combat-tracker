import {
  isNpcSheet,
  isPcSheet,
  isVehicleSheet,
  type CombatSheet,
  type NpcCombatSheet,
  type VehicleCombatSheet,
} from "../sheets/CombatSheet";
import { BodyLocation, type BodyPart } from "../sheets/components";
import type { OngoingEffect } from "./OngoingEffect";

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

export function cyberneticDisabledThreshold(hydraulicRams: boolean, reinforcedJoints: boolean, thickenedMyomar: boolean): number {
  return 20 + (hydraulicRams ? 10 : 0) + (reinforcedJoints ? 5 : 0) + (thickenedMyomar ? 5 : 0);
}

export function cyberneticDestroyedThreshold(hydraulicRams: boolean, reinforcedJoints: boolean, thickenedMyomar: boolean): number {
  return 30 + (hydraulicRams ? 10 : 0) + (reinforcedJoints ? 5 : 0) + (thickenedMyomar ? 5 : 0);
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
