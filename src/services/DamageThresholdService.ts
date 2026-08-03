import { lookupDamageRule } from "../domain/rules/RuleTables";
import { WoundState } from "../domain/rules/WoundState";

export interface DerivedDamageValues {
  woundState: WoundState;
  stunPenalty: number;
  deathPenalty: number;
  modifiedStunSave: number;
  modifiedDeathSave: number;
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
      modifiedStunSave: baseStunSave + rule.stunPenalty,
      modifiedDeathSave: baseDeathSave + rule.deathPenalty,
    };
  }

  getWoundState(totalDamage: number): WoundState {
    return lookupDamageRule(totalDamage).wound;
  }
}
