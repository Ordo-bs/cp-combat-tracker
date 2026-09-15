import type { BodyLocation } from "../sheets/components";
import type { FireSource } from "./FireSource";

export type OngoingEffectType = "acid" | "fire";

export interface OngoingEffectBase {
  id: string;
  type: OngoingEffectType;
  targetId: string;
  location?: BodyLocation;
  createdAtActivation: number;
  nextApplicationActivation: number;
  applicationsRemaining: number;
  totalApplications: number;
  lastProcessedActivation?: number;
}

export interface AcidEffect extends OngoingEffectBase {
  type: "acid";
}

export interface FireEffect extends OngoingEffectBase {
  type: "fire";
  source: FireSource;
  locations?: BodyLocation[];
}

export type OngoingEffect = AcidEffect | FireEffect;
