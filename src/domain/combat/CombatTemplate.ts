import { CombatSheetType } from "../combat/CombatSheetType";
import type { BodyLocation } from "../sheets/components";

export interface TemplateMetadata {
  vaultPath: string;
  fileName: string;
  displayName: string;
  blockStartLine: number;
}

export interface BodyPartTemplate {
  sp: number;
  damage: number;
  destroyed: boolean;
  isHardSp: boolean;
  cybernetic: boolean;
  sdp: number;
  disabled: boolean;
  hydraulicRams: boolean;
  reinforcedJoints: boolean;
  thickenedMyomar: boolean;
  empShielding: boolean;
}

export type BodyTemplateMap = Record<BodyLocation, BodyPartTemplate>;

export interface BaseCombatTemplate {
  version: number;
  sheetType: CombatSheetType;
  name: string;
  initiativeModifier: number;
  metadata: TemplateMetadata;
}

export interface NpcCombatTemplate extends BaseCombatTemplate {
  sheetType: CombatSheetType.NPC;
  btm: number;
  maximumShots: number;
  remainingShots: number;
  remainingMagazines: number;
  baseStunSave: number;
  totalDamage: number;
  hasSandevistan: boolean;
  hasPainEditor: boolean;
  hasAdrenalBooster: boolean;
  body: BodyTemplateMap;
}

export interface PcCombatTemplate extends BaseCombatTemplate {
  sheetType: CombatSheetType.PC;
}

export interface VehicleCombatTemplate extends BaseCombatTemplate {
  sheetType: CombatSheetType.VEHICLE;
  sp: number;
  sdp: number;
}

export type CombatTemplate = NpcCombatTemplate | PcCombatTemplate | VehicleCombatTemplate;

export interface TemplateParseError {
  file?: string;
  line?: number;
  field?: string;
  message: string;
}

export interface TemplateParseResult {
  success: boolean;
  template?: CombatTemplate;
  errors: TemplateParseError[];
  warnings: string[];
}

export function isNpcTemplate(template: CombatTemplate): template is NpcCombatTemplate {
  return template.sheetType === CombatSheetType.NPC;
}

export function isPcTemplate(template: CombatTemplate): template is PcCombatTemplate {
  return template.sheetType === CombatSheetType.PC;
}

export function isVehicleTemplate(template: CombatTemplate): template is VehicleCombatTemplate {
  return template.sheetType === CombatSheetType.VEHICLE;
}
