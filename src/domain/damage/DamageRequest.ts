import type { BodyLocation } from "../sheets/components";
import type { DamageType } from "./DamageTypes";
import type { FireSource } from "./FireSource";

export interface DamageRequest {
  targetId: string;
  damageType: DamageType;
  rawDamage?: number;
  hitLocation?: BodyLocation;
  additionalPenalty?: number;
  damageReduction?: number;
  fireSource?: FireSource;
  fireLocations?: BodyLocation[];
}

export interface StunRequest {
  targetId: string;
  additionalPenalty?: number;
}

export interface DeathRequest {
  targetId: string;
}
