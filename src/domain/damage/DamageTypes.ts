export const DAMAGE_TYPES = [
  "regular",
  "edged",
  "mono",
  "ap",
  "bypass",
  "explosive",
  "acid",
  "fire",
  "taserStunN",
  "stun",
  "shotgunSlug",
  "shotgunFlechette",
  "shotgunConcussion",
  "api",
  "dualPurpose",
  "hollowPoint",
  "halfAndHalf",
  "safety",
  "arrowBroadhead",
  "arrowSpinner",
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  regular: "Regular",
  edged: "Edged",
  mono: "Mono",
  ap: "AP",
  shotgunSlug: "Shotgun: Slug",
  explosive: "Explosive",
  stun: "Stun",
  api: "API",
  dualPurpose: "Dual-Purpose",
  hollowPoint: "Hollow Point",
  halfAndHalf: "Half-and-Half",
  safety: "Safety",
  shotgunFlechette: "Shotgun: Flechette",
  shotgunConcussion: "Shotgun: Concussion",
  arrowBroadhead: "Arrow: Broadhead",
  arrowSpinner: "Arrow: Spinner",
  acid: "Acid",
  fire: "Fire",
  taserStunN: "Taser / Stun-N",
  bypass: "Bypass",
};

export type TargetType = "NPC" | "Vehicle";
