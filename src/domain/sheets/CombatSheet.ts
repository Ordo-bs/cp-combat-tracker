import { CombatSheetType } from "../combat/CombatSheetType";
import type { Initiative } from "../combat/Initiative";
import type { RuntimeMetadata } from "../combat/RuntimeMetadata";
import type { StatusCollectionData } from "../status/Status";
import { WoundState } from "../rules/WoundState";
import type {
  AcidTracker,
  AmmoComponent,
  BodyComponent,
  DamageComponent,
  FireTracker,
  TrackerComponent,
} from "./components";

export interface CombatSheetBase {
  id: string;
  name: string;
  initiative: Initiative;
  statuses: StatusCollectionData;
  runtimeMetadata: RuntimeMetadata;
}

export interface PcCombatSheet extends CombatSheetBase {
  sheetType: CombatSheetType.PC;
  woundState: WoundState;
  acidTracker: AcidTracker;
  fireTracker: FireTracker;
}

export interface NpcCombatSheet extends CombatSheetBase {
  sheetType: CombatSheetType.NPC;
  ammo: AmmoComponent;
  body: BodyComponent;
  damage: DamageComponent;
  trackers: TrackerComponent;
}

export interface VehicleCombatSheet extends CombatSheetBase {
  sheetType: CombatSheetType.VEHICLE;
  sp: number;
  sdp: number;
  acidTracker: AcidTracker;
}

export type CombatSheet = PcCombatSheet | NpcCombatSheet | VehicleCombatSheet;

export function isPcSheet(sheet: CombatSheet): sheet is PcCombatSheet {
  return sheet.sheetType === CombatSheetType.PC;
}

export function isNpcSheet(sheet: CombatSheet): sheet is NpcCombatSheet {
  return sheet.sheetType === CombatSheetType.NPC;
}

export function isVehicleSheet(sheet: CombatSheet): sheet is VehicleCombatSheet {
  return sheet.sheetType === CombatSheetType.VEHICLE;
}

export function getSheetCreationOrder(sheet: CombatSheet): number {
  return sheet.runtimeMetadata.createdAt;
}
