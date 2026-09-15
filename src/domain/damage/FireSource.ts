export const FIRE_SOURCES = [
  "flamethrower",
  "cyberFlamethrower",
  "molotov",
  "flare",
  "incendiaryGrenade",
  "kendachiDragon",
  "api",
] as const;

export type FireSource = (typeof FIRE_SOURCES)[number];

export const FIRE_SOURCE_LABELS: Record<FireSource, string> = {
  flamethrower: "Flamethrower",
  cyberFlamethrower: "Cyber Flamethrower",
  molotov: "Molotov",
  flare: "Flare",
  incendiaryGrenade: "Incendiary Grenade",
  kendachiDragon: "Kendachi Dragon",
  api: "API Incendiary",
};

export const PLAYER_FIRE_SOURCES: FireSource[] = [
  "flamethrower",
  "cyberFlamethrower",
  "molotov",
  "flare",
  "incendiaryGrenade",
  "kendachiDragon",
];

export function fireRequiresSoftSpThreshold(source: FireSource): boolean {
  return source === "flamethrower" || source === "cyberFlamethrower" || source === "kendachiDragon";
}

export function fireSoftAblation(source: FireSource): number {
  switch (source) {
    case "flamethrower":
    case "cyberFlamethrower":
    case "incendiaryGrenade":
    case "kendachiDragon":
      return 2;
    default:
      return 1;
  }
}

export function fireLocationCount(source: FireSource): 0 | 1 | 2 {
  if (source === "kendachiDragon") {
    return 2;
  }
  if (source === "flare") {
    return 1;
  }
  return 0;
}

export function fireApplicationCount(source: FireSource): number {
  switch (source) {
    case "molotov":
      return 1;
    case "kendachiDragon":
    case "api":
      return 2;
    default:
      return 3;
  }
}

export function fireBypassesArmour(source: FireSource): boolean {
  return source === "api";
}
