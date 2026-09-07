import type { DamageType } from "../../domain/damage/DamageTypes";
import type { DamageTypeRule } from "./DamageTypeRule";
import {
  apiRule,
  apRule,
  bypassRule,
  broadheadRule,
  dualPurposeRule,
  edgedRule,
  flechetteRule,
  hollowPointRule,
  monoRule,
  regularRule,
  slugRule,
  spinnerRule,
} from "./rules/standardRules";
import {
  acidRule,
  concussionRule,
  explosiveRule,
  fireRule,
  halfAndHalfRule,
  safetyRule,
  stunRule,
  taserStunNRule,
} from "./rules/specialRules";

const RULES: DamageTypeRule[] = [
  regularRule,
  edgedRule,
  monoRule,
  apRule,
  slugRule,
  explosiveRule,
  stunRule,
  apiRule,
  dualPurposeRule,
  hollowPointRule,
  halfAndHalfRule,
  safetyRule,
  flechetteRule,
  concussionRule,
  broadheadRule,
  spinnerRule,
  acidRule,
  fireRule,
  taserStunNRule,
  bypassRule,
];

export class DamageTypeRegistry {
  private readonly byId = new Map<DamageType, DamageTypeRule>();

  constructor(rules: DamageTypeRule[] = RULES) {
    for (const rule of rules) {
      this.byId.set(rule.definition.id, rule);
    }
  }

  get(type: DamageType): DamageTypeRule {
    const rule = this.byId.get(type);
    if (!rule) {
      throw new Error(`Unknown damage type: ${type}`);
    }
    return rule;
  }

  all(): DamageTypeRule[] {
    return [...this.byId.values()];
  }
}
