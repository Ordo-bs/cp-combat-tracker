import { lookupDamageRule } from "../domain/rules/RuleTables";
import { WoundState } from "../domain/rules/WoundState";

export interface DerivedDamageValues {
  woundState: WoundState;
  stunPenalty: number | null;
  deathPenalty: number | null;
  modifiedStunSave: number | null;
  modifiedDeathSave: number | null;
}

export interface IDamageThresholdService {
  derive(totalDamage: number, baseStunSave: number, baseDeathSave: number): DerivedDamageValues;
  getWoundState(totalDamage: number): WoundState;
}

export class DamageThresholdService implements IDamageThresholdService {
  derive(
    totalDamage: number,
    baseStunSave: number,
    baseDeathSave: number,
  ): DerivedDamageValues {
    const rule = lookupDamageRule(totalDamage);
    return {
      woundState: rule.wound,
      stunPenalty: rule.stunPenalty,
      deathPenalty: rule.deathPenalty,
      modifiedStunSave: rule.stunPenalty === null ? null : baseStunSave + rule.stunPenalty,
      modifiedDeathSave: rule.deathPenalty === null ? null : baseDeathSave + rule.deathPenalty,
    };
  }

  getWoundState(totalDamage: number): WoundState {
    return lookupDamageRule(totalDamage).wound;
  }
}
