import { describe, expect, it } from "vitest";
import { remainingEffectApplications } from "../domain/damage/sheetEffects";
import { WoundState, woundStateExpandedLabel } from "../domain/rules/WoundState";
import { lookupDamageRule } from "../domain/rules/RuleTables";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { BodyLocation, createCyberneticProperties } from "../domain/sheets/components";
import { isNpcSheet, isPcSheet } from "../domain/sheets/CombatSheet";
import { StatusType } from "../domain/status/StatusType";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DamageThresholdService } from "../services/DamageThresholdService";
import { ScriptedDiceService } from "../services/DiceService";
import {
  buildExpandedStatusItems,
  expandedBodyPartLines,
  formatDerivedSave,
} from "../ui/cards/expandedCardModel";

function factory(): CombatSheetFactory {
  return new CombatSheetFactory(new ScriptedDiceService());
}

describe("expanded card details", () => {
  it("formats full wound names from death save penalty", () => {
    expect(woundStateExpandedLabel(WoundState.NONE)).toBeNull();
    expect(woundStateExpandedLabel(WoundState.LIGHT)).toBe("Lightly wounded");
    expect(woundStateExpandedLabel(WoundState.SERIOUS)).toBe("Seriously wounded");
    expect(woundStateExpandedLabel(WoundState.CRITICAL)).toBe("Critically wounded");
    expect(woundStateExpandedLabel(WoundState.MORTAL)).toBe("Mortally wounded");
    expect(woundStateExpandedLabel(WoundState.MORTAL, lookupDamageRule(13).deathPenalty)).toBe("Mortal 0");
    expect(woundStateExpandedLabel(WoundState.MORTAL, lookupDamageRule(17).deathPenalty)).toBe("Mortal 1");
    expect(woundStateExpandedLabel(WoundState.MORTAL, lookupDamageRule(21).deathPenalty)).toBe("Mortal 2");
    expect(woundStateExpandedLabel(WoundState.MORTAL, lookupDamageRule(57).deathPenalty)).toBe("Mortal +");
  });

  it("sums remaining fire and acid applications", () => {
    const sheet = factory().createDraft(CombatSheetType.NPC, "Rogue", 10);
    if (!isNpcSheet(sheet)) {
      throw new Error("expected NPC");
    }
    sheet.damage.ongoingEffects.push(
      {
        id: "fire-1",
        type: "fire",
        source: "flamethrower",
        targetId: sheet.id,
        createdAtActivation: 0,
        nextApplicationActivation: 0,
        applicationsRemaining: 3,
        totalApplications: 4,
      },
      {
        id: "fire-2",
        type: "fire",
        source: "incendiaryGrenade",
        targetId: sheet.id,
        createdAtActivation: 0,
        nextApplicationActivation: 1,
        applicationsRemaining: 2,
        totalApplications: 2,
      },
      {
        id: "acid-1",
        type: "acid",
        targetId: sheet.id,
        createdAtActivation: 0,
        nextApplicationActivation: 0,
        applicationsRemaining: 1,
        totalApplications: 3,
      },
    );

    expect(remainingEffectApplications(sheet, "fire")).toBe(5);
    expect(remainingEffectApplications(sheet, "acid")).toBe(1);
  });

  it("lists body parts with SP, damage, cyber, remaining SDP, and EMP shielding", () => {
    const sheet = factory().createDraft(CombatSheetType.NPC, "Rogue", 10);
    if (!isNpcSheet(sheet)) {
      throw new Error("expected NPC");
    }
    const head = sheet.body.find((part) => part.location === BodyLocation.HEAD)!;
    const torso = sheet.body.find((part) => part.location === BodyLocation.TORSO)!;
    const arm = sheet.body.find((part) => part.location === BodyLocation.LEFT_ARM)!;
    head.sp = 12;
    torso.sp = 10;
    torso.damage = 4;
    torso.cybernetic = true;
    torso.cyberneticProperties = {
      ...createCyberneticProperties(),
      sdpDamageTaken: 12,
      empShielding: true,
    };
    arm.cybernetic = true;
    arm.cyberneticProperties = createCyberneticProperties();

    const lines = expandedBodyPartLines(sheet.body).map((line) => line.text);
    expect(lines).toEqual([
      "Head — SP 12",
      "Torso — SP 10, Damage 4, Cyber, SDP 18, EMP shielding",
      "Left Arm — Cyber",
    ]);
  });

  it("shows destroyed and disabled tags with full location names", () => {
    const sheet = factory().createDraft(CombatSheetType.NPC, "Rogue", 10);
    if (!isNpcSheet(sheet)) {
      throw new Error("expected NPC");
    }
    const head = sheet.body.find((part) => part.location === BodyLocation.HEAD)!;
    const arm = sheet.body.find((part) => part.location === BodyLocation.RIGHT_ARM)!;
    head.destroyed = true;
    arm.cybernetic = true;
    arm.cyberneticProperties = { ...createCyberneticProperties(), disabled: true };

    const items = buildExpandedStatusItems(sheet, new DamageThresholdService()).map((item) => item.label);
    expect(items).toContain("Right Arm disabled");
    expect(items).toContain("Head destroyed");

    const lines = expandedBodyPartLines(sheet.body).map((line) => line.text);
    expect(lines).toContain("Head — Destroyed");
    expect(lines).toContain("Right Arm — Cyber, Disabled");
  });

  it("shows full status names with remaining activations", () => {
    const sheet = factory().createDraft(CombatSheetType.PC, "V", 10);
    if (!isPcSheet(sheet)) {
      throw new Error("expected PC");
    }
    sheet.woundState = WoundState.MORTAL;
    sheet.statuses = [
      { type: StatusType.ON_FIRE, status: { type: StatusType.ON_FIRE, active: true } },
      {
        type: StatusType.SANDEVISTAN,
        status: { type: StatusType.SANDEVISTAN, active: true, duration: 4 },
      },
    ];
    sheet.ongoingEffects.push({
      id: "fire-1",
      type: "fire",
      source: "kendachiDragon",
      targetId: sheet.id,
      createdAtActivation: 0,
      nextApplicationActivation: 0,
      applicationsRemaining: 3,
      totalApplications: 5,
    });

    const items = buildExpandedStatusItems(sheet, new DamageThresholdService()).map((item) => item.label);
    expect(items).toEqual(["On Fire · 3 left", "Sandevistan · 4 left", "Mortally wounded"]);
  });

  it("formats null derived saves as a dash", () => {
    expect(formatDerivedSave(null)).toBe("—");
    expect(formatDerivedSave(5)).toBe("5");
  });
});
