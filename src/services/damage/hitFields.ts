import type { DamageType } from "../../domain/damage/DamageTypes";
import type { FireSource } from "../../domain/damage/FireSource";
import { fireLocationCount } from "../../domain/damage/FireSource";
import type { DamageTypeDefinition } from "./DamageTypeRule";

export interface VisibleHitFields {
  hitLocation: boolean;
  hitDamage: boolean;
  damageReduction: boolean;
  additionalPenalty: boolean;
  fireSource: boolean;
  fireLocationCount: 0 | 1 | 2;
}

export function getVisibleHitFields(
  definition: DamageTypeDefinition,
  options: { isVehicle: boolean; fireSource?: FireSource },
): VisibleHitFields {
  const fireCount = options.fireSource ? fireLocationCount(options.fireSource) : 0;
  return {
    hitLocation: definition.requiresHitLocation && !options.isVehicle,
    hitDamage: definition.requiresDamage,
    damageReduction: definition.requiresDamageReduction,
    additionalPenalty: definition.requiresAdditionalPenalty,
    fireSource: definition.requiresFireSource,
    fireLocationCount: definition.id === ("fire" satisfies DamageType) ? fireCount : 0,
  };
}
