import { WoundState } from "./WoundState";

export interface RuleTableEntry {
  min: number;
  max: number | null;
  wound: WoundState;
  stunPenalty: number;
  deathPenalty: number;
}

/** Single source of truth for damage → wound / save modifiers. */
export const DAMAGE_RULE_TABLE: readonly RuleTableEntry[] = [
  { min: 0, max: 0, wound: WoundState.NONE, stunPenalty: 0, deathPenalty: 0 },
  { min: 1, max: 4, wound: WoundState.LIGHT, stunPenalty: 0, deathPenalty: 0 },
  { min: 5, max: 8, wound: WoundState.SERIOUS, stunPenalty: -1, deathPenalty: 0 },
  { min: 9, max: 12, wound: WoundState.CRITICAL, stunPenalty: -2, deathPenalty: 0 },
  { min: 13, max: 16, wound: WoundState.MORTAL, stunPenalty: -3, deathPenalty: -1 },
  { min: 17, max: 20, wound: WoundState.MORTAL, stunPenalty: -4, deathPenalty: -1 },
  { min: 21, max: 24, wound: WoundState.MORTAL, stunPenalty: -5, deathPenalty: -2 },
  { min: 25, max: 28, wound: WoundState.MORTAL, stunPenalty: -6, deathPenalty: -3 },
  { min: 29, max: 32, wound: WoundState.MORTAL, stunPenalty: -7, deathPenalty: -4 },
  { min: 33, max: 36, wound: WoundState.MORTAL, stunPenalty: -8, deathPenalty: -5 },
  { min: 37, max: 40, wound: WoundState.MORTAL, stunPenalty: -9, deathPenalty: -6 },
  { min: 41, max: 44, wound: WoundState.MORTAL, stunPenalty: -9, deathPenalty: -7 },
  { min: 45, max: 48, wound: WoundState.MORTAL, stunPenalty: -9, deathPenalty: -8 },
  { min: 49, max: 52, wound: WoundState.MORTAL, stunPenalty: -9, deathPenalty: -9 },
  { min: 53, max: null, wound: WoundState.MORTAL, stunPenalty: -9, deathPenalty: -10 },
];

export function lookupDamageRule(totalDamage: number): RuleTableEntry {
  const clamped = Math.max(0, totalDamage);
  const entry = DAMAGE_RULE_TABLE.find(
    (row) => clamped >= row.min && (row.max === null || clamped <= row.max),
  );
  if (!entry) {
    return DAMAGE_RULE_TABLE[DAMAGE_RULE_TABLE.length - 1]!;
  }
  return entry;
}
