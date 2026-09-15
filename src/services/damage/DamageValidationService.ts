import type { DamageRequest } from "../../domain/damage/DamageRequest";
import { fireLocationCount } from "../../domain/damage/FireSource";
import { isNpcSheet, isVehicleSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import type { DamageTypeRegistry } from "./DamageTypeRegistry";

export class DamageValidationService {
  constructor(private readonly registry: DamageTypeRegistry) {}

  validateHit(sheet: CombatSheet, request: DamageRequest): string[] {
    const errors: string[] = [];
    const rule = this.registry.get(request.damageType);
    const definition = rule.definition;
    const targetType = isNpcSheet(sheet) ? "NPC" : isVehicleSheet(sheet) ? "Vehicle" : null;

    if (!targetType) {
      errors.push("Hit resolution is not supported for PCs.");
      return errors;
    }

    if (!definition.supportedTargets.includes(targetType)) {
      errors.push(`Invalid damage type for target: ${definition.label}.`);
    }

    if (isNpcSheet(sheet) && sheet.damage.isDead && request.damageType !== "acid" && request.damageType !== "fire") {
      // Hits on dead NPCs are allowed for state visibility, but Death action is not.
    }

    if (isVehicleSheet(sheet) && (request.damageType === "stun" || request.damageType === "taserStunN")) {
      errors.push("Stun and Taser/Stun-N are unsupported for Vehicles.");
    }

    if (definition.requiresDamage) {
      if (request.rawDamage === undefined || !Number.isInteger(request.rawDamage) || request.rawDamage < 0) {
        errors.push("Hit damage must be a non-negative integer.");
      }
    }

    if (definition.requiresDamageReduction) {
      if (
        request.damageReduction === undefined ||
        !Number.isInteger(request.damageReduction) ||
        request.damageReduction < 0
      ) {
        errors.push("Damage reduction must be a non-negative integer.");
      }
    }

    if (definition.requiresHitLocation && isNpcSheet(sheet) && !request.hitLocation) {
      errors.push("Missing hit location.");
    }

    if (definition.requiresAdditionalPenalty && request.additionalPenalty !== undefined) {
      if (!Number.isInteger(request.additionalPenalty)) {
        errors.push("Additional penalty must be an integer.");
      }
    }

    if (definition.requiresFireSource) {
      if (!request.fireSource) {
        errors.push("Missing fire source.");
      } else {
        const locationsNeeded = fireLocationCount(request.fireSource);
        const provided = request.fireLocations ?? (request.hitLocation ? [request.hitLocation] : []);
        if (locationsNeeded === 1 && provided.length !== 1) {
          errors.push("Flare requires a body part.");
        }
        if (locationsNeeded === 2) {
          if (provided.length !== 2 || provided[0] === provided[1]) {
            errors.push("Kendachi Dragon requires two different body parts.");
          }
        }
      }
    }

    return errors;
  }
}
