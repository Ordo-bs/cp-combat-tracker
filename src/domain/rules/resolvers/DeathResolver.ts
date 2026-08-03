import type { SaveResolutionResult } from "./StunResolver";

export interface IDeathResolver {
  resolve(roll: number, modifiedDeathSave: number): SaveResolutionResult;
}

export class PlaceholderDeathResolver implements IDeathResolver {
  resolve(roll: number, modifiedDeathSave: number): SaveResolutionResult {
    const succeeded = roll <= modifiedDeathSave;
    return {
      roll,
      threshold: modifiedDeathSave,
      succeeded,
      statusChanged: !succeeded,
    };
  }
}
