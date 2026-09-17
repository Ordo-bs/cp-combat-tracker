export enum CombatEvent {
  CombatantAdded = "CombatantAdded",
  CombatantRemoved = "CombatantRemoved",
  CombatantDuplicated = "CombatantDuplicated",
  InitiativeUpdated = "InitiativeUpdated",
  InitiativeCommitted = "InitiativeCommitted",
  QueueRebuilt = "QueueRebuilt",
  TurnAdvanced = "TurnAdvanced",
  TurnReversed = "TurnReversed",
  EncounterCleared = "EncounterCleared",
  StatusChanged = "StatusChanged",
  AmmoChanged = "AmmoChanged",
  CombatSheetUpdated = "CombatSheetUpdated",
  EncounterChanged = "EncounterChanged",
  CombatActionExecuted = "CombatActionExecuted",
  CombatLogUpdated = "CombatLogUpdated",
  CombatantDamaged = "CombatantDamaged",
  BodyPartDamaged = "BodyPartDamaged",
  BodyPartDisabled = "BodyPartDisabled",
  BodyPartDestroyed = "BodyPartDestroyed",
  ArmorAblated = "ArmorAblated",
  StunStateChanged = "StunStateChanged",
  DeathStateChanged = "DeathStateChanged",
  WoundStateChanged = "WoundStateChanged",
  OngoingEffectAdded = "OngoingEffectAdded",
  OngoingEffectResolved = "OngoingEffectResolved",
  OngoingEffectRemoved = "OngoingEffectRemoved",
  VehicleDestroyed = "VehicleDestroyed",
}

export interface CombatantEventPayload {
  combatantId: string;
}

export interface InitiativeUpdatedPayload extends CombatantEventPayload {
  pending: number;
}

export interface AmmoChangedPayload extends CombatantEventPayload {
  remainingShots: number;
  remainingMagazines: number;
}

import type { StatusType } from "../domain/status/StatusType";

export interface StatusChangedPayload extends CombatantEventPayload {
  statusType: StatusType;
  active: boolean;
}

export interface CombatActionExecutedPayload {
  actionType: string;
  combatantId?: string;
}

export type EventPayload =
  | CombatantEventPayload
  | InitiativeUpdatedPayload
  | AmmoChangedPayload
  | StatusChangedPayload
  | CombatActionExecutedPayload
  | Record<string, never>;

export type EventHandler = (payload: EventPayload) => void;
