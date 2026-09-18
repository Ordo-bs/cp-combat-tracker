import type { DamageRequest, DeathRequest, StunRequest } from "../../domain/damage/DamageRequest";
import type {
  DamageOutcome,
  DeathOutcome,
  ResolutionEvent,
  ResolutionResult,
} from "../../domain/damage/DamageResult";
import type { FireSource } from "../../domain/damage/FireSource";
import {
  fireApplicationCount,
  fireBypassesArmour,
  fireLocationCount,
  fireRequiresSoftSpThreshold,
  fireSoftAblation,
} from "../../domain/damage/FireSource";
import { floorDamage } from "../../domain/damage/floorDamage";
import type { AcidEffect, FireEffect, OngoingEffect } from "../../domain/damage/OngoingEffect";
import {
  cyberneticDestroyedThreshold,
  cyberneticDisabledThreshold,
  remainingCyberneticSdp,
  getOngoingEffects,
  hasUnresolvedPendingEffects,
  pendingEffectsForActivation,
  requireBodyPart,
  setOngoingEffects,
} from "../../domain/damage/sheetEffects";
import { DAMAGE_TYPE_LABELS, type DamageType } from "../../domain/damage/DamageTypes";
import { CombatEvent } from "../../events/EventTypes";
import {
  isNpcSheet,
  isVehicleSheet,
  type CombatSheet,
  type NpcCombatSheet,
  type VehicleCombatSheet,
} from "../../domain/sheets/CombatSheet";
import { WoundState } from "../../domain/rules/WoundState";
import { BodyLocation, type BodyPart } from "../../domain/sheets/components";
import { hasStatus, setStatus } from "../../domain/status/Status";
import { StatusType } from "../../domain/status/StatusType";
import { resolveSave } from "../../domain/rules/resolvers/SaveResolver";
import { generateId } from "../../util/uuid";
import type { ILogger } from "../../util/logger";
import type { DiceRollResult, IDiceService } from "../DiceService";
import type { IDamageThresholdService } from "../DamageThresholdService";
import type { DamageTypeRegistry } from "./DamageTypeRegistry";
import { DamageValidationService } from "./DamageValidationService";
import { rollFireDamage } from "./fireDice";
import { syncDerivedStatuses, terminateEffectsOnDeath } from "./statusSync";
import type { ArmourContext } from "./DamageTypeRule";

function emptyResult(): ResolutionResult {
  return {
    success: true,
    summary: "",
    errors: [],
    warnings: [],
    events: [],
    diceRolls: [],
    disabledBodyParts: [],
    destroyedBodyParts: [],
    reminders: [],
  };
}

function fail(errors: string[]): ResolutionResult {
  return {
    ...emptyResult(),
    success: false,
    summary: errors[0] ?? "Invalid request.",
    errors,
  };
}

export class DamageEngine {
  private readonly validator: DamageValidationService;

  constructor(
    private readonly registry: DamageTypeRegistry,
    private readonly dice: IDiceService,
    private readonly thresholds: IDamageThresholdService,
    private readonly logger?: ILogger,
  ) {
    this.validator = new DamageValidationService(registry);
  }

  resolveHit(sheet: CombatSheet, request: DamageRequest): ResolutionResult {
    const working = structuredClone(sheet);
    const errors = this.validator.validateHit(working, request);
    if (errors.length > 0) {
      return fail(errors);
    }

    if (request.damageType === "acid") {
      return this.finish(this.createAcidEffect(working, request));
    }
    if (request.damageType === "fire") {
      return this.finish(this.resolveFireHit(working, request));
    }
    if (request.damageType === "taserStunN") {
      return this.finish(this.resolveTaser(working as NpcCombatSheet, request));
    }
    if (request.damageType === "explosive") {
      return this.finish(this.resolveExplosive(working, request));
    }

    if (isVehicleSheet(working)) {
      return this.finish(this.resolveVehicleHit(working, request));
    }
    if (!isNpcSheet(working) || !request.hitLocation) {
      return fail(["NPC combat sheet and hit location required."]);
    }
    return this.finish(this.resolveNpcBodyHit(working, request, request.hitLocation));
  }

  resolveStun(sheet: CombatSheet, request: StunRequest): ResolutionResult {
    if (!isNpcSheet(sheet)) {
      return fail(["NPC combat sheet required."]);
    }
    if (sheet.damage.isDead) {
      return fail(["Stun action is disabled for dead NPCs."]);
    }
    const working = structuredClone(sheet);
    const derived = this.thresholds.derive(
      working.damage.totalDamage,
      working.damage.baseStunSave,
      working.damage.baseDeathSave,
    );
    if (derived.modifiedStunSave === null) {
      return fail(["Stun Save penalty is not defined for this total damage."]);
    }
    const threshold = derived.modifiedStunSave + (request.additionalPenalty ?? 0);
    const roll = this.dice.d10();
    const succeeded = resolveSave(roll, threshold).succeeded;
    const stunned = !succeeded;
    working.statuses = setStatus(working.statuses, StatusType.STUNNED, stunned);
    const result = emptyResult();
    result.diceRolls.push({ notation: "1d10", rolls: [roll], total: roll });
    result.stun = { roll, threshold, succeeded, stunned };
    result.nextSheet = working;
    result.events.push(this.event(CombatEvent.StunStateChanged, { combatantId: working.id, stunned }));
    result.summary = succeeded
      ? `Stun Save: ${roll} vs ${threshold} — succeeded. Target is not Stunned.`
      : `Stun Save: ${roll} vs ${threshold} — failed. Target is Stunned.`;
    return this.finish(result);
  }

  resolveDeath(sheet: CombatSheet, request: DeathRequest): ResolutionResult {
    if (!isNpcSheet(sheet)) {
      return fail(["NPC combat sheet required."]);
    }
    if (sheet.damage.isDead) {
      return fail(["Death action is disabled for dead NPCs."]);
    }
    const working = structuredClone(sheet);
    const useBaseSave = request.useBaseSave === true;
    let death: DeathOutcome;
    if (useBaseSave) {
      death = this.rollBaseDeathSave(working);
    } else {
      const derived = this.thresholds.derive(
        working.damage.totalDamage,
        working.damage.baseStunSave,
        working.damage.baseDeathSave,
      );
      if (derived.modifiedDeathSave === null) {
        return fail(["Death Save penalty is not defined for this total damage."]);
      }
      const roll = this.dice.d10();
      const threshold = derived.modifiedDeathSave;
      const succeeded = resolveSave(roll, threshold).succeeded;
      death = { roll, threshold, succeeded, dead: !succeeded };
    }
    const result = emptyResult();
    result.diceRolls.push({ notation: "1d10", rolls: [death.roll], total: death.roll });
    if (!death.succeeded) {
      working.damage.isDead = true;
      terminateEffectsOnDeath(working);
    }
    death = { ...death, dead: working.damage.isDead };
    result.death = death;
    result.nextSheet = working;
    result.events.push(
      this.event(CombatEvent.DeathStateChanged, { combatantId: working.id, isDead: working.damage.isDead }),
    );
    const label = useBaseSave ? "Mortal 0 Save" : "Death Save";
    result.summary = death.succeeded
      ? `${label}: ${death.roll} vs ${death.threshold} — succeeded.`
      : `${label}: ${death.roll} vs ${death.threshold} — failed. Target is DEAD.`;
    return this.finish(result);
  }

  resolvePendingEffects(sheet: CombatSheet): ResolutionResult {
    const working = structuredClone(sheet);
    const pending = pendingEffectsForActivation(working);
    if (pending.length === 0) {
      const result = emptyResult();
      result.summary = "No pending effects.";
      result.nextSheet = working;
      return this.finish(result);
    }

    const combined = emptyResult();
    combined.nextSheet = working;
    const activation = working.runtimeMetadata.activationSequence;

    for (const effect of [...pending]) {
      if (isNpcSheet(working) && working.damage.isDead) {
        terminateEffectsOnDeath(working);
        break;
      }
      const live = getOngoingEffects(working).find((entry) => entry.id === effect.id);
      if (!live) {
        continue;
      }
      const tick = live.type === "acid"
        ? this.applyAcidTick(working, live)
        : this.applyFireTick(working, live);
      this.merge(combined, tick);
      if (!tick.success) {
        return this.finish(tick);
      }
      const updated = getOngoingEffects(working).find((entry) => entry.id === effect.id);
      if (updated) {
        updated.lastProcessedActivation = activation;
        updated.applicationsRemaining -= 1;
        updated.nextApplicationActivation = activation + 1;
        if (updated.applicationsRemaining <= 0) {
          setOngoingEffects(
            working,
            getOngoingEffects(working).filter((entry) => entry.id !== updated.id),
          );
        }
      }
      if (isNpcSheet(working) && working.damage.isDead) {
        terminateEffectsOnDeath(working);
        break;
      }
    }

    combined.nextSheet = working;
    combined.summary = combined.summary || "Pending effects applied.";
    return this.finish(combined);
  }

  hasBlockingPendingEffects(sheet: CombatSheet): boolean {
    return hasUnresolvedPendingEffects(sheet);
  }

  private resolveNpcBodyHit(
    sheet: NpcCombatSheet,
    request: DamageRequest,
    location: BodyLocation,
    options?: { skipApply?: boolean },
  ): ResolutionResult {
    const part = requireBodyPart(sheet, location);
    const rule = this.registry.get(request.damageType);
    const raw = request.rawDamage ?? 0;
    const sdp = part.cybernetic && part.cyberneticProperties
      ? remainingCyberneticSdp(part.location, part.cyberneticProperties)
      : undefined;

    let armour: ArmourContext = {
      sp: part.sp,
      isHardSp: part.isHardSp,
      rawDamage: raw,
      effectiveSp: part.sp,
      sdp,
    };
    armour = rule.modifyArmour(armour);
    if (armour.ineffective) {
      const result = emptyResult();
      result.nextSheet = sheet;
      result.damage = {
        rawDamage: raw,
        effectiveSp: armour.effectiveSp,
        penetratedArmor: false,
        finalDamage: 0,
        appliedTo: "bodyPart",
        bodyPart: location,
      };
      result.summary = `HIT — ${this.partName(location)}\n\n${definitionLabel(request.damageType)} is completely ineffective.`;
      return result;
    }

    const penetrated = raw > armour.effectiveSp;
    let throughCtx = {
      rawDamage: raw,
      originalSp: part.sp,
      effectiveSp: armour.effectiveSp,
      isHardSp: part.isHardSp,
      penetrated,
      damageThroughArmor: penetrated ? raw - armour.effectiveSp : 0,
    };
    throughCtx = rule.modifyDamageThroughArmor(throughCtx);
    const actuallyPenetrated = throughCtx.penetrated;
    let through = actuallyPenetrated ? throughCtx.damageThroughArmor : 0;

    const cybernetic = part.cybernetic && Boolean(part.cyberneticProperties);
    let btmApplied: number | undefined;
    let afterBtm = through;
    if (actuallyPenetrated && !cybernetic) {
      afterBtm = through + sheet.damage.btm;
      btmApplied = sheet.damage.btm;
    }

    let finalDamage = actuallyPenetrated
      ? cybernetic
        ? Math.max(0, through)
        : Math.max(1, afterBtm)
      : 0;
    if (actuallyPenetrated && !cybernetic && location === BodyLocation.HEAD) {
      finalDamage = floorDamage(finalDamage * 2);
    }
    finalDamage = rule.modifyFinalDamage({ finalDamage, penetrated: actuallyPenetrated }).finalDamage;

    const hypotheticalFull = finalDamage;
    const applyDamage = request.damageType === "stun" || options?.skipApply
      ? 0
      : request.damageType === "halfAndHalf"
        ? floorDamage(finalDamage / 2)
        : finalDamage;

    const result = emptyResult();
    result.diceRolls = [];

    const stunDamage = request.damageType === "halfAndHalf" || request.damageType === "stun"
      ? hypotheticalFull
      : applyDamage;

    const shouldAutoStun = actuallyPenetrated && !cybernetic;
    if (shouldAutoStun && (request.damageType === "stun" || request.damageType === "halfAndHalf")) {
      this.maybeAutomaticStun(sheet, result, {
        stunDamage,
        penetrated: actuallyPenetrated,
        cybernetic,
        hypotheticalTotal: sheet.damage.totalDamage + hypotheticalFull,
      });
    }

    if (request.damageType !== "stun" && !options?.skipApply) {
      this.applyNpcPartDamage(sheet, part, applyDamage, actuallyPenetrated, cybernetic, result);
    }

    if (shouldAutoStun && request.damageType !== "stun" && request.damageType !== "halfAndHalf") {
      this.maybeAutomaticStun(sheet, result, {
        stunDamage: applyDamage,
        penetrated: actuallyPenetrated,
        cybernetic,
      });
    }

    const outcome: DamageOutcome = {
      rawDamage: raw,
      effectiveSp: armour.effectiveSp,
      penetratedArmor: actuallyPenetrated,
      damageThroughArmor: actuallyPenetrated ? through : 0,
      btm: btmApplied,
      finalDamage: request.damageType === "stun" ? hypotheticalFull : applyDamage,
      armourAblation: actuallyPenetrated && request.damageType !== "stun" ? 1 : 0,
      appliedTo: cybernetic ? "sdp" : "bodyPart",
      bodyPart: location,
    };
    result.damage = outcome;

    if (request.damageType === "shotgunConcussion" && !part.isHardSp) {
      result.reminders.push("DV 10 REF save to avoid being knocked down.");
    }

    if (request.damageType === "api" && actuallyPenetrated && !cybernetic) {
      this.addFireEffect(sheet, {
        source: "api",
        location,
        applications: fireApplicationCount("api"),
      });
      result.pendingEffects = getOngoingEffects(sheet).map((effect) => effect.id);
    }

    if (request.damageType === "stun") {
      result.summary = actuallyPenetrated
        ? this.stunTypeSummary(location, hypotheticalFull, result)
        : `HIT — ${this.partName(location)}\n\nStun damage did not penetrate the armor.`;
    } else if (!actuallyPenetrated) {
      result.summary = `HIT — ${this.partName(location)}\n\n${raw} damage absorbed by SP ${armour.effectiveSp}.`;
    } else if (cybernetic) {
      result.summary = this.cyberSummary(location, raw, armour.effectiveSp, applyDamage, result);
    } else {
      result.summary = this.bioSummary(location, raw, armour.effectiveSp, btmApplied, applyDamage, sheet, result);
    }

    result.nextSheet = sheet;
    this.logger?.debug("[DamageEngine]", {
      target: sheet.id,
      type: request.damageType,
      location,
      raw,
      sp: armour.effectiveSp,
      penetrated: actuallyPenetrated,
      throughArmor: through,
      btm: btmApplied,
      final: applyDamage,
    });
    return result;
  }

  private resolveVehicleHit(sheet: VehicleCombatSheet, request: DamageRequest): ResolutionResult {
    const rule = this.registry.get(request.damageType);
    const raw = request.rawDamage ?? 0;
    let armour: ArmourContext = {
      sp: sheet.sp,
      isHardSp: true,
      rawDamage: raw,
      effectiveSp: sheet.sp,
      sdp: sheet.sdp,
    };
    armour = rule.modifyArmour(armour);
    if (armour.ineffective) {
      const result = emptyResult();
      result.nextSheet = sheet;
      result.damage = { rawDamage: raw, effectiveSp: armour.effectiveSp, penetratedArmor: false, finalDamage: 0, appliedTo: "sdp" };
      result.summary = `${definitionLabel(request.damageType)} is completely ineffective.`;
      return result;
    }
    const penetrated = raw > armour.effectiveSp;
    let throughCtx = {
      rawDamage: raw,
      originalSp: sheet.sp,
      effectiveSp: armour.effectiveSp,
      isHardSp: true,
      penetrated,
      damageThroughArmor: penetrated ? raw - armour.effectiveSp : 0,
    };
    throughCtx = rule.modifyDamageThroughArmor(throughCtx);
    const actuallyPenetrated = throughCtx.penetrated;
    const through = actuallyPenetrated ? Math.max(0, throughCtx.damageThroughArmor) : 0;
    const result = emptyResult();
    if (actuallyPenetrated) {
      sheet.sdp = Math.max(0, sheet.sdp - through);
      sheet.sp = Math.max(0, sheet.sp - 1);
      if (sheet.sdp <= 0) {
        sheet.isDestroyed = true;
        result.events.push(this.event(CombatEvent.VehicleDestroyed, { combatantId: sheet.id }));
      }
    }
    result.damage = {
      rawDamage: raw,
      effectiveSp: armour.effectiveSp,
      penetratedArmor: actuallyPenetrated,
      damageThroughArmor: through,
      finalDamage: through,
      armourAblation: actuallyPenetrated ? 1 : 0,
      appliedTo: "sdp",
    };
    result.summary = actuallyPenetrated
      ? `${raw} damage → ${through} after SP. Applied to SDP.`
      : `${raw} damage absorbed by SP ${armour.effectiveSp}.`;
    if (sheet.isDestroyed) {
      result.summary += " Vehicle is DESTROYED.";
    }
    result.nextSheet = sheet;
    return result;
  }

  private resolveExplosive(sheet: CombatSheet, request: DamageRequest): ResolutionResult {
    const through = Math.max(
      0,
      floorDamage((request.rawDamage ?? 0) - (request.damageReduction ?? 0)),
    );
    const result = emptyResult();
    if (isNpcSheet(sheet)) {
      const penetrated = through > 0;
      const applied = penetrated ? Math.max(1, through + sheet.damage.btm) : 0;
      sheet.damage.totalDamage += applied;
      result.damage = {
        rawDamage: request.rawDamage ?? 0,
        penetratedArmor: penetrated,
        btm: penetrated ? sheet.damage.btm : undefined,
        finalDamage: applied,
        appliedTo: "totalDamage",
      };
      if (applied > 0) {
        this.maybeAutomaticStun(sheet, result, {
          stunDamage: applied,
          penetrated: true,
          cybernetic: false,
        });
      }
      result.summary = penetrated
        ? `HIT — Explosive\n\n${through} after reduction → ${applied} after BTM. Applied to Total Damage.`
        : "HIT — Explosive\n\nDamage reduced to 0.";
    } else if (isVehicleSheet(sheet)) {
      const applied = through;
      sheet.sdp = Math.max(0, sheet.sdp - applied);
      if (sheet.sdp <= 0) {
        sheet.isDestroyed = true;
        result.events.push(this.event(CombatEvent.VehicleDestroyed, { combatantId: sheet.id }));
      }
      result.damage = {
        rawDamage: request.rawDamage ?? 0,
        penetratedArmor: applied > 0,
        finalDamage: applied,
        appliedTo: "sdp",
      };
      result.summary = `HIT — Explosive\n\n${applied} damage applied to SDP.`;
    }
    result.nextSheet = sheet;
    return result;
  }

  private createAcidEffect(sheet: CombatSheet, request: DamageRequest): ResolutionResult {
    const activation = sheet.runtimeMetadata.activationSequence;
    const effect: AcidEffect = {
      id: generateId(),
      type: "acid",
      targetId: sheet.id,
      location: isNpcSheet(sheet) ? request.hitLocation : undefined,
      createdAtActivation: activation,
      nextApplicationActivation: activation + 1,
      applicationsRemaining: 3,
      totalApplications: 3,
    };
    setOngoingEffects(sheet, [...getOngoingEffects(sheet), effect]);
    const result = emptyResult();
    result.pendingEffects = [effect.id];
    result.nextSheet = sheet;
    result.events.push(this.event(CombatEvent.OngoingEffectAdded, { combatantId: sheet.id, effectId: effect.id }));
    result.summary = isNpcSheet(sheet)
      ? `HIT — Acid — ${this.partName(request.hitLocation!)}\n\nAcid will apply on the target's next 3 activations.`
      : "HIT — Acid\n\nAcid will apply on the target's next 3 activations.";
    return result;
  }

  private resolveFireHit(sheet: CombatSheet, request: DamageRequest): ResolutionResult {
    const source = request.fireSource!;
    if (source === "molotov") {
      const result = emptyResult();
      const roll = rollFireDamage(source, 0, this.dice);
      result.diceRolls.push(roll);
      this.applyWholeBodyFire(sheet, source, roll.total, result);
      result.nextSheet = sheet;
      result.summary = result.summary || `HIT — Fire (Molotov)\n\n${roll.notation} = ${roll.total}.`;
      return result;
    }

    const activation = sheet.runtimeMetadata.activationSequence;
    const locations = request.fireLocations ?? (request.hitLocation ? [request.hitLocation] : []);
    const effect: FireEffect = {
      id: generateId(),
      type: "fire",
      targetId: sheet.id,
      source,
      location: locations[0],
      locations: locations.length > 0 ? locations : undefined,
      createdAtActivation: activation,
      nextApplicationActivation: activation + 1,
      applicationsRemaining: fireApplicationCount(source),
      totalApplications: fireApplicationCount(source),
    };
    setOngoingEffects(sheet, [...getOngoingEffects(sheet), effect]);
    const result = emptyResult();
    result.pendingEffects = [effect.id];
    result.nextSheet = sheet;
    result.events.push(this.event(CombatEvent.OngoingEffectAdded, { combatantId: sheet.id, effectId: effect.id }));
    result.summary = `HIT — Fire (${source})\n\nFire will apply on the target's upcoming activations.`;
    return result;
  }

  private resolveTaser(sheet: NpcCombatSheet, request: DamageRequest): ResolutionResult {
    if (!request.hitLocation) {
      return fail(["Missing hit location."]);
    }
    const part = requireBodyPart(sheet, request.hitLocation);
    const result = emptyResult();
    const activation = sheet.runtimeMetadata.activationSequence;
    const history = sheet.runtimeMetadata.taserHitActivations;
    const penalty = consecutiveTaserPenalty(history, activation);
    history.push(activation);

    if (part.cybernetic && part.cyberneticProperties) {
      const roll = this.dice.d10();
      result.diceRolls.push({ notation: "1d10", rolls: [roll], total: roll });
      if (roll === 1 || roll === 2) {
        part.cyberneticProperties.disabled = true;
        result.disabledBodyParts.push(part.location);
        result.events.push(this.event(CombatEvent.BodyPartDisabled, { combatantId: sheet.id, location: part.location }));
      }
      result.summary = `HIT — Taser — ${this.partName(part.location)}\n\nRolled ${roll}.`;
      if (part.cyberneticProperties.disabled) {
        result.summary += ` ${this.partName(part.location)} cybernetic is DISABLED.`;
      }
      result.nextSheet = sheet;
      return result;
    }

    const derived = this.thresholds.derive(
      sheet.damage.totalDamage,
      sheet.damage.baseStunSave,
      sheet.damage.baseDeathSave,
    );
    if (derived.modifiedStunSave === null) {
      return fail(["Stun Save penalty is not defined for this total damage."]);
    }
    const threshold = derived.modifiedStunSave + (request.additionalPenalty ?? 0) + penalty;
    const roll = this.dice.d10();
    const succeeded = resolveSave(roll, threshold).succeeded;
    if (!succeeded) {
      sheet.statuses = setStatus(sheet.statuses, StatusType.STUNNED, true);
    }
    result.diceRolls.push({ notation: "1d10", rolls: [roll], total: roll });
    result.stun = {
      roll,
      threshold,
      succeeded,
      stunned: hasStatus(sheet.statuses, StatusType.STUNNED),
    };
    result.summary = `HIT — Taser — ${this.partName(part.location)}\n\nStun Save: ${roll} vs ${threshold} — ${succeeded ? "succeeded" : "failed"}.`;
    result.nextSheet = sheet;
    return result;
  }

  private applyNpcPartDamage(
    sheet: NpcCombatSheet,
    part: BodyPart,
    damage: number,
    penetrated: boolean,
    cybernetic: boolean,
    result: ResolutionResult,
    options?: { skipAblation?: boolean },
  ): void {
    if (!penetrated) {
      return;
    }

    if (!options?.skipAblation) {
      part.sp = Math.max(0, part.sp - 1);
      result.events.push(this.event(CombatEvent.ArmorAblated, { combatantId: sheet.id, location: part.location, sp: part.sp }));
    }

    if (cybernetic && part.cyberneticProperties) {
      const props = part.cyberneticProperties;
      const remaining = remainingCyberneticSdp(part.location, props);
      const applied = Math.min(Math.max(0, damage), remaining);
      props.sdpDamageTaken += applied;
      const disabledAt = cyberneticDisabledThreshold(part.location, props);
      const destroyedAt = cyberneticDestroyedThreshold(part.location, props);
      if (props.sdpDamageTaken >= disabledAt) {
        props.disabled = true;
        result.disabledBodyParts.push(part.location);
        result.events.push(this.event(CombatEvent.BodyPartDisabled, { combatantId: sheet.id, location: part.location }));
      }
      if (props.sdpDamageTaken >= destroyedAt) {
        part.destroyed = true;
        props.disabled = true;
        result.destroyedBodyParts.push(part.location);
        result.events.push(this.event(CombatEvent.BodyPartDestroyed, { combatantId: sheet.id, location: part.location }));
      }
      return;
    }

    part.damage += damage;
    sheet.damage.totalDamage += damage;
    result.events.push(this.event(CombatEvent.BodyPartDamaged, { combatantId: sheet.id, location: part.location, damage }));
    result.events.push(this.event(CombatEvent.CombatantDamaged, { combatantId: sheet.id, totalDamage: sheet.damage.totalDamage }));

    if (damage >= 8) {
      part.destroyed = true;
      result.destroyedBodyParts.push(part.location);
      const massive = {
        bodyPart: part.location,
        destroyed: true,
        instantDeath: part.location === BodyLocation.HEAD,
      };
      result.massiveDamage = massive;
      result.events.push(this.event(CombatEvent.BodyPartDestroyed, { combatantId: sheet.id, location: part.location }));
      if (part.location === BodyLocation.HEAD) {
        sheet.damage.isDead = true;
        terminateEffectsOnDeath(sheet);
        result.massiveDamage = { ...massive, instantDeath: true };
        result.events.push(this.event(CombatEvent.DeathStateChanged, { combatantId: sheet.id, isDead: true }));
      } else {
        const death = this.rollBaseDeathSave(sheet);
        result.diceRolls.push({ notation: "1d10", rolls: [death.roll], total: death.roll });
        result.death = death;
        result.massiveDamage = { ...massive, deathSave: death };
        if (!death.succeeded) {
          sheet.damage.isDead = true;
          terminateEffectsOnDeath(sheet);
          result.events.push(this.event(CombatEvent.DeathStateChanged, { combatantId: sheet.id, isDead: true }));
        }
      }
    } else if (part.damage >= 12 && !part.destroyed) {
      part.destroyed = true;
      result.destroyedBodyParts.push(part.location);
      result.events.push(this.event(CombatEvent.BodyPartDestroyed, { combatantId: sheet.id, location: part.location }));
      if (part.location === BodyLocation.HEAD) {
        sheet.damage.isDead = true;
        terminateEffectsOnDeath(sheet);
        result.massiveDamage = {
          bodyPart: part.location,
          destroyed: true,
          instantDeath: true,
        };
        result.events.push(this.event(CombatEvent.DeathStateChanged, { combatantId: sheet.id, isDead: true }));
      }
    }
  }

  private maybeAutomaticStun(
    sheet: NpcCombatSheet,
    result: ResolutionResult,
    options: {
      stunDamage: number;
      penetrated: boolean;
      cybernetic: boolean;
      hypotheticalTotal?: number;
    },
  ): void {
    if (sheet.damage.isDead) {
      return;
    }
    if (options.cybernetic) {
      return;
    }
    if (!options.penetrated) {
      return;
    }
    if (sheet.trackers.hasPainEditor) {
      return;
    }
    const total = options.hypotheticalTotal ?? sheet.damage.totalDamage;
    const derived = this.thresholds.derive(
      total,
      sheet.damage.baseStunSave,
      sheet.damage.baseDeathSave,
    );
    if (derived.modifiedStunSave === null) {
      result.warnings.push("Stun Save penalty is not defined for this total damage.");
      return;
    }
    const roll = this.dice.d10();
    const threshold = derived.modifiedStunSave;
    const succeeded = resolveSave(roll, threshold).succeeded;
    if (!succeeded) {
      sheet.statuses = setStatus(sheet.statuses, StatusType.STUNNED, true);
      result.events.push(this.event(CombatEvent.StunStateChanged, { combatantId: sheet.id, stunned: true }));
    }
    result.diceRolls.push({ notation: "1d10", rolls: [roll], total: roll });
    result.stun = {
      roll,
      threshold,
      succeeded,
      stunned: hasStatus(sheet.statuses, StatusType.STUNNED),
    };
  }

  private rollBaseDeathSave(sheet: NpcCombatSheet): DeathOutcome {
    const roll = this.dice.d10();
    const threshold = sheet.damage.baseDeathSave;
    const succeeded = resolveSave(roll, threshold).succeeded;
    return { roll, threshold, succeeded, dead: !succeeded, usedBaseSave: true };
  }

  private applyAcidTick(sheet: CombatSheet, effect: OngoingEffect): ResolutionResult {
    const result = emptyResult();
    const roll = this.dice.roll(6);
    result.diceRolls.push(roll);
    let remaining = roll.total;

    if (isNpcSheet(sheet) && effect.location) {
      const part = requireBodyPart(sheet, effect.location);
      const spLoss = Math.min(remaining, part.sp);
      part.sp = Math.max(0, part.sp - spLoss);
      remaining -= spLoss;
      if (remaining > 0) {
        if (part.cybernetic && part.cyberneticProperties) {
          this.applyNpcPartDamage(sheet, part, remaining, true, true, result, { skipAblation: true });
        } else {
          const afterBtm = remaining + sheet.damage.btm;
          const finalDamage = Math.max(1, afterBtm);
          this.applyNpcPartDamage(sheet, part, finalDamage, true, false, result, { skipAblation: true });
          this.maybeAutomaticStun(sheet, result, {
            stunDamage: finalDamage,
            penetrated: true,
            cybernetic: false,
          });
        }
      }
      result.summary = `Acid — ${this.partName(effect.location)}: ${roll.notation} = ${roll.total}.`;
    } else if (isVehicleSheet(sheet)) {
      const spLoss = Math.min(remaining, sheet.sp);
      sheet.sp = Math.max(0, sheet.sp - spLoss);
      remaining -= spLoss;
      if (remaining > 0) {
        sheet.sdp = Math.max(0, sheet.sdp - remaining);
        if (sheet.sdp <= 0) {
          sheet.isDestroyed = true;
        }
      }
      result.summary = `Acid — Vehicle: ${roll.notation} = ${roll.total}.`;
    }

    result.nextSheet = sheet;
    result.events.push(this.event(CombatEvent.OngoingEffectResolved, { combatantId: sheet.id, effectId: effect.id }));
    return result;
  }

  private applyFireTick(sheet: CombatSheet, effect: FireEffect): ResolutionResult {
    const result = emptyResult();
    const index = effect.totalApplications - effect.applicationsRemaining;
    const count = fireLocationCount(effect.source);

    if (effect.source === "kendachiDragon" && effect.locations && effect.locations.length === 2) {
      const hitLocations: BodyLocation[] = [];
      const locationLines: string[] = [];
      let roll: DiceRollResult;
      if (index === 0) {
        roll = rollFireDamage(effect.source, 0, this.dice);
        result.diceRolls.push(roll);
        for (const location of effect.locations) {
          hitLocations.push(location);
          locationLines.push(this.applySpecificFire(sheet, effect.source, location, roll.total, result));
        }
      } else {
        const pick = this.dice.coin() ? effect.locations[0]! : effect.locations[1]!;
        roll = rollFireDamage(effect.source, 1, this.dice);
        result.diceRolls.push(roll);
        hitLocations.push(pick);
        locationLines.push(this.applySpecificFire(sheet, effect.source, pick, roll.total, result));
      }
      const names = hitLocations.map((location) => this.partName(location)).join(" and ");
      result.summary = [
        "Fire — Kendachi Dragon",
        `${roll.notation} = ${roll.total} on ${names}`,
        ...locationLines.filter((line) => line.length > 0),
        ...this.resolutionSaveLines(result),
      ].join("\n");
      result.nextSheet = sheet;
      return result;
    }

    if (count === 1 && (effect.location || effect.locations?.[0])) {
      const location = effect.location ?? effect.locations![0]!;
      const roll = rollFireDamage(effect.source, index, this.dice);
      result.diceRolls.push(roll);
      this.applySpecificFire(sheet, effect.source, location, roll.total, result);
      result.summary = `Fire — ${this.partName(location)}: ${roll.notation} = ${roll.total}.`;
      result.nextSheet = sheet;
      return result;
    }

    const roll = rollFireDamage(effect.source, index, this.dice);
    result.diceRolls.push(roll);
    this.applyWholeBodyFire(sheet, effect.source, roll.total, result);
    result.nextSheet = sheet;
    return result;
  }

  private applyWholeBodyFire(
    sheet: CombatSheet,
    source: FireSource,
    damage: number,
    result: ResolutionResult,
  ): void {
    if (isVehicleSheet(sheet)) {
      const penetrated = damage > sheet.sp;
      if (!penetrated) {
        result.summary = `HIT — Fire\n\n${damage} absorbed by average/vehicle SP ${sheet.sp}.`;
        return;
      }
      const through = damage - sheet.sp;
      sheet.sdp = Math.max(0, sheet.sdp - through);
      sheet.sp = Math.max(0, sheet.sp - 1);
      if (sheet.sdp <= 0) {
        sheet.isDestroyed = true;
      }
      result.damage = {
        rawDamage: damage,
        effectiveSp: sheet.sp + 1,
        penetratedArmor: true,
        finalDamage: through,
        appliedTo: "sdp",
      };
      result.summary = `HIT — Fire\n\n${damage} damage applied to SDP.`;
      return;
    }

    if (!isNpcSheet(sheet)) {
      return;
    }

    const average = floorDamage(
      sheet.body.reduce((sum, part) => sum + part.sp, 0) / sheet.body.length,
    );
    const penetrated = damage > average;
    if (!penetrated) {
      result.summary = `HIT — Fire\n\n${damage} absorbed by average SP ${average}.`;
      result.damage = {
        rawDamage: damage,
        effectiveSp: average,
        penetratedArmor: false,
        finalDamage: 0,
        appliedTo: "totalDamage",
      };
      return;
    }

    let through = damage - average;
    through += sheet.damage.btm;
    const finalDamage = Math.max(1, through);
    sheet.damage.totalDamage += finalDamage;
    const softAblate = fireSoftAblation(source);
    for (const part of sheet.body) {
      const loss = part.isHardSp ? 1 : softAblate;
      part.sp = Math.max(0, part.sp - loss);
    }
    result.damage = {
      rawDamage: damage,
      effectiveSp: average,
      penetratedArmor: true,
      btm: sheet.damage.btm,
      finalDamage,
      appliedTo: "totalDamage",
    };
    this.maybeAutomaticStun(sheet, result, {
      stunDamage: finalDamage,
      penetrated: true,
      cybernetic: false,
    });
    result.summary = `HIT — Fire\n\n${damage} vs average SP ${average} → ${finalDamage} after BTM. Applied to Total Damage.`;
  }

  private applySpecificFire(
    sheet: CombatSheet,
    source: FireSource,
    location: BodyLocation,
    damage: number,
    result: ResolutionResult,
  ): string {
    if (!isNpcSheet(sheet)) {
      return "";
    }
    const part = requireBodyPart(sheet, location);
    const wornSp = part.sp;
    const ignoredSoft =
      fireRequiresSoftSpThreshold(source) && !part.isHardSp && wornSp < 15;
    let effectiveSp = wornSp;
    if (fireBypassesArmour(source)) {
      effectiveSp = 0;
    } else if (ignoredSoft) {
      effectiveSp = 0;
    }
    const spPhrase =
      ignoredSoft && wornSp > 0 ? `SP ${wornSp} ignored (soft < 15)` : `SP ${effectiveSp}`;
    const penetrated = damage > effectiveSp;
    if (!penetrated) {
      return `${this.partName(location)}: ${damage} absorbed by ${spPhrase}.`;
    }
    const through = damage - effectiveSp;
    const cybernetic = part.cybernetic && Boolean(part.cyberneticProperties);
    const finalDamage = cybernetic ? through : Math.max(1, through + sheet.damage.btm);
    this.applyNpcPartDamage(sheet, part, finalDamage, true, cybernetic, result, {
      skipAblation: fireBypassesArmour(source),
    });
    if (penetrated && !fireBypassesArmour(source)) {
      const extraSoft = fireSoftAblation(source) === 2 && !part.isHardSp ? 1 : 0;
      part.sp = Math.max(0, part.sp - extraSoft);
    }
    if (!cybernetic) {
      this.maybeAutomaticStun(sheet, result, {
        stunDamage: finalDamage,
        penetrated: true,
        cybernetic: false,
      });
    }
    const applied = cybernetic ? `${finalDamage} SDP` : `${finalDamage} after BTM`;
    return `${this.partName(location)}: ${damage} vs ${spPhrase} → ${applied}.`;
  }

  private addFireEffect(
    sheet: CombatSheet,
    options: { source: FireSource; location?: BodyLocation; applications: number },
  ): void {
    const activation = sheet.runtimeMetadata.activationSequence;
    const effect: FireEffect = {
      id: generateId(),
      type: "fire",
      targetId: sheet.id,
      source: options.source,
      location: options.location,
      createdAtActivation: activation,
      nextApplicationActivation: activation + 1,
      applicationsRemaining: options.applications,
      totalApplications: options.applications,
    };
    setOngoingEffects(sheet, [...getOngoingEffects(sheet), effect]);
  }

  private finish(result: ResolutionResult): ResolutionResult {
    if (result.nextSheet) {
      terminateEffectsOnDeath(result.nextSheet);
      syncDerivedStatuses(result.nextSheet);
      if (isNpcSheet(result.nextSheet)) {
        result.woundState = this.thresholds.getWoundState(result.nextSheet.damage.totalDamage);
      }
    }
    return result;
  }

  private merge(target: ResolutionResult, source: ResolutionResult): void {
    target.diceRolls.push(...source.diceRolls);
    target.events.push(...source.events);
    target.disabledBodyParts.push(...source.disabledBodyParts);
    target.destroyedBodyParts.push(...source.destroyedBodyParts);
    target.reminders.push(...source.reminders);
    target.warnings.push(...source.warnings);
    if (source.stun) {
      target.stun = source.stun;
    }
    if (source.death) {
      target.death = source.death;
    }
    if (source.damage) {
      target.damage = source.damage;
    }
    if (source.massiveDamage) {
      target.massiveDamage = source.massiveDamage;
    }
    if (source.summary) {
      target.summary = target.summary ? `${target.summary}\n${source.summary}` : source.summary;
    }
  }

  private event(type: CombatEvent, payload: Record<string, unknown>): ResolutionEvent {
    return { type, payload };
  }

  private resolutionSaveLines(result: ResolutionResult): string[] {
    const lines: string[] = [];
    if (result.stun) {
      lines.push(
        `Stun Save: ${result.stun.roll} vs ${result.stun.threshold} — ${result.stun.succeeded ? "succeeded" : "failed"}.${result.stun.stunned ? " Target is Stunned." : ""}`,
      );
    }
    for (const location of result.disabledBodyParts) {
      lines.push(`${this.partName(location)} cybernetic is DISABLED.`);
    }
    for (const location of result.destroyedBodyParts) {
      lines.push(`${this.partName(location)} cybernetic is DESTROYED.`);
    }
    if (result.massiveDamage?.instantDeath || result.death?.dead) {
      lines.push("Target is DEAD.");
    } else if (result.death) {
      lines.push(
        `Death Save: ${result.death.roll} vs ${result.death.threshold} — ${result.death.succeeded ? "succeeded" : "failed"}.`,
      );
    }
    return lines;
  }

  private partName(location: BodyLocation): string {
    switch (location) {
      case BodyLocation.HEAD:
        return "Head";
      case BodyLocation.TORSO:
        return "Torso";
      case BodyLocation.RIGHT_ARM:
        return "Right Arm";
      case BodyLocation.LEFT_ARM:
        return "Left Arm";
      case BodyLocation.RIGHT_LEG:
        return "Right Leg";
      case BodyLocation.LEFT_LEG:
        return "Left Leg";
      default:
        return location;
    }
  }

  private bioSummary(
    location: BodyLocation,
    raw: number,
    effectiveSp: number,
    btm: number | undefined,
    finalDamage: number,
    sheet: NpcCombatSheet,
    result: ResolutionResult,
  ): string {
    const wound = this.thresholds.getWoundState(sheet.damage.totalDamage);
    const lines = [
      `HIT — ${this.partName(location)}`,
      "",
      `${raw} damage → ${raw - effectiveSp} after SP${btm !== undefined ? ` → ${finalDamage} after BTM` : ""}.`,
      `${this.partName(location)} takes ${finalDamage} damage.`,
      `Target is ${woundLabel(wound)}.`,
    ];
    if (result.stun) {
      lines.push(
        `Stun Save: ${result.stun.roll} vs ${result.stun.threshold} — ${result.stun.succeeded ? "succeeded" : "failed"}.${result.stun.stunned ? " Target is Stunned." : ""}`,
      );
    }
    if (result.massiveDamage) {
      lines.push(`Massive damage: ${this.partName(location)} destroyed.`);
      if (result.massiveDamage.instantDeath) {
        lines.push("Target is DEAD.");
      } else if (result.death) {
        lines.push(
          `Death Save: ${result.death.roll} vs base ${result.death.threshold} — ${result.death.succeeded ? "succeeded" : "failed"}.`,
        );
        if (result.death.dead) {
          lines.push("Target is DEAD.");
        }
      }
    }
    return lines.join("\n");
  }

  private cyberSummary(
    location: BodyLocation,
    raw: number,
    effectiveSp: number,
    applied: number,
    result: ResolutionResult,
  ): string {
    const lines = [
      `HIT — ${this.partName(location)}`,
      "",
      `${raw} damage → ${applied} after SP.`,
      `${applied} damage applied to cybernetic SDP.`,
    ];
    if (result.disabledBodyParts.includes(location)) {
      lines.push(`${this.partName(location)} cybernetic is DISABLED.`);
    }
    if (result.destroyedBodyParts.includes(location)) {
      lines.push(`${this.partName(location)} cybernetic is DESTROYED.`);
    }
    return lines.join("\n");
  }

  private stunTypeSummary(location: BodyLocation, hypothetical: number, result: ResolutionResult): string {
    const lines = [`HIT — ${this.partName(location)}`, "", `Stun damage (hypothetical ${hypothetical}).`];
    if (result.stun) {
      lines.push(
        `Stun Save: ${result.stun.roll} vs ${result.stun.threshold} — ${result.stun.succeeded ? "succeeded" : "failed"}.`,
      );
    }
    return lines.join("\n");
  }
}

function consecutiveTaserPenalty(history: number[], currentActivation: number): number {
  const prior = [currentActivation - 2, currentActivation - 1];
  const hits = prior.filter((activation) => history.includes(activation)).length;
  return -2 * hits;
}

function definitionLabel(type: DamageType): string {
  return DAMAGE_TYPE_LABELS[type];
}

function woundLabel(wound: WoundState): string {
  switch (wound) {
    case WoundState.NONE:
      return "unwounded";
    case WoundState.LIGHT:
      return "Lightly Wounded";
    case WoundState.SERIOUS:
      return "Seriously Wounded";
    case WoundState.CRITICAL:
      return "Critically Wounded";
    case WoundState.MORTAL:
      return "Mortally Wounded";
  }
}

