import type { BodyLocation } from "../sheets/components";
import type { CombatSheet } from "../sheets/CombatSheet";
import type { CombatEvent } from "../../events/EventTypes";
import type { DiceRollResult } from "../../services/DiceService";
import type { WoundState } from "../rules/WoundState";

export interface DamageOutcome {
  rawDamage: number;
  effectiveSp?: number;
  penetratedArmor: boolean;
  damageThroughArmor?: number;
  btm?: number;
  finalDamage: number;
  armourAblation?: number;
  appliedTo: "bodyPart" | "totalDamage" | "sdp";
  bodyPart?: BodyLocation;
}

export interface StunOutcome {
  roll: number;
  threshold: number;
  succeeded: boolean;
  stunned: boolean;
}

export interface DeathOutcome {
  roll: number;
  threshold: number;
  succeeded: boolean;
  dead: boolean;
  usedBaseSave?: boolean;
}

export interface MassiveDamageOutcome {
  bodyPart: BodyLocation;
  destroyed: boolean;
  instantDeath?: boolean;
  deathSave?: DeathOutcome;
}

export interface ResolutionEvent {
  type: CombatEvent;
  payload: Record<string, unknown>;
}

export interface ResolutionResult {
  success: boolean;
  summary: string;
  errors: string[];
  warnings: string[];
  events: ResolutionEvent[];
  diceRolls: DiceRollResult[];
  damage?: DamageOutcome;
  stun?: StunOutcome;
  death?: DeathOutcome;
  disabledBodyParts: BodyLocation[];
  destroyedBodyParts: BodyLocation[];
  massiveDamage?: MassiveDamageOutcome;
  pendingEffects?: string[];
  woundState?: WoundState;
  nextSheet?: CombatSheet;
  reminders: string[];
}
