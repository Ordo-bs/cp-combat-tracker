export interface SaveResolutionResult {
  roll: number;
  threshold: number;
  succeeded: boolean;
  statusChanged: boolean;
}

/** roll > save ⇒ failure; roll <= save ⇒ success. */
export function resolveSave(roll: number, saveValue: number): { succeeded: boolean } {
  return { succeeded: roll <= saveValue };
}

export interface IStunResolver {
  resolve(roll: number, modifiedStunSave: number): SaveResolutionResult;
}

export interface IDeathResolver {
  resolve(roll: number, modifiedDeathSave: number): SaveResolutionResult;
}

export class SaveResolver implements IStunResolver, IDeathResolver {
  resolve(roll: number, saveValue: number): SaveResolutionResult {
    const succeeded = resolveSave(roll, saveValue).succeeded;
    return {
      roll,
      threshold: saveValue,
      succeeded,
      statusChanged: !succeeded,
    };
  }
}

/** @deprecated Use SaveResolver */
export class PlaceholderStunResolver extends SaveResolver {}

/** @deprecated Use SaveResolver */
export class PlaceholderDeathResolver extends SaveResolver {}
