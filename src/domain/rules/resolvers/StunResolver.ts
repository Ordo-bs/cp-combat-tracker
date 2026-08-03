export interface SaveResolutionResult {
  roll: number;
  threshold: number;
  succeeded: boolean;
  statusChanged: boolean;
}

export interface IStunResolver {
  resolve(roll: number, modifiedStunSave: number): SaveResolutionResult;
}

export class PlaceholderStunResolver implements IStunResolver {
  resolve(roll: number, modifiedStunSave: number): SaveResolutionResult {
    const succeeded = roll <= modifiedStunSave;
    return {
      roll,
      threshold: modifiedStunSave,
      succeeded,
      statusChanged: !succeeded,
    };
  }
}
