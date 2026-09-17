import { describe, expect, it } from "vitest";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { BodyLocation } from "../domain/sheets/components";
import { parseCombatTemplate } from "../infrastructure/parser/CombatSheetParser";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DiceService } from "../services/DiceService";

const FILE = "NPCs/Maelstrom.md";

function parse(markdown: string) {
  return parseCombatTemplate({
    markdown,
    vaultPath: FILE,
    fileName: "Maelstrom.md",
    displayName: "Maelstrom",
  });
}

describe("CombatSheetParser", () => {
  it("parses a valid NPC template", () => {
    const result = parse(`# Maelstrom Ganger
\`\`\`combat-sheet
type: npc
name: Maelstrom Ganger
initiativeModifier: 7
btm: -2
baseStunSave: 8
maximumShots: 30
remainingMagazines: 3
\`\`\``);

    expect(result.success).toBe(true);
    expect(result.template?.sheetType).toBe(CombatSheetType.NPC);
    expect(result.template?.name).toBe("Maelstrom Ganger");
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.btm).toBe(-2);
      expect(result.template.remainingShots).toBe(30);
    }
  });

  it("requires btm and baseStunSave on NPC templates", () => {
    const missingBtm = parse(`\`\`\`combat-sheet
type: npc
name: Test
baseStunSave: 8
\`\`\``);
    expect(missingBtm.success).toBe(false);
    expect(missingBtm.errors.some((e) => e.field === "btm")).toBe(true);

    const missingStun = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
\`\`\``);
    expect(missingStun.success).toBe(false);
    expect(missingStun.errors.some((e) => e.field === "baseStunSave")).toBe(true);
  });

  it("defaults NPC ammo to empty", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Unarmed
btm: 0
baseStunSave: 8
\`\`\``);
    expect(result.success).toBe(true);
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.maximumShots).toBe(0);
      expect(result.template.remainingShots).toBe(0);
      expect(result.template.remainingMagazines).toBe(0);
    }
  });

  it("rejects multiple combat-sheet blocks", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: A
\`\`\`
\`\`\`combat-sheet
type: npc
name: B
\`\`\``);
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 8
initiativeBonus: 3
\`\`\``);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "initiativeBonus")).toBe(true);
  });

  it("rejects runtime-only fields", () => {
    const result = parse(`\`\`\`combat-sheet
type: pc
name: Rogue
initiative: 12
\`\`\``);
    expect(result.success).toBe(false);
  });

  it("rejects invalid booleans", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 8
hasPainEditor: yes
\`\`\``);
    expect(result.success).toBe(false);
  });

  it("rejects body sdp as an unknown field", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 8
body.leftArm.cybernetic: true
body.leftArm.sdp: 20
\`\`\``);
    expect(result.success).toBe(false);
    expect(result.errors.some((error) => error.message.includes("Unknown body field"))).toBe(true);
  });

  it("rejects rams, joints, and myomar on head and torso", () => {
    const head = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 8
body.head.cybernetic: true
body.head.hydraulicRams: true
\`\`\``);
    expect(head.success).toBe(false);
    expect(head.errors.some((error) => error.message.includes("Unknown body field"))).toBe(true);

    const torso = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 8
body.torso.cybernetic: true
body.torso.thickenedMyomar: true
\`\`\``);
    expect(torso.success).toBe(false);
    expect(torso.errors.some((error) => error.message.includes("Unknown body field"))).toBe(true);
  });

  it("parses flat body fields without indentation", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Flat Body
btm: 0
baseStunSave: 8
body.head.sp: 2
body.torso.sp: 4
body.leftArm.cybernetic: true
body.leftArm.hydraulicRams: true
\`\`\``);

    expect(result.success).toBe(true);
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.body[BodyLocation.HEAD].sp).toBe(2);
      expect(result.template.body[BodyLocation.TORSO].sp).toBe(4);
      expect(result.template.body[BodyLocation.LEFT_ARM].cybernetic).toBe(true);
      expect(result.template.body[BodyLocation.LEFT_ARM].hydraulicRams).toBe(true);
    }
  });

  it("parses a cybernetic part without an SDP field", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Chrome
btm: 0
baseStunSave: 8
body.leftArm.cybernetic: true
\`\`\``);
    expect(result.success).toBe(true);
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.body[BodyLocation.LEFT_ARM].cybernetic).toBe(true);
    }
  });

  it("accepts tab-indented nested body fields", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Tab Body
btm: 0
baseStunSave: 8
body:
\thead:
\t\tsp: 2
\`\`\``);

    expect(result.success).toBe(true);
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.body[BodyLocation.HEAD].sp).toBe(2);
    }
  });

  it("rejects baseDeathSave in templates", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 10
baseDeathSave: 10
\`\`\``);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "baseDeathSave")).toBe(true);
  });

  it("sets baseDeathSave from baseStunSave at instantiation", () => {
    const factory = new CombatSheetFactory(new DiceService());
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Saves
btm: 0
baseStunSave: 12
\`\`\``);
    expect(result.success).toBe(true);
    const sheet = factory.instantiateFromTemplate(result.template!);
    if (sheet.sheetType === CombatSheetType.NPC) {
      expect(sheet.damage.baseStunSave).toBe(12);
      expect(sheet.damage.baseDeathSave).toBe(12);
    }
  });

  it("instantiates runtime sheet with rolled initiative", () => {
    const factory = new CombatSheetFactory(new DiceService());
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Ganger
initiativeModifier: 5
btm: 0
baseStunSave: 8
\`\`\``);
    expect(result.success).toBe(true);
    const sheet = factory.instantiateFromTemplate(result.template!);
    expect(sheet.name).toBe("Ganger");
    expect(sheet.initiative.pending).toBeGreaterThanOrEqual(6);
    expect(sheet.initiative.pending).toBeLessThanOrEqual(15);
    expect(sheet.runtimeMetadata.templateId).toBe(FILE);
    if (sheet.sheetType === CombatSheetType.NPC) {
      expect(sheet.body.find((p) => p.location === BodyLocation.HEAD)).toBeDefined();
      expect(sheet.damage.ongoingEffects).toEqual([]);
      expect(sheet.runtimeMetadata.activationSequence).toBe(0);
    }
  });

  it("parses isHardSp on body parts", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Hard Armor
btm: 0
baseStunSave: 8
body.torso.sp: 12
body.torso.isHardSp: true
\`\`\``);
    expect(result.success).toBe(true);
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.body[BodyLocation.TORSO].isHardSp).toBe(true);
    }
  });

  it("rejects acid on body parts", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Test
btm: 0
baseStunSave: 8
body.rightLeg.acid: true
\`\`\``);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "body.rightLeg.acid")).toBe(true);
  });
});
