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
hasPainEditor: yes
\`\`\``);
    expect(result.success).toBe(false);
  });

  it("rejects sdp without cybernetic", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Test
body.leftArm.cybernetic: false
body.leftArm.sdp: 20
\`\`\``);
    expect(result.success).toBe(false);
  });

  it("parses flat body fields without indentation", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Flat Body
body.head.sp: 2
body.torso.sp: 4
body.leftArm.cybernetic: true
body.leftArm.sdp: 25
body.leftArm.hydraulicRams: true
\`\`\``);

    expect(result.success).toBe(true);
    if (result.template?.sheetType === CombatSheetType.NPC) {
      expect(result.template.body[BodyLocation.HEAD].sp).toBe(2);
      expect(result.template.body[BodyLocation.TORSO].sp).toBe(4);
      expect(result.template.body[BodyLocation.LEFT_ARM].cybernetic).toBe(true);
      expect(result.template.body[BodyLocation.LEFT_ARM].sdp).toBe(25);
      expect(result.template.body[BodyLocation.LEFT_ARM].hydraulicRams).toBe(true);
    }
  });

  it("accepts tab-indented nested body fields", () => {
    const result = parse(`\`\`\`combat-sheet
type: npc
name: Tab Body
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
body.rightLeg.acid: true
\`\`\``);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field === "body.rightLeg.acid")).toBe(true);
  });
});
