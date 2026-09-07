import type { DamageType, TargetType } from "../../domain/damage/DamageTypes";
import { DAMAGE_TYPE_LABELS } from "../../domain/damage/DamageTypes";
import { floorDamage } from "../../domain/damage/floorDamage";

export interface DamageTypeDefinition {
  id: DamageType;
  label: string;
  requiresDamage: boolean;
  requiresHitLocation: boolean;
  requiresAdditionalPenalty: boolean;
  requiresDamageReduction: boolean;
  requiresFireSource: boolean;
  supportedTargets: TargetType[];
}

export interface ArmourContext {
  sp: number;
  isHardSp: boolean;
  rawDamage: number;
  effectiveSp: number;
  sdp?: number;
  ineffective?: boolean;
}

export interface DamageThroughArmorContext {
  rawDamage: number;
  originalSp: number;
  effectiveSp: number;
  isHardSp: boolean;
  penetrated: boolean;
  damageThroughArmor: number;
}

export interface FinalDamageContext {
  finalDamage: number;
  penetrated: boolean;
}

export interface DamageTypeRule {
  readonly definition: DamageTypeDefinition;
  modifyArmour(context: ArmourContext): ArmourContext;
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext;
  modifyFinalDamage(context: FinalDamageContext): FinalDamageContext;
}

export function definition(
  id: DamageType,
  options: Partial<Omit<DamageTypeDefinition, "id" | "label">> = {},
): DamageTypeDefinition {
  return {
    id,
    label: DAMAGE_TYPE_LABELS[id],
    requiresDamage: options.requiresDamage ?? true,
    requiresHitLocation: options.requiresHitLocation ?? true,
    requiresAdditionalPenalty: options.requiresAdditionalPenalty ?? false,
    requiresDamageReduction: options.requiresDamageReduction ?? false,
    requiresFireSource: options.requiresFireSource ?? false,
    supportedTargets: options.supportedTargets ?? ["NPC", "Vehicle"],
  };
}

export function passthroughRule(def: DamageTypeDefinition): DamageTypeRule {
  return {
    definition: def,
    modifyArmour: (context) => context,
    modifyDamageThroughArmor: (context) => context,
    modifyFinalDamage: (context) => context,
  };
}

export function halve(value: number): number {
  return floorDamage(value / 2);
}
