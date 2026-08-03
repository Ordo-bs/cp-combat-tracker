import { CombatSheetType } from "../domain/combat/CombatSheetType";
import type { CombatSheet } from "../domain/sheets/CombatSheet";
import { isNpcSheet, isPcSheet, isVehicleSheet } from "../domain/sheets/CombatSheet";
import {
  type IValidationService,
  validationFailure,
  validationSuccess,
  type ValidationResult,
} from "./ValidationService";

const ALLOWED_BTM = new Set([0, -1, -2, -3, -4, -5]);

export class ValidationService implements IValidationService {  validateInitiative(value: number): ValidationResult {
    if (!Number.isInteger(value)) {
      return validationFailure(["Initiative must be an integer."]);
    }
    if (value < 0) {
      return validationFailure(["Initiative cannot be negative."]);
    }
    return validationSuccess();
  }

  validateAmmoConsumption(remainingShots: number, amount: number): ValidationResult {
    if (amount <= 0) {
      return validationFailure(["Amount must be greater than zero."]);
    }
    if (remainingShots < amount) {
      return validationFailure(["Insufficient ammunition."]);
    }
    return validationSuccess();
  }

  validateReload(remainingMagazines: number): ValidationResult {
    if (remainingMagazines <= 0) {
      return validationFailure(["No magazines remaining."]);
    }
    return validationSuccess();
  }

  validateName(name: string): ValidationResult {
    const trimmed = name.trim();
    if (!trimmed) {
      return validationFailure(["Name cannot be empty."]);
    }
    return validationSuccess();
  }

  validateDamage(value: number): ValidationResult {
    if (!Number.isInteger(value) || value < 0) {
      return validationFailure(["Damage must be a non-negative integer."]);
    }
    return validationSuccess();
  }

  validateBtm(value: number): ValidationResult {
    if (!ALLOWED_BTM.has(value)) {
      return validationFailure(["BTM must be between 0 and -5."]);
    }
    return validationSuccess();
  }

  validateAmmo(
    maximumShots: number,
    remainingShots: number,
    remainingMagazines: number,
  ): ValidationResult {
    const errors: string[] = [];
    if (!Number.isInteger(maximumShots) || maximumShots < 0) {
      errors.push("Maximum shots must be a non-negative integer.");
    }
    if (!Number.isInteger(remainingShots) || remainingShots < 0) {
      errors.push("Remaining shots must be a non-negative integer.");
    }
    if (!Number.isInteger(remainingMagazines) || remainingMagazines < 0) {
      errors.push("Remaining magazines must be a non-negative integer.");
    }
    if (remainingShots > maximumShots) {
      errors.push("Remaining shots cannot exceed maximum shots.");
    }
    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  validateCombatSheet(sheet: CombatSheet): ValidationResult {
    const errors: string[] = [];

    const nameResult = this.validateName(sheet.name);
    errors.push(...nameResult.errors);

    const initiativeResult = this.validateInitiative(sheet.initiative.pending);
    errors.push(...initiativeResult.errors);

    if (isPcSheet(sheet)) {
      // PC wound state is manual; no extra validation beyond enum presence.
    }

    if (isNpcSheet(sheet)) {
      errors.push(...this.validateDamage(sheet.damage.totalDamage).errors);
      errors.push(...this.validateBtm(sheet.damage.btm).errors);
      if (!Number.isInteger(sheet.damage.baseStunSave)) {
        errors.push("Base stun save must be an integer.");
      }
      if (!Number.isInteger(sheet.damage.baseDeathSave)) {
        errors.push("Base death save must be an integer.");
      }
      errors.push(
        ...this.validateAmmo(
          sheet.ammo.maximumShots,
          sheet.ammo.remainingShots,
          sheet.ammo.remainingMagazines,
        ).errors,
      );
    }

    if (isVehicleSheet(sheet)) {
      if (!Number.isInteger(sheet.sp) || sheet.sp < 0) {
        errors.push("SP must be a non-negative integer.");
      }
      if (!Number.isInteger(sheet.sdp) || sheet.sdp < 0) {
        errors.push("SDP must be a non-negative integer.");
      }
    }

    if (sheet.sheetType === CombatSheetType.PC && !isPcSheet(sheet)) {
      errors.push("Sheet type mismatch.");
    }
    if (sheet.sheetType === CombatSheetType.NPC && !isNpcSheet(sheet)) {
      errors.push("Sheet type mismatch.");
    }
    if (sheet.sheetType === CombatSheetType.VEHICLE && !isVehicleSheet(sheet)) {
      errors.push("Sheet type mismatch.");
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
