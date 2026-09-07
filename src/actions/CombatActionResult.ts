export interface CombatActionResult<TData = void> {
  success: boolean;
  errors: string[];
  warnings: string[];
  data?: TData;
}

export function actionSuccess<TData = void>(
  data?: TData,
  warnings: string[] = [],
): CombatActionResult<TData> {
  return { success: true, errors: [], warnings, data };
}

export function actionFailure<TData = void>(
  errors: string[],
  warnings: string[] = [],
  data?: TData,
): CombatActionResult<TData> {
  return { success: false, errors, warnings, data };
}

export function fromValidationResult<TData = void>(
  valid: boolean,
  errors: string[],
  warnings: string[] = [],
  data?: TData,
): CombatActionResult<TData> {
  return valid ? actionSuccess(data, warnings) : actionFailure(errors, warnings);
}
