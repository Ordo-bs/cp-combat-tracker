import type { CombatEncounter } from "../../domain/combat/CombatEncounter";
import { createRuntimeMetadataDefaults } from "../../domain/combat/RuntimeMetadata";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import { WoundState } from "../../domain/rules/WoundState";
import { createEmptyStatusCollection } from "../../domain/status/Status";
import type { CombatSheet } from "../../domain/sheets/CombatSheet";
import {
  createBodyComponent,
  createCyberneticProperties,
  createDamageComponent,
  type BodyPart,
} from "../../domain/sheets/components";
import type { OngoingEffect } from "../../domain/damage/OngoingEffect";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function migrateBodyPart(raw: unknown, index: number, defaults: BodyPart[]): BodyPart {
  const fallback = defaults[index] ?? defaults[0]!;
  const record = asRecord(raw);
  if (!record) {
    return structuredClone(fallback);
  }
  const cybernetic = asBoolean(record.cybernetic, fallback.cybernetic);
  const cyberRaw = asRecord(record.cyberneticProperties);
  return {
    location: fallback.location,
    sp: asNumber(record.sp, fallback.sp),
    damage: asNumber(record.damage, fallback.damage),
    destroyed: asBoolean(record.destroyed, fallback.destroyed),
    acid: asBoolean(record.acid, fallback.acid),
    isHardSp: asBoolean(record.isHardSp, false),
    cybernetic,
    cyberneticProperties: cybernetic
      ? {
          ...createCyberneticProperties(),
          sdp: asNumber(cyberRaw?.sdp, 0),
          sdpDamageTaken: asNumber(cyberRaw?.sdpDamageTaken, 0),
          disabled: asBoolean(cyberRaw?.disabled, false),
          hydraulicRams: asBoolean(cyberRaw?.hydraulicRams, false),
          reinforcedJoints: asBoolean(cyberRaw?.reinforcedJoints, false),
          thickenedMyomar: asBoolean(cyberRaw?.thickenedMyomar, false),
          empShielding: asBoolean(cyberRaw?.empShielding, false),
        }
      : undefined,
  };
}

function migrateOngoingEffects(raw: unknown): OngoingEffect[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((effect): effect is OngoingEffect => {
    const record = asRecord(effect);
    return Boolean(record && typeof record.id === "string" && (record.type === "acid" || record.type === "fire"));
  });
}

function migrateWoundState(value: unknown): WoundState {
  if (typeof value === "string" && Object.values(WoundState).includes(value as WoundState)) {
    return value as WoundState;
  }
  return WoundState.NONE;
}

function migrateSheet(raw: unknown): CombatSheet | null {
  const record = asRecord(raw);
  if (!record || typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }

  const runtime = asRecord(record.runtimeMetadata) ?? {};
  const base = {
    id: record.id,
    name: record.name,
    initiative: record.initiative as CombatSheet["initiative"],
    statuses: Array.isArray(record.statuses) ? record.statuses : createEmptyStatusCollection(),
    runtimeMetadata: {
      instanceId: typeof runtime.instanceId === "string" ? runtime.instanceId : record.id,
      templateId: typeof runtime.templateId === "string" ? runtime.templateId : undefined,
      templateName: typeof runtime.templateName === "string" ? runtime.templateName : undefined,
      createdAt: asNumber(runtime.createdAt, Date.now()),
      activationSequence: asNumber(runtime.activationSequence, createRuntimeMetadataDefaults().activationSequence),
      taserHitActivations: Array.isArray(runtime.taserHitActivations)
        ? runtime.taserHitActivations.filter((value): value is number => typeof value === "number")
        : [],
    },
  };

  const sheetType = record.sheetType as CombatSheetType;
  if (sheetType === CombatSheetType.PC) {
    return {
      ...base,
      sheetType: CombatSheetType.PC,
      woundState: migrateWoundState(record.woundState),
      ongoingEffects: migrateOngoingEffects(record.ongoingEffects),
    };
  }

  if (sheetType === CombatSheetType.VEHICLE) {
    return {
      ...base,
      sheetType: CombatSheetType.VEHICLE,
      sp: asNumber(record.sp, 0),
      sdp: asNumber(record.sdp, 0),
      isDestroyed: asBoolean(record.isDestroyed, false),
      ongoingEffects: migrateOngoingEffects(record.ongoingEffects),
    };
  }

  if (sheetType === CombatSheetType.NPC) {
    const damageRaw = asRecord(record.damage) ?? {};
    const defaults = createBodyComponent();
    const bodyRaw = Array.isArray(record.body) ? record.body : defaults;
    const damageDefaults = createDamageComponent();
    return {
      ...base,
      sheetType: CombatSheetType.NPC,
      ammo: record.ammo as never,
      body: bodyRaw.map((part, index) => migrateBodyPart(part, index, defaults)),
      damage: {
        totalDamage: asNumber(damageRaw.totalDamage, damageDefaults.totalDamage),
        btm: asNumber(damageRaw.btm, damageDefaults.btm),
        baseStunSave: asNumber(damageRaw.baseStunSave, damageDefaults.baseStunSave),
        baseDeathSave: asNumber(damageRaw.baseDeathSave, damageDefaults.baseDeathSave),
        isDead: asBoolean(damageRaw.isDead, false),
        ongoingEffects: migrateOngoingEffects(damageRaw.ongoingEffects),
      },
      trackers: record.trackers as never,
    };
  }

  return null;
}

/** Upgrades persisted encounter payloads to the current CombatSheet shape. */
export function migrateEncounter(raw: unknown): CombatEncounter | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const encounterRaw = asRecord(record.encounter) ?? (Array.isArray(record.participants) ? record : null);
  if (!encounterRaw) {
    return null;
  }
  const participantsRaw = Array.isArray(encounterRaw.participants) ? encounterRaw.participants : [];
  const participants = participantsRaw.map(migrateSheet).filter((sheet): sheet is CombatSheet => sheet !== null);
  return {
    id: typeof encounterRaw.id === "string" ? encounterRaw.id : "encounter",
    participants,
    initiativeQueue: (encounterRaw.initiativeQueue as CombatEncounter["initiativeQueue"]) ?? {
      orderedIds: participants.map((sheet) => sheet.id),
      dirty: false,
    },
    activeCombatantId:
      typeof encounterRaw.activeCombatantId === "string" || encounterRaw.activeCombatantId === null
        ? (encounterRaw.activeCombatantId as string | null)
        : null,
    createdAt: asNumber(encounterRaw.createdAt, Date.now()),
  };
}
