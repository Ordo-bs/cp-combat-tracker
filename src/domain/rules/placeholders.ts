/**
 * Seam interfaces for the forthcoming Hit/Damage Engine.
 * Concrete implementations will replace these placeholders.
 */

export interface HitResolutionResult {
  hit: boolean;
  roll?: number;
  targetNumber?: number;
}

export interface IHitResolver {
  resolve(input: unknown): HitResolutionResult;
}

export interface DamageResolutionResult {
  damage: number;
  location?: string;
}

export interface IDamageResolver {
  resolve(input: unknown): DamageResolutionResult;
}

export interface IStatusEffectResolver {
  resolve(input: unknown): unknown;
}

export interface IArmourResolver {
  resolve(input: unknown): unknown;
}

export interface IBodyLocationResolver {
  resolve(input: unknown): unknown;
}

export interface IRuleEngine {
  readonly name: string;
}

export interface IDamageEngine {
  // applyHit, applyExplosion, etc.
}

export interface IStatusEffectProcessor {
  process(input: unknown): unknown;
}

/** @deprecated Use IArmourResolver */
export interface IArmorPenetrationResolver {
  resolve(input: unknown): unknown;
}

/** @deprecated Use IBodyLocationResolver */
export interface IBodyPartDamageResolver {
  resolve(input: unknown): unknown;
}

export class PlaceholderHitResolver implements IHitResolver {
  resolve(): HitResolutionResult {
    return { hit: false };
  }
}

export class PlaceholderDamageResolver implements IDamageResolver {
  resolve(): DamageResolutionResult {
    return { damage: 0 };
  }
}

export class PlaceholderStatusEffectResolver implements IStatusEffectResolver {
  resolve(input: unknown): unknown {
    return input;
  }
}

export class PlaceholderArmourResolver implements IArmourResolver {
  resolve(input: unknown): unknown {
    return input;
  }
}

export class PlaceholderBodyLocationResolver implements IBodyLocationResolver {
  resolve(input: unknown): unknown {
    return input;
  }
}
