export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validationSuccess(warnings: string[] = []): ValidationResult {
  return { valid: true, errors: [], warnings };
}

export function validationFailure(errors: string[], warnings: string[] = []): ValidationResult {
  return { valid: false, errors, warnings };
}

export interface IValidationService {
  validateInitiative(value: number): ValidationResult;
  validateAmmoConsumption(remainingShots: number, amount: number): ValidationResult;
  validateReload(remainingMagazines: number): ValidationResult;
  validateName(name: string): ValidationResult;
  validateDamage(value: number): ValidationResult;
  validateBtm(value: number): ValidationResult;
  validateAmmo(maximumShots: number, remainingShots: number, remainingMagazines: number): ValidationResult;
  validateCombatSheet(sheet: import("../domain/sheets/CombatSheet").CombatSheet): ValidationResult;
}
