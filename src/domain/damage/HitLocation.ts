import { BodyLocation } from "../sheets/components";

export const HIT_LOCATION_RANGES: ReadonlyArray<{
  min: number;
  max: number;
  location: BodyLocation;
  label: string;
}> = [
  { min: 1, max: 1, location: BodyLocation.HEAD, label: "1 — Head" },
  { min: 2, max: 4, location: BodyLocation.TORSO, label: "2–4 — Torso" },
  { min: 5, max: 5, location: BodyLocation.RIGHT_ARM, label: "5 — Right Arm" },
  { min: 6, max: 6, location: BodyLocation.LEFT_ARM, label: "6 — Left Arm" },
  { min: 7, max: 8, location: BodyLocation.RIGHT_LEG, label: "7–8 — Right Leg" },
  { min: 9, max: 10, location: BodyLocation.LEFT_LEG, label: "9–10 — Left Leg" },
];

export function mapHitLocation(value: number): BodyLocation | undefined {
  if (!Number.isInteger(value)) {
    return undefined;
  }
  const entry = HIT_LOCATION_RANGES.find((row) => value >= row.min && value <= row.max);
  return entry?.location;
}

export function hitLocationLabel(location: BodyLocation): string {
  const entry = HIT_LOCATION_RANGES.find((row) => row.location === location);
  return entry?.label ?? location;
}
