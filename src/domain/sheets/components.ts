export interface AcidTracker {
  active: boolean;
  remainingRounds: number;
  pendingDamage: number;
}

export interface FireTracker {
  active: boolean;
  remainingRounds: number;
  pendingDamage: number;
}

export function createAcidTracker(): AcidTracker {
  return { active: false, remainingRounds: 0, pendingDamage: 0 };
}

export function createFireTracker(): FireTracker {
  return { active: false, remainingRounds: 0, pendingDamage: 0 };
}

export interface AmmoComponent {
  maximumShots: number;
  remainingShots: number;
  remainingMagazines: number;
}

export function createAmmoComponent(
  maximumShots = 30,
  remainingShots = 30,
  remainingMagazines = 3,
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

export interface CyberneticProperties {
  sdp: number;
  disabled: boolean;
  hydraulicRams: boolean;
  reinforcedJoints: boolean;
  thickenedMyomar: boolean;
  empShielding: boolean;
}

export function createCyberneticProperties(): CyberneticProperties {
  return {
    sdp: 0,
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
  cybernetic: boolean;
  cyberneticProperties?: CyberneticProperties;
  acidTracker: AcidTracker;
}

export function createBodyPart(location: BodyLocation): BodyPart {
  return {
    location,
    sp: 0,
    damage: 0,
    destroyed: false,
    acid: false,
    cybernetic: false,
    acidTracker: createAcidTracker(),
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
  acidTracker: AcidTracker;
  fireTracker: FireTracker;
}

export function createDamageComponent(): DamageComponent {
  return {
    totalDamage: 0,
    btm: 0,
    baseStunSave: 8,
    baseDeathSave: 8,
    acidTracker: createAcidTracker(),
    fireTracker: createFireTracker(),
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
