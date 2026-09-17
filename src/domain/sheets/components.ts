import type { OngoingEffect } from "../damage/OngoingEffect";

export interface AmmoComponent {
  maximumShots: number;
  remainingShots: number;
  remainingMagazines: number;
}

export function createAmmoComponent(
  maximumShots = 0,
  remainingShots = 0,
  remainingMagazines = 0,
): AmmoComponent {
  return { maximumShots, remainingShots, remainingMagazines };
}

export enum BodyLocation {
  HEAD = "HEAD",
  TORSO = "TORSO",
  RIGHT_ARM = "RIGHT_ARM",
  LEFT_ARM = "LEFT_ARM",
  RIGHT_LEG = "RIGHT_LEG",
  LEFT_LEG = "LEFT_LEG",
}

export const DEFAULT_CYBERNETIC_SDP = 30;
export const CYBERNETIC_DISABLE_SDP_DAMAGE = 20;
export const CYBERNETIC_DESTROY_SDP_DAMAGE = 30;

export interface CyberneticProperties {
  sdpDamageTaken: number;
  disabled: boolean;
  hydraulicRams: boolean;
  reinforcedJoints: boolean;
  thickenedMyomar: boolean;
  empShielding: boolean;
}

export function createCyberneticProperties(): CyberneticProperties {
  return {
    sdpDamageTaken: 0,
    disabled: false,
    hydraulicRams: false,
    reinforcedJoints: false,
    thickenedMyomar: false,
    empShielding: false,
  };
}

export interface BodyPart {
  location: BodyLocation;
  sp: number;
  damage: number;
  destroyed: boolean;
  acid: boolean;
  isHardSp: boolean;
  cybernetic: boolean;
  cyberneticProperties?: CyberneticProperties;
}

export function createBodyPart(location: BodyLocation): BodyPart {
  return {
    location,
    sp: 0,
    damage: 0,
    destroyed: false,
    acid: false,
    isHardSp: false,
    cybernetic: false,
  };
}

export type BodyComponent = BodyPart[];

export function createBodyComponent(): BodyComponent {
  return [
    createBodyPart(BodyLocation.HEAD),
    createBodyPart(BodyLocation.TORSO),
    createBodyPart(BodyLocation.RIGHT_ARM),
    createBodyPart(BodyLocation.LEFT_ARM),
    createBodyPart(BodyLocation.RIGHT_LEG),
    createBodyPart(BodyLocation.LEFT_LEG),
  ];
}

export interface DamageComponent {
  totalDamage: number;
  btm: number;
  baseStunSave: number;
  baseDeathSave: number;
  isDead: boolean;
  ongoingEffects: OngoingEffect[];
}

export function createDamageComponent(): DamageComponent {
  return {
    totalDamage: 0,
    btm: 0,
    baseStunSave: 8,
    baseDeathSave: 8,
    isDead: false,
    ongoingEffects: [],
  };
}

export interface TrackerComponent {
  hasSandevistan: boolean;
  hasPainEditor: boolean;
  hasAdrenalBooster: boolean;
}

export function createTrackerComponent(): TrackerComponent {
  return {
    hasSandevistan: false,
    hasPainEditor: false,
    hasAdrenalBooster: false,
  };
}
