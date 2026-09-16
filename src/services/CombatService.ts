import { findCombatSheet, uniqueCombatantName, type CombatEncounter } from "../domain/combat/CombatEncounter";
import { isNpcSheet, type CombatSheet } from "../domain/sheets/CombatSheet";
import { setStatus } from "../domain/status/Status";
import { StatusType } from "../domain/status/StatusType";
import { CombatEvent } from "../events/EventTypes";
import type { EventDispatcher } from "../events/EventDispatcher";
import type { IEncounterRepository } from "../infrastructure/repository/IEncounterRepository";
import {
  CloneInitiativeOption,
  type CombatSheetFactory,
} from "./CombatSheetFactory";
import type { EncounterService } from "./EncounterService";
import type { InitiativeService } from "./InitiativeService";
import type { IValidationService, ValidationResult } from "./ValidationService";
import type { DamageEngine } from "./damage/DamageEngine";
import type { DamageRequest, DeathRequest, StunRequest } from "../domain/damage/DamageRequest";
import type { ResolutionResult } from "../domain/damage/DamageResult";
import { hasUnresolvedPendingEffects } from "../domain/damage/sheetEffects";

export interface ICombatService {
  addCombatant(sheet: CombatSheet): ValidationResult;
  removeCombatant(combatantId: string): ValidationResult;
  cloneCombatant(combatantId: string, initiativeOption?: CloneInitiativeOption): ValidationResult;
  consumeAmmo(combatantId: string, amount: number): ValidationResult;
  reload(combatantId: string): ValidationResult;
  setCombatantStatus(combatantId: string, statusType: StatusType, active: boolean): ValidationResult;
  updateCombatSheet(combatantId: string, sheet: CombatSheet): ValidationResult;
  confirmDraft(sheet: CombatSheet): ValidationResult;
  getEncounter(): CombatEncounter;
}

export class CombatService implements ICombatService {
  constructor(
    private readonly repository: IEncounterRepository,
    private readonly encounterService: EncounterService,
    private readonly initiativeService: InitiativeService,
    private readonly validationService: IValidationService,
    private readonly factory: CombatSheetFactory,
    private readonly dispatcher: EventDispatcher,
    private readonly damageEngine?: DamageEngine,
  ) {}

  addCombatant(sheet: CombatSheet): ValidationResult {
    const nameValidation = this.validationService.validateName(sheet.name);
    if (!nameValidation.valid) {
      return nameValidation;
    }

    const encounter = this.encounterService.getCurrent();
    sheet.name = uniqueCombatantName(
      sheet.name,
      encounter.participants.map((participant) => participant.name),
    );
    encounter.participants.push(sheet);
    this.initiativeService.insertCombatant(sheet.id);

    if (!encounter.activeCombatantId) {
      encounter.activeCombatantId = sheet.id;
    }

    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.CombatantAdded, { combatantId: sheet.id });
    this.dispatcher.publish(CombatEvent.EncounterChanged, {});
    return nameValidation;
  }

  removeCombatant(combatantId: string): ValidationResult {
    const encounter = this.encounterService.getCurrent();
    const index = encounter.participants.findIndex((sheet) => sheet.id === combatantId);
    if (index < 0) {
      return { valid: false, errors: ["Combatant not found."], warnings: [] };
    }

    encounter.participants.splice(index, 1);
    this.initiativeService.removeCombatant(combatantId);

    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.CombatantRemoved, { combatantId });
    this.dispatcher.publish(CombatEvent.EncounterChanged, {});
    return { valid: true, errors: [], warnings: [] };
  }

  cloneCombatant(
    combatantId: string,
    initiativeOption = CloneInitiativeOption.REROLL,
  ): ValidationResult {
    const encounter = this.encounterService.getCurrent();
    const source = findCombatSheet(encounter, combatantId);
    if (!source) {
      return { valid: false, errors: ["Combatant not found."], warnings: [] };
    }

    const clone = this.factory.clone(source, initiativeOption);
    return this.addCombatant(clone);
  }

  consumeAmmo(combatantId: string, amount: number): ValidationResult {
    const encounter = this.encounterService.getCurrent();
    const sheet = findCombatSheet(encounter, combatantId);
    if (!sheet || !isNpcSheet(sheet)) {
      return { valid: false, errors: ["NPC combat sheet required."], warnings: [] };
    }

    const validation = this.validationService.validateAmmoConsumption(
      sheet.ammo.remainingShots,
      amount,
    );
    if (!validation.valid) {
      return validation;
    }

    sheet.ammo.remainingShots -= amount;
    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.AmmoChanged, {
      combatantId,
      remainingShots: sheet.ammo.remainingShots,
      remainingMagazines: sheet.ammo.remainingMagazines,
    });
    this.dispatcher.publish(CombatEvent.CombatSheetUpdated, { combatantId });
    return validation;
  }

  reload(combatantId: string): ValidationResult {
    const encounter = this.encounterService.getCurrent();
    const sheet = findCombatSheet(encounter, combatantId);
    if (!sheet || !isNpcSheet(sheet)) {
      return { valid: false, errors: ["NPC combat sheet required."], warnings: [] };
    }

    if (sheet.ammo.remainingShots >= sheet.ammo.maximumShots) {
      return { valid: true, errors: [], warnings: [] };
    }

    const validation = this.validationService.validateReload(sheet.ammo.remainingMagazines);
    if (!validation.valid) {
      return validation;
    }

    sheet.ammo.remainingMagazines -= 1;
    sheet.ammo.remainingShots = sheet.ammo.maximumShots;

    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.AmmoChanged, {
      combatantId,
      remainingShots: sheet.ammo.remainingShots,
      remainingMagazines: sheet.ammo.remainingMagazines,
    });
    this.dispatcher.publish(CombatEvent.CombatSheetUpdated, { combatantId });
    return validation;
  }

  setCombatantStatus(
    combatantId: string,
    statusType: StatusType,
    active: boolean,
  ): ValidationResult {
    const encounter = this.encounterService.getCurrent();
    const sheet = findCombatSheet(encounter, combatantId);
    if (!sheet) {
      return { valid: false, errors: ["Combatant not found."], warnings: [] };
    }

    sheet.statuses = setStatus(sheet.statuses, statusType, active);
    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.StatusChanged, {
      combatantId,
      statusType,
      active,
    });
    this.dispatcher.publish(CombatEvent.CombatSheetUpdated, { combatantId });
    return { valid: true, errors: [], warnings: [] };
  }

  getEncounter(): CombatEncounter {
    return this.encounterService.getCurrent();
  }

  updateCombatSheet(combatantId: string, sheet: CombatSheet): ValidationResult {
    if (sheet.id !== combatantId) {
      return { valid: false, errors: ["Combatant ID mismatch."], warnings: [] };
    }

    const validation = this.validationService.validateCombatSheet(sheet);
    if (!validation.valid) {
      return validation;
    }

    const encounter = this.encounterService.getCurrent();
    const index = encounter.participants.findIndex((entry) => entry.id === combatantId);
    if (index < 0) {
      return { valid: false, errors: ["Combatant not found."], warnings: [] };
    }

    encounter.participants[index] = structuredClone(sheet);
    void this.repository.replace({ ...encounter });
    this.dispatcher.publish(CombatEvent.CombatSheetUpdated, { combatantId });
    this.dispatcher.publish(CombatEvent.EncounterChanged, {});
    return validation;
  }

  confirmDraft(sheet: CombatSheet): ValidationResult {
    const validation = this.validationService.validateCombatSheet(sheet);
    if (!validation.valid) {
      return validation;
    }
    return this.addCombatant(sheet);
  }

  resolveHit(request: DamageRequest): ResolutionResult {
    return this.runDamage((engine, sheet) => engine.resolveHit(sheet, request), request.targetId);
  }

  resolveStun(request: StunRequest): ResolutionResult {
    return this.runDamage((engine, sheet) => engine.resolveStun(sheet, request), request.targetId);
  }

  resolveDeath(request: DeathRequest): ResolutionResult {
    return this.runDamage((engine, sheet) => engine.resolveDeath(sheet, request), request.targetId);
  }

  applyPendingEffects(combatantId: string): ResolutionResult {
    return this.runDamage((engine, sheet) => engine.resolvePendingEffects(sheet), combatantId);
  }

  hasBlockingPendingEffects(combatantId?: string): boolean {
    const encounter = this.encounterService.getCurrent();
    const id = combatantId ?? encounter.activeCombatantId;
    if (!id) {
      return false;
    }
    const sheet = findCombatSheet(encounter, id);
    return sheet ? hasUnresolvedPendingEffects(sheet) : false;
  }

  private runDamage(
    resolve: (engine: DamageEngine, sheet: CombatSheet) => ResolutionResult,
    targetId: string,
  ): ResolutionResult {
    if (!this.damageEngine) {
      return {
        success: false,
        summary: "Damage engine is not configured.",
        errors: ["Damage engine is not configured."],
        warnings: [],
        events: [],
        diceRolls: [],
        disabledBodyParts: [],
        destroyedBodyParts: [],
        reminders: [],
      };
    }
    const encounter = this.encounterService.getCurrent();
    const sheet = findCombatSheet(encounter, targetId);
    if (!sheet) {
      return {
        success: false,
        summary: "Combatant not found.",
        errors: ["Combatant not found."],
        warnings: [],
        events: [],
        diceRolls: [],
        disabledBodyParts: [],
        destroyedBodyParts: [],
        reminders: [],
      };
    }
    const result = resolve(this.damageEngine, sheet);
    if (!result.success || !result.nextSheet) {
      return result;
    }
    const index = encounter.participants.findIndex((entry) => entry.id === targetId);
    if (index < 0) {
      return { ...result, success: false, errors: ["Combatant not found."] };
    }
    encounter.participants[index] = result.nextSheet;
    void this.repository.replace({ ...encounter });
    for (const event of result.events) {
      this.dispatcher.publish(event.type, event.payload as never);
    }
    this.dispatcher.publish(CombatEvent.CombatSheetUpdated, { combatantId: targetId });
    this.dispatcher.publish(CombatEvent.EncounterChanged, {});
    return result;
  }
}
