import { describe, expect, it } from "vitest";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import { BodyLocation, createCyberneticProperties } from "../../domain/sheets/components";
import { isNpcSheet, isVehicleSheet, type NpcCombatSheet, type VehicleCombatSheet } from "../../domain/sheets/CombatSheet";
import { StatusType } from "../../domain/status/StatusType";
import { hasStatus } from "../../domain/status/Status";
import { WoundState } from "../../domain/rules/WoundState";
import { CombatSheetFactory } from "../../services/CombatSheetFactory";
import { DamageThresholdService } from "../../services/DamageThresholdService";
import { ScriptedDiceService } from "../../services/DiceService";
import { DamageEngine } from "../../services/damage/DamageEngine";
import { DamageTypeRegistry } from "../../services/damage/DamageTypeRegistry";
import { getVisibleHitFields } from "../../services/damage/hitFields";
import type { DamageRequest } from "../../domain/damage/DamageRequest";
import { lookupDamageRule } from "../../domain/rules/RuleTables";
import { hasUnresolvedPendingEffects } from "../../domain/damage/sheetEffects";

function engine(rolls: number[] = []) {
  const dice = new ScriptedDiceService(rolls);
  return {
    dice,
    engine: new DamageEngine(new DamageTypeRegistry(), dice, new DamageThresholdService()),
  };
}

function npc(overrides?: (sheet: NpcCombatSheet) => void): NpcCombatSheet {
  const sheet = new CombatSheetFactory(new ScriptedDiceService([10])).createDraft(
    CombatSheetType.NPC,
    "Ganger",
    10,
  );
  if (!isNpcSheet(sheet)) {
    throw new Error("expected NPC");
  }
  const torso = sheet.body.find((part) => part.location === BodyLocation.TORSO)!;
  torso.sp = 8;
  sheet.damage.btm = -2;
  overrides?.(sheet);
  return sheet;
}

function vehicle(): VehicleCombatSheet {
  const sheet = new CombatSheetFactory(new ScriptedDiceService([10])).createDraft(
    CombatSheetType.VEHICLE,
    "Car",
    5,
  );
  if (!isVehicleSheet(sheet)) {
    throw new Error("expected vehicle");
  }
  sheet.sp = 10;
  sheet.sdp = 20;
  return sheet;
}

function hit(partial: Partial<DamageRequest> & Pick<DamageRequest, "targetId">): DamageRequest {
  return {
    damageType: "regular",
    rawDamage: 12,
    hitLocation: BodyLocation.TORSO,
    ...partial,
  };
}

describe("RuleTables", () => {
  it("uses death penalty 0 at 13–16 and errors stun above 40", () => {
    expect(lookupDamageRule(13).deathPenalty).toBe(0);
    expect(lookupDamageRule(16).stunPenalty).toBe(-3);
    expect(lookupDamageRule(41).stunPenalty).toBeNull();
    expect(lookupDamageRule(57).deathPenalty).toBeNull();
    expect(lookupDamageRule(13).wound).toBe(WoundState.MORTAL);
  });
});

describe("floorDamage / Regular pipeline", () => {
  it("applies the torso example: 12 vs SP 8, BTM -2 → 2 damage, SP 7", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc();
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id }));
    expect(result.success).toBe(true);
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    const torso = next.body.find((part) => part.location === BodyLocation.TORSO)!;
    expect(result.damage?.finalDamage).toBe(2);
    expect(torso.sp).toBe(7);
    expect(torso.damage).toBe(2);
    expect(next.damage.totalDamage).toBe(2);
  });

  it("absorbs when damage equals SP and does not ablate", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 15;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, rawDamage: 15 }));
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    const torso = next.body.find((part) => part.location === BodyLocation.TORSO)!;
    expect(result.damage?.penetratedArmor).toBe(false);
    expect(result.damage?.finalDamage).toBe(0);
    expect(torso.sp).toBe(15);
    expect(next.damage.totalDamage).toBe(0);
    expect(result.stun).toBeUndefined();
  });

  it("penetrates at SP+1, ablates, and applies minimum 1 after BTM", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc((s) => {
      s.damage.btm = -5;
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 10;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, rawDamage: 11 }));
    expect(result.damage?.penetratedArmor).toBe(true);
    expect(result.damage?.finalDamage).toBe(1);
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(next.body.find((part) => part.location === BodyLocation.TORSO)!.sp).toBe(9);
  });

  it("does not apply BTM on absorbed hits", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      s.damage.btm = -5;
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 15;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, rawDamage: 12 }));
    expect(result.damage?.finalDamage).toBe(0);
    expect(result.damage?.btm).toBeUndefined();
  });

  it("doubles biological head damage after BTM", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc((s) => {
      const head = s.body.find((part) => part.location === BodyLocation.HEAD)!;
      head.sp = 0;
      s.damage.btm = -1;
    });
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, rawDamage: 4, hitLocation: BodyLocation.HEAD }),
    );
    expect(result.damage?.finalDamage).toBe(6);
  });

  it("kills on 8+ head massive damage without a death save", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const head = s.body.find((part) => part.location === BodyLocation.HEAD)!;
      head.sp = 0;
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, rawDamage: 8, hitLocation: BodyLocation.HEAD }),
    );
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(next.damage.isDead).toBe(true);
    expect(result.massiveDamage?.instantDeath).toBe(true);
    expect(result.death).toBeUndefined();
  });

  it("destroys a non-head part at 8 damage and rolls a base death save", () => {
    const { engine: damage } = engine([10]);
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 0;
      s.damage.btm = 0;
      s.damage.baseDeathSave = 6;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, rawDamage: 8 }));
    expect(result.massiveDamage?.destroyed).toBe(true);
    expect(result.death?.usedBaseSave).toBe(true);
    expect(result.death?.succeeded).toBe(false);
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(next.damage.isDead).toBe(true);
  });

  it("destroys a part at 12 cumulative without an extra save", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 0;
      torso.damage = 11;
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, rawDamage: 1 }));
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(next.body.find((part) => part.location === BodyLocation.TORSO)!.destroyed).toBe(true);
    expect(result.massiveDamage).toBeUndefined();
  });
});

describe("damage types", () => {
  it("halves soft SP for edged", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 10;
      torso.isHardSp = false;
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "edged", rawDamage: 10 }));
    expect(result.damage?.effectiveSp).toBe(5);
    expect(result.damage?.penetratedArmor).toBe(true);
  });

  it("keeps hard SP for edged", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 10;
      torso.isHardSp = true;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "edged", rawDamage: 10 }));
    expect(result.damage?.penetratedArmor).toBe(false);
  });

  it("applies AP armour and through-armor halves", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 10;
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "ap", rawDamage: 15 }));
    expect(result.damage?.effectiveSp).toBe(5);
    expect(result.damage?.damageThroughArmor).toBe(5);
    expect(result.damage?.finalDamage).toBe(5);
  });

  it("bypasses SP but not BTM or head ×2", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc((s) => {
      const head = s.body.find((part) => part.location === BodyLocation.HEAD)!;
      head.sp = 20;
      s.damage.btm = -1;
    });
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, damageType: "bypass", rawDamage: 4, hitLocation: BodyLocation.HEAD }),
    );
    expect(result.damage?.finalDamage).toBe(6);
  });

  it("makes Safety ineffective against Hard SP >= 10", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 10;
      torso.isHardSp = true;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "safety", rawDamage: 40 }));
    expect(result.damage?.finalDamage).toBe(0);
    expect(result.summary).toMatch(/ineffective/i);
  });

  it("applies explosive to totalDamage without a body part, including BTM", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc();
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, damageType: "explosive", rawDamage: 10, damageReduction: 3, hitLocation: undefined }),
    );
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(result.damage?.btm).toBe(-2);
    expect(next.damage.totalDamage).toBe(5);
    expect(next.body.find((part) => part.location === BodyLocation.TORSO)!.damage).toBe(0);
  });

  it("uses full half-and-half damage for stun and applies half", () => {
    const { engine: damage } = engine([10]);
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 0;
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, damageType: "halfAndHalf", rawDamage: 9 }),
    );
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(next.damage.totalDamage).toBe(4);
    expect(result.stun?.stunned).toBe(true);
  });

  it("does not mutate damage for stun type", () => {
    const { engine: damage } = engine([10]);
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 0;
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "stun", rawDamage: 8 }));
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(next.damage.totalDamage).toBe(0);
    expect(result.stun).toBeDefined();
  });

  it("says stun damage did not penetrate when absorbed by armor", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 20;
    });
    const result = damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "stun", rawDamage: 8 }));
    expect(result.summary).toMatch(/did not penetrate the armor/i);
    expect(result.summary).not.toMatch(/hypothetical 0/);
    expect(result.stun).toBeUndefined();
  });
});

describe("cybernetics and vehicles", () => {
  it("applies SDP without BTM or totalDamage", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const arm = s.body.find((part) => part.location === BodyLocation.RIGHT_ARM)!;
      arm.sp = 10;
      arm.cybernetic = true;
      arm.cyberneticProperties = {
        sdp: 25,
        sdpDamageTaken: 0,
        disabled: false,
        hydraulicRams: false,
        reinforcedJoints: false,
        thickenedMyomar: false,
        empShielding: false,
      };
      s.damage.btm = -3;
    });
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, rawDamage: 20, hitLocation: BodyLocation.RIGHT_ARM }),
    );
    const next = result.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    const arm = next.body.find((part) => part.location === BodyLocation.RIGHT_ARM)!;
    expect(arm.cyberneticProperties?.sdp).toBe(15);
    expect(next.damage.totalDamage).toBe(0);
    expect(result.stun).toBeUndefined();
  });

  it("disables a cybernetic part at 20 SDP damage and destroys it at 30", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const arm = s.body.find((part) => part.location === BodyLocation.RIGHT_ARM)!;
      arm.sp = 0;
      arm.cybernetic = true;
      arm.cyberneticProperties = createCyberneticProperties();
      s.damage.btm = 0;
    });

    const disabled = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, rawDamage: 20, hitLocation: BodyLocation.RIGHT_ARM }),
    );
    const disabledSheet = disabled.nextSheet;
    if (!disabledSheet || !isNpcSheet(disabledSheet)) {
      throw new Error("expected npc");
    }
    const disabledArm = disabledSheet.body.find((part) => part.location === BodyLocation.RIGHT_ARM)!;
    expect(disabledArm.cyberneticProperties?.sdpDamageTaken).toBe(20);
    expect(disabledArm.cyberneticProperties?.sdp).toBe(10);
    expect(disabledArm.cyberneticProperties?.disabled).toBe(true);
    expect(disabledArm.destroyed).toBe(false);

    const destroyed = damage.resolveHit(
      disabledSheet,
      hit({ targetId: sheet.id, rawDamage: 10, hitLocation: BodyLocation.RIGHT_ARM }),
    );
    const destroyedSheet = destroyed.nextSheet;
    if (!destroyedSheet || !isNpcSheet(destroyedSheet)) {
      throw new Error("expected npc");
    }
    const destroyedArm = destroyedSheet.body.find((part) => part.location === BodyLocation.RIGHT_ARM)!;
    expect(destroyedArm.cyberneticProperties?.sdpDamageTaken).toBe(30);
    expect(destroyedArm.cyberneticProperties?.sdp).toBe(0);
    expect(destroyedArm.destroyed).toBe(true);
  });

  it("does not double cybernetic head damage", () => {
    const { engine: damage } = engine();
    const sheet = npc((s) => {
      const head = s.body.find((part) => part.location === BodyLocation.HEAD)!;
      head.sp = 0;
      head.cybernetic = true;
      head.cyberneticProperties = {
        sdp: 30,
        sdpDamageTaken: 0,
        disabled: false,
        hydraulicRams: false,
        reinforcedJoints: false,
        thickenedMyomar: false,
        empShielding: false,
      };
      s.damage.btm = 0;
    });
    const result = damage.resolveHit(
      sheet,
      hit({ targetId: sheet.id, rawDamage: 4, hitLocation: BodyLocation.HEAD }),
    );
    expect(result.damage?.finalDamage).toBe(4);
  });

  it("rejects stun for vehicles and applies SDP for regular hits", () => {
    const { engine: damage } = engine();
    const sheet = vehicle();
    expect(damage.resolveHit(sheet, hit({ targetId: sheet.id, damageType: "stun" })).success).toBe(false);
    const result = damage.resolveHit(sheet, { targetId: sheet.id, damageType: "regular", rawDamage: 15 });
    const next = result.nextSheet;
    if (!next || !isVehicleSheet(next)) {
      throw new Error("expected vehicle");
    }
    expect(next.sdp).toBe(15);
    expect(next.sp).toBe(9);
  });
});

describe("saves, taser, pain editor", () => {
  it("clears stun on a successful explicit stun action", () => {
    const { engine: damage } = engine([1]);
    const sheet = npc();
    sheet.statuses = [{ type: StatusType.STUNNED, status: { type: StatusType.STUNNED, active: true } }];
    const result = damage.resolveStun(sheet, { targetId: sheet.id });
    const next = result.nextSheet;
    if (!next) {
      throw new Error("missing sheet");
    }
    expect(result.stun?.succeeded).toBe(true);
    expect(hasStatus(next.statuses, StatusType.STUNNED)).toBe(false);
  });

  it("skips automatic stun when Pain Editor is present but still allows explicit stun", () => {
    const { engine: damage } = engine([10]);
    const sheet = npc((s) => {
      s.trackers.hasPainEditor = true;
      const torso = s.body.find((part) => part.location === BodyLocation.TORSO)!;
      torso.sp = 0;
      s.damage.btm = 0;
    });
    const hitResult = damage.resolveHit(sheet, hit({ targetId: sheet.id, rawDamage: 4 }));
    expect(hitResult.stun).toBeUndefined();
    const stunResult = damage.resolveStun(hitResult.nextSheet!, { targetId: sheet.id });
    expect(stunResult.stun).toBeDefined();
  });

  it("applies taser consecutive penalties by target activation", () => {
    const { engine: damage } = engine([1, 1, 1, 1]);
    const sheet = npc((s) => {
      s.runtimeMetadata.activationSequence = 1;
    });
    const first = damage.resolveHit(sheet, {
      targetId: sheet.id,
      damageType: "taserStunN",
      hitLocation: BodyLocation.TORSO,
    });
    const afterFirst = first.nextSheet;
    if (!afterFirst || !isNpcSheet(afterFirst)) {
      throw new Error("expected npc");
    }
    afterFirst.runtimeMetadata.activationSequence = 2;
    const second = damage.resolveHit(afterFirst, {
      targetId: afterFirst.id,
      damageType: "taserStunN",
      hitLocation: BodyLocation.TORSO,
    });
    expect(second.stun?.threshold).toBe(afterFirst.damage.baseStunSave - 2);
  });
});

describe("ongoing effects", () => {
  it("starts acid on the next activation and blocks until applied", () => {
    const { engine: damage } = engine([5]);
    const sheet = npc();
    const created = damage.resolveHit(sheet, {
      targetId: sheet.id,
      damageType: "acid",
      hitLocation: BodyLocation.TORSO,
    });
    const next = created.nextSheet;
    if (!next || !isNpcSheet(next)) {
      throw new Error("expected npc");
    }
    expect(hasUnresolvedPendingEffects(next)).toBe(false);
    next.runtimeMetadata.activationSequence += 1;
    expect(hasUnresolvedPendingEffects(next)).toBe(true);
    const applied = damage.resolvePendingEffects(next);
    expect(applied.success).toBe(true);
    expect(hasUnresolvedPendingEffects(applied.nextSheet!)).toBe(false);
  });
});

describe("hit field metadata", () => {
  it("hides unused fields per damage type", () => {
    const registry = new DamageTypeRegistry();
    expect(getVisibleHitFields(registry.get("regular").definition, { isVehicle: false })).toMatchObject({
      hitLocation: true,
      hitDamage: true,
      fireSource: false,
    });
    expect(getVisibleHitFields(registry.get("explosive").definition, { isVehicle: false })).toMatchObject({
      hitLocation: false,
      damageReduction: true,
    });
    expect(getVisibleHitFields(registry.get("acid").definition, { isVehicle: false })).toMatchObject({
      hitDamage: false,
      hitLocation: true,
    });
    expect(
      getVisibleHitFields(registry.get("fire").definition, { isVehicle: false, fireSource: "molotov" }),
    ).toMatchObject({ fireSource: true, fireLocationCount: 0 });
    expect(
      getVisibleHitFields(registry.get("fire").definition, { isVehicle: false, fireSource: "kendachiDragon" }),
    ).toMatchObject({ fireLocationCount: 2 });
  });
});
