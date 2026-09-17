import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { createInitiative } from "../domain/combat/Initiative";
import type { CombatTemplate, NpcCombatTemplate } from "../domain/combat/CombatTemplate";
import { createRuntimeMetadataDefaults, type RuntimeMetadata } from "../domain/combat/RuntimeMetadata";
import { WoundState } from "../domain/rules/WoundState";
import { createEmptyStatusCollection } from "../domain/status/Status";
import { isNpcSheet, type CombatSheet, type NpcCombatSheet, type PcCombatSheet, type VehicleCombatSheet } from "../domain/sheets/CombatSheet";
import {
  BodyLocation,
  createAmmoComponent,
  createBodyComponent,
  createBodyPart,
  createCyberneticProperties,
  createDamageComponent,
  createTrackerComponent,
} from "../domain/sheets/components";
import { generateId } from "../util/uuid";
import { allowsCyberneticLimbOptions } from "../domain/damage/sheetEffects";
import type { IDiceService } from "./DiceService";

export interface ICombatSheetFactory {
  createDraft(type: CombatSheetType, name: string, initiative?: number): CombatSheet;
  createEmptyDraft(type: CombatSheetType, name?: string, initiative?: number): CombatSheet;
  clone(source: CombatSheet, initiativeOption?: CloneInitiativeOption): CombatSheet;
  instantiateFromTemplate(template: CombatTemplate): CombatSheet;
}

export enum CloneInitiativeOption {
  KEEP = "KEEP",
  REROLL = "REROLL",
  BLANK = "BLANK",
}

export class CombatSheetFactory implements ICombatSheetFactory {
  constructor(private readonly diceService: IDiceService) {}

  createDraft(type: CombatSheetType, name: string, initiative = 0): CombatSheet {
    const metadata = this.createMetadata(name);
    const base = {
      id: metadata.instanceId,
      name,
      initiative: createInitiative(initiative),
      statuses: createEmptyStatusCollection(),
      runtimeMetadata: metadata,
    };

    switch (type) {
      case CombatSheetType.PC:
        return {
          ...base,
          sheetType: CombatSheetType.PC,
          woundState: WoundState.NONE,
          ongoingEffects: [],
        } satisfies PcCombatSheet;
      case CombatSheetType.NPC:
        return {
          ...base,
          sheetType: CombatSheetType.NPC,
          ammo: createAmmoComponent(),
          body: createBodyComponent(),
          damage: createDamageComponent(),
          trackers: createTrackerComponent(),
        } satisfies NpcCombatSheet;
      case CombatSheetType.VEHICLE:
        return {
          ...base,
          sheetType: CombatSheetType.VEHICLE,
          sp: 0,
          sdp: 0,
          isDestroyed: false,
          ongoingEffects: [],
        } satisfies VehicleCombatSheet;
    }
  }

  /** Draft for the + Add editor: mandatory stats start unset so the form is blank. */
  createEmptyDraft(type: CombatSheetType, name = "", initiative = Number.NaN): CombatSheet {
    const sheet = this.createDraft(type, name, initiative);
    if (isNpcSheet(sheet)) {
      sheet.damage.btm = Number.NaN;
      sheet.damage.baseStunSave = Number.NaN;
      sheet.damage.baseDeathSave = Number.NaN;
    }
    return sheet;
  }

  clone(source: CombatSheet, initiativeOption = CloneInitiativeOption.KEEP): CombatSheet {
    const metadata = this.createMetadata(
      source.name,
      source.runtimeMetadata.templateId,
      source.runtimeMetadata.templateName,
    );
    const cloned = structuredClone(source);
    cloned.id = metadata.instanceId;
    cloned.runtimeMetadata = {
      ...metadata,
      activationSequence: 0,
      taserHitActivations: [],
    };

    switch (initiativeOption) {
      case CloneInitiativeOption.KEEP:
        cloned.initiative = { ...source.initiative };
        break;
      case CloneInitiativeOption.REROLL:
        cloned.initiative = createInitiative(this.diceService.d10());
        break;
      case CloneInitiativeOption.BLANK:
        cloned.initiative = createInitiative(0);
        break;
    }

    return cloned;
  }

  instantiateFromTemplate(template: CombatTemplate): CombatSheet {
    const rolledInitiative = this.diceService.d10() + template.initiativeModifier;
    const metadata = this.createMetadata(template.name, template.metadata.vaultPath, template.name);
    const base = {
      id: metadata.instanceId,
      name: template.name,
      initiative: createInitiative(rolledInitiative),
      statuses: createEmptyStatusCollection(),
      runtimeMetadata: metadata,
    };

    switch (template.sheetType) {
      case CombatSheetType.PC:
        return {
          ...base,
          sheetType: CombatSheetType.PC,
          woundState: WoundState.NONE,
          ongoingEffects: [],
        } satisfies PcCombatSheet;
      case CombatSheetType.VEHICLE:
        return {
          ...base,
          sheetType: CombatSheetType.VEHICLE,
          sp: template.sp,
          sdp: template.sdp,
          isDestroyed: false,
          ongoingEffects: [],
        } satisfies VehicleCombatSheet;
      case CombatSheetType.NPC:
        return {
          ...base,
          sheetType: CombatSheetType.NPC,
          ammo: createAmmoComponent(
            template.maximumShots,
            template.remainingShots,
            template.remainingMagazines,
          ),
          body: this.bodyFromTemplate(template),
          damage: {
            ...createDamageComponent(),
            btm: template.btm,
            totalDamage: template.totalDamage,
            baseStunSave: template.baseStunSave,
            baseDeathSave: template.baseStunSave,
          },
          trackers: {
            hasSandevistan: template.hasSandevistan,
            hasPainEditor: template.hasPainEditor,
            hasAdrenalBooster: template.hasAdrenalBooster,
          },
        } satisfies NpcCombatSheet;
    }
  }

  private bodyFromTemplate(template: NpcCombatTemplate): NpcCombatSheet["body"] {
    const body = createBodyComponent();
    return body.map((part) => {
      const source = template.body[part.location as BodyLocation];
      if (!source) {
        return part;
      }
      return {
        ...createBodyPart(part.location),
        sp: source.sp,
        damage: source.damage,
        destroyed: source.destroyed,
        isHardSp: source.isHardSp,
        cybernetic: source.cybernetic,
        cyberneticProperties: source.cybernetic
          ? {
              ...createCyberneticProperties(),
              disabled: source.disabled,
              hydraulicRams: allowsCyberneticLimbOptions(part.location) && source.hydraulicRams,
              reinforcedJoints: allowsCyberneticLimbOptions(part.location) && source.reinforcedJoints,
              thickenedMyomar: allowsCyberneticLimbOptions(part.location) && source.thickenedMyomar,
              empShielding: source.empShielding,
            }
          : undefined,
      };
    });
  }

  private createMetadata(
    templateName: string,
    templateId?: string,
    existingTemplateName?: string,
  ): RuntimeMetadata {
    return {
      instanceId: generateId(),
      templateId,
      templateName: existingTemplateName ?? templateName,
      createdAt: Date.now(),
      ...createRuntimeMetadataDefaults(),
    };
  }
}
